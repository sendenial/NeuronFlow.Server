// src/components/ConnectionModal.js

import React, { useEffect, useState } from 'react';
import { Modal, Button, InputGroup, Form, Card, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { CONNECTOR_CATALOG, CONNECTOR_SCHEMAS } from '../constants/connectorConfig';

export default function ConnectionModal({
  show,
  onHide,
  initialData = null, // { id, name, connectorType, projectId, configJson }
  fixedProjectId = null,
  projects = [],
  requireTest = false,
  onSaved = () => {}
}) {
  const [step, setStep] = useState(initialData ? 2 : 1);
  const [newConnData, setNewConnData] = useState({ name: '', connectorType: null, projectId: fixedProjectId || '' });
  const [configData, setConfigData] = useState({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    if (!show) {
      // Reset state when modal closes
      setStep(initialData ? 2 : 1);
      setIsTesting(false);
      setTestResult(null);
      setNewConnData({ name: '', connectorType: null, projectId: fixedProjectId || '' });
      setConfigData({});
      return;
    }

    if (initialData) {
      // Edit Mode
      setStep(2);
      setNewConnData({
        name: initialData.name || '',
        connectorType: initialData.connectorType,
        projectId: initialData.projectId || fixedProjectId || ''
      });
      try {
        setConfigData(initialData.configJson ? JSON.parse(initialData.configJson) : {});
      } catch (e) {
        setConfigData({});
      }
    } else {
      // Create Mode
      setStep(1);
      setNewConnData({ name: '', connectorType: null, projectId: fixedProjectId || '' });
      setConfigData({});
    }
  }, [show, initialData, fixedProjectId]);

  // --- 2. HANDLERS ---
  const handleAppSelect = (typeId) => {
    const schema = CONNECTOR_SCHEMAS[typeId] || [];
    const defaults = {};
    schema.forEach(f => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    });
    setNewConnData({ ...newConnData, connectorType: typeId });
    setConfigData(defaults);
    setStep(2);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const payload = {
        ...newConnData,
        connectorType: parseInt(newConnData.connectorType),
        configJson: JSON.stringify(configData)
      };
      const res = await api.post('/connections/test', payload);
      setTestResult({ success: true, message: res.data?.message || 'Connection OK' });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Connection failed. Check your credentials.';
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: newConnData.name,
        connectorType: parseInt(newConnData.connectorType),
        projectId: newConnData.projectId || fixedProjectId || null,
        configJson: JSON.stringify(configData)
      };

      if (initialData && (initialData.id || initialData.connectorId)) {
        const connId = initialData.id || initialData.connectorId;
        await api.put(`/connections/${connId}`, payload);
      } else {
        await api.post('/connections', payload);
      }

      onSaved();
      onHide();
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.message || e.message));
    }
  };

  // --- 3. RENDERERS ---

  const renderAppCatalog = () => {
    const filtered = CONNECTOR_CATALOG;
    return (
      <div className="p-3">
        <InputGroup className="mb-4">
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control placeholder="Search apps..." autoFocus />
        </InputGroup>
        <div className="row g-3">
          {filtered.map(app => (
            <div className="col-4" key={app.id}>
              <Card className="h-100 shadow-sm border-0 text-center p-3 app-card" onClick={() => handleAppSelect(app.id)} style={{ cursor: 'pointer' }}>
                <div className="mx-auto mb-2" style={{ fontSize: '2rem', background: app.color, width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {app.icon}
                </div>
                <div className="fw-bold small">{app.name}</div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConfig = () => {
    const schema = CONNECTOR_SCHEMAS[newConnData.connectorType] || [];
    const app = CONNECTOR_CATALOG.find(c => c.id === newConnData.connectorType) || {};

    return (
      <div className="p-3">
        {/* Header */}
        <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
          {step === 2 && !initialData && (
            <Button variant="link" className="p-0 me-3 text-decoration-none fs-5" onClick={() => setStep(1)}>←</Button>
          )}
          <div>
            <h5 className="m-0 fw-bold">{initialData ? 'Edit Connection' : `Connect to ${app.name}`}</h5>
            <small className="text-muted">Configure your connection details below.</small>
          </div>
        </div>

        {/* Standard Name */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-bold small">Connection name <span className="text-danger">*</span></Form.Label>
          <Form.Control 
            value={newConnData.name} 
            onChange={e => setNewConnData({ ...newConnData, name: e.target.value })} 
            placeholder={`My ${app.name} account`} 
          />
        </Form.Group>

        {/* Standard Location (Project) - Show if not fixed */}
        {!fixedProjectId && (
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold small">Location <span className="text-danger">*</span></Form.Label>
            <Form.Select value={newConnData.projectId} onChange={e => setNewConnData({ ...newConnData, projectId: e.target.value })}>
              <option value="">Choose project or folder</option>
              {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}
            </Form.Select>
          </Form.Group>
        )}

        {/* DYNAMIC CONFIG FIELDS */}
        {schema.map(f => {
            // --- DEPENDENCY LOGIC ---
            if (f.dependency) {
                // 1. Check parent value in current config
                let parentValue = configData[f.dependency.field];
                
                // 2. If parent value isn't set yet, look up its default
                if (parentValue === undefined) {
                    const parentField = schema.find(s => s.key === f.dependency.field);
                    parentValue = parentField ? parentField.defaultValue : null;
                }

                // 3. If values mismatch, HIDE this field (return null)
                if (parentValue !== f.dependency.value) {
                    return null; 
                }
            }
            // ------------------------

            return (
              <Form.Group className="mb-4" key={f.key}>
                <Form.Label className="fw-bold small">
                    {f.label}{f.required && <span className="text-danger"> *</span>}
                </Form.Label>
                
                {f.type === 'select' ? (
                  <Form.Select 
                    value={configData[f.key] || f.defaultValue || ''} 
                    onChange={e => setConfigData({ ...configData, [f.key]: e.target.value })}
                  >
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </Form.Select>
                ) : f.type === 'textarea' ? (
                   <Form.Control 
                     as="textarea" 
                     rows={3}
                     value={configData[f.key] || ''} 
                     onChange={e => setConfigData({ ...configData, [f.key]: e.target.value })} 
                   />
                ) : (
                  <Form.Control 
                    value={configData[f.key] || f.defaultValue || ''} 
                    onChange={e => setConfigData({ ...configData, [f.key]: e.target.value })} 
                    type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'} 
                    placeholder={f.placeholder || ''} 
                  />
                )}
                
                {f.helpText && <Form.Text className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '5px' }}>{f.helpText}</Form.Text>}
              </Form.Group>
            );
        })}

        {/* Test Result Alert */}
        {testResult && (
          <div className={`p-3 rounded ${testResult.success ? 'border border-success bg-light' : 'border border-danger bg-light'}`}> 
            <strong>{testResult.success ? 'Success' : 'Error'}:</strong> {testResult.message}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{initialData ? 'Edit Connection' : (step === 1 ? 'New Connection' : 'Configure')}</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ minHeight: '320px' }}>
        {step === 1 ? renderAppCatalog() : renderConfig()}
      </Modal.Body>

      {step === 2 && (
        <Modal.Footer className="justify-content-between">
          <Button variant="secondary" onClick={() => { if (!initialData) setStep(1); }} disabled={isTesting}>Back</Button>

          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={handleTestConnection} disabled={isTesting}>
              {isTesting ? <Spinner size="sm" animation="border" /> : 'Test Connection'}
            </Button>
            <Button variant="success" onClick={handleSave} disabled={isTesting || (requireTest && !testResult?.success)}>
              {initialData ? 'Save Changes' : 'Connect'}
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
}