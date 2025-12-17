import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button, Form, InputGroup, Dropdown, Modal, Card, Badge, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { CONNECTOR_CATALOG, CONNECTOR_SCHEMAS } from '../constants/connectorConfig';

export default function Connections() {
  const navigate = useNavigate();

  const [isTesting, setIsTesting] = useState(false); // <--- NEW STATE
  const [testResult, setTestResult] = useState(null); // { success: true/false, message: '' }

  // Data State
  const [connections, setConnections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assetSearch, setAssetSearch] = useState('');

  // Wizard/Modal State
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState(''); // App Catalog Search

  // Form State
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newConnData, setNewConnData] = useState({ name: '', connectorType: null, projectId: '' });
  const [configData, setConfigData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [connRes, projRes] = await Promise.all([
        api.get('/connections'),
        api.get('/projects')
      ]);
      setConnections(connRes.data);
      setProjects(projRes.data);
    } catch (err) { console.error(err); }
  };

  const filteredConnections = connections.filter(c =>
    c.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  // --- ACTIONS ---

  // 1. Delete Action
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await api.delete(`/connections/${id}`);
        fetchData(); // Refresh list
      } catch (err) {
        alert('Failed to delete connection');
      }
    }
  };

  // 2. Edit Action (Opens Modal pre-filled)
  const handleEdit = (c) => {
    setIsEdit(true);
    setEditId(c.connectorId);

    // Populate form with existing data
    setNewConnData({
      name: c.name,
      connectorType: c.connectorType,
      projectId: c.projectId
    });

    // Parse existing JSON config
    try {
      setConfigData(JSON.parse(c.configJson || '{}'));
    } catch (e) {
      setConfigData({});
    }

    setStep(2); // Skip app selection, go straight to config
    setShowModal(true);
  };

// --- SUBMIT (Enforce Test Before Create) ---
  const handleSubmit = async () => {
    setIsTesting(true); // Reuse the testing spinner
    setTestResult(null); // Clear previous messages

    try {
      // 1. Prepare Data
      const payload = {
        ...newConnData,
        connectorType: parseInt(newConnData.connectorType),
        configJson: JSON.stringify(configData)
      };

      // ---------------------------------------------------------
      // 2. MANDATORY TEST STEP
      // ---------------------------------------------------------
      try {
        await api.post('/connections/test', payload);
      } catch (testError) {
        // If Test Fails -> STOP. Do not Create.
        const msg = testError.response?.data?.message || 'Connection test failed.';
        setTestResult({ success: false, message: `Cannot create: ${msg}` });
        setIsTesting(false); 
        return; // <--- This prevents creation
      }

      // ---------------------------------------------------------
      // 3. CREATE / UPDATE (Only if test passed)
      // ---------------------------------------------------------
      if (isEdit) {
        await api.put(`/connections/${editId}`, payload);
      } else {
        await api.post('/connections', payload);
      }

      // 4. Success Actions
      setShowModal(false);
      resetWizard();
      fetchData();
      
    } catch (err) { 
        alert('Save operation failed: ' + (err.response?.data?.message || err.message)); 
    } finally {
        setIsTesting(false);
    }
  };

  const resetWizard = () => {
    setIsEdit(false);
    setEditId(null);
    setStep(1);
    setNewConnData({ name: '', connectorType: null, projectId: '' });
    setConfigData({});
    setSearchTerm('');
  };

  const handleAppSelect = (typeId) => {
    setNewConnData({ ...newConnData, connectorType: typeId });
    setConfigData({});
    setStep(2);
  };

  // --- NEW: TEST CONNECTION FUNCTION ---
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = {
        ...newConnData,
        connectorType: parseInt(newConnData.connectorType),
        configJson: JSON.stringify(configData)
      };

      // Call the new Test endpoint
      const res = await api.post('/connections/test', payload);
      
      setTestResult({ success: true, message: res.data.message });
    } catch (err) {
      const msg = err.response?.data || 'Connection failed. Check your credentials.';
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  // --- RENDERERS ---

  const renderAppCatalog = () => {
    const filtered = CONNECTOR_CATALOG.filter(app => app.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
      <div className="p-3">
        <InputGroup className="mb-4">
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control placeholder="Search apps..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
        </InputGroup>
        <div className="row g-3">
          {filtered.map(app => (
            <div className="col-4" key={app.id}>
              <Card
                className={`h-100 shadow-sm border-0 text-center p-3 app-card ${app.disabled ? 'opacity-50' : ''}`}
                style={{ cursor: app.disabled ? 'default' : 'pointer' }}
                onClick={() => !app.disabled && handleAppSelect(app.id)}
              >
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
        <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
             {!isEdit && (
                <Button variant="link" className="p-0 me-3 text-decoration-none fs-5" onClick={() => setStep(1)}>←</Button>
             )}
             <div>
                <h5 className="m-0 fw-bold">{isEdit ? 'Edit Connection' : `Connect to ${app.name}`}</h5>
                <small className="text-muted">Configure your connection details below.</small>
             </div>
        </div>

        {/* Standard Name Field */}
        <Form.Group className="mb-4">
            <Form.Label className="fw-bold small">Connection name <span className="text-danger">*</span></Form.Label>
            <Form.Control 
                value={newConnData.name} 
                onChange={e => setNewConnData({...newConnData, name: e.target.value})} 
                placeholder={`My ${app.name} account`}
            />
        </Form.Group>

        {/* Standard Project Field */}
        <Form.Group className="mb-4">
            <Form.Label className="fw-bold small">Location <span className="text-danger">*</span></Form.Label>
            <Form.Select value={newConnData.projectId} onChange={e => setNewConnData({...newConnData, projectId: e.target.value})}>
                <option value="">Choose project or folder</option>
                {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}
            </Form.Select>
        </Form.Group>

        {/* Dynamic Fields from Schema */}
        {schema.map(f => (
            <Form.Group className="mb-4" key={f.key}>
                <Form.Label className="fw-bold small">
                    {f.label} {f.required && <span className="text-danger">*</span>}
                </Form.Label>
                
                {f.type === 'select' ? (
                     <Form.Select 
                        value={configData[f.key] || f.defaultValue || ''} 
                        onChange={e => setConfigData({...configData, [f.key]: e.target.value})}
                     >
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                     </Form.Select>
                ) : (
                    <Form.Control 
                        value={configData[f.key] || f.defaultValue || ''} 
                        onChange={e => setConfigData({...configData, [f.key]: e.target.value})} 
                        type={f.type}
                        placeholder={f.placeholder || ''}
                    />
                )}
                
                {/* Render Helper Text if it exists */}
                {f.helpText && (
                    <Form.Text className="text-muted" style={{fontSize: '0.75rem', display: 'block', marginTop: '5px'}}>
                        {f.helpText}
                    </Form.Text>
                )}
            </Form.Group>
        ))}
      </div>
    );
  };

  return (
    <div className="d-flex flex-column h-100 bg-light">

      {/* Header */}
      <div className="bg-white border-bottom px-4 pt-4 pb-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fw-bold text-dark m-0">Assets</h3>
          <Button variant="primary" style={{ backgroundColor: '#00796b', border: 'none' }} onClick={() => { resetWizard(); setShowModal(true); }}>
            Create ▼
          </Button>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <div style={{ width: '300px' }}>
            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0">🔍</InputGroup.Text>
              <Form.Control placeholder="Search assets" className="border-start-0 ps-0" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
            </InputGroup>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-4">
        <div className="mb-2 text-muted small">Showing {filteredConnections.length} connections</div>
        <div className="d-flex flex-column gap-3">
          {filteredConnections.map(c => {
            const meta = CONNECTOR_CATALOG.find(cat => cat.id === c.connectorType) || {};
            const isConnected = c.configJson && c.configJson.length > 2;

            return (
              <div key={c.connectorId} className="asset-card type-connection d-flex align-items-center p-3 border rounded shadow-sm">
                <div className="me-3 p-2 rounded d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px', background: '#fce4ec', color: '#c2185b', fontSize: '1.5rem' }}>
                  {meta.icon || '🔌'}
                </div>

                <div className="flex-grow-1">
                  <div className="fw-bold text-dark">{c.name}</div>
                  <div className="text-muted small d-flex align-items-center">
                    <span className="me-1">📂</span> {c.projectName ? c.projectName : 'Unassigned'}
                  </div>
                </div>

                <div className="d-flex align-items-center text-muted small gap-5 me-3">

                  <div style={{ minWidth: '150px' }}> {/* Increased width slightly for longer names */}
                    {isConnected
                      ? <Badge bg="success" className="bg-opacity-25 text-success border border-success px-2 py-1">Connected</Badge>
                      : <Badge bg="light" className="text-secondary border px-2 py-1">Disconnected</Badge>
                    }
                    <div className="mt-1" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                      {/* LOGIC: Show Modified info if available, otherwise fall back to Created info */}
                      Last updated by <strong>{c.createdByName || 'Unknown'}</strong>
                      <br /> on {new Date(c.modifiedDate || c.createdDate).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Recipe Count */}
                  <div style={{ minWidth: '80px' }}>0 Recipes</div>

                  {/* Tags */}
                  <div className="d-flex align-items-center gap-1" style={{ cursor: 'pointer' }}>
                    <span style={{ transform: 'rotate(45deg)' }}>🏷️</span> Apply tags
                  </div>

                </div>

                {/* --- ACTION DROPDOWN --- */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Dropdown align="end">
                    <Dropdown.Toggle as="div" className="text-muted fs-4 px-2" style={{ cursor: 'pointer', lineHeight: '0.5' }}>
                      ...
                    </Dropdown.Toggle>

                    <Dropdown.Menu popperConfig={{ strategy: "fixed" }} className="shadow border-0 p-2" style={{ minWidth: '180px' }}>
                      <Dropdown.Item onClick={() => handleEdit(c)} className="d-flex align-items-center py-2 px-3 text-secondary">
                        <span className="me-3">✎</span> Rename / Config
                      </Dropdown.Item>
                      <Dropdown.Item className="d-flex align-items-center py-2 px-3 text-secondary">
                        <span className="me-3">🏷️</span> Apply tags
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={() => handleDelete(c.connectorId)} className="d-flex align-items-center py-2 px-3 text-danger">
                        <span className="me-3">🗑️</span> Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>{step === 1 ? 'New Connection' : (isEdit ? 'Edit Connection' : 'Configure')}</Modal.Title></Modal.Header>
        <Modal.Body style={{ minHeight: '400px' }}>
          {step === 1 ? renderAppCatalog() : renderConfig()}
        </Modal.Body>
        {step === 2 && (
            <Modal.Footer className="justify-content-between">
                {/* Left Side: Back Button */}
                <Button variant="secondary" onClick={() => !isEdit && setStep(1)} disabled={isTesting}>
                    Back
                </Button>

                {/* Right Side: Action Buttons */}
                <div className="d-flex gap-2">
                    {/* --- NEW TEST BUTTON --- */}
                    <Button 
                        variant="outline-primary" 
                        onClick={handleTestConnection} 
                        disabled={isTesting}
                    >
                        {isTesting ? <Spinner size="sm" animation="border" /> : 'Test Connection'}
                    </Button>

                    <Button variant="success" onClick={handleSubmit} disabled={isTesting}>
                        {isEdit ? 'Save Changes' : 'Connect'}
                    </Button>
                </div>
            </Modal.Footer>
        )}
      </Modal>

      {/* Hover Styles */}
      <style>{`
        .app-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15)!important; }
        .dropdown-toggle::after { display: none !important; }
        .dropdown-item:hover { background-color: #f8f9fa; color: #000; border-radius: 4px; }
      `}</style>
    </div>
  );
}