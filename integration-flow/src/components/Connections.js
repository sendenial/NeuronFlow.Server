import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button, Form, InputGroup, Dropdown, Card, Badge, Spinner } from 'react-bootstrap';
import ConnectionModal from './ConnectionModal';
import { CONNECTOR_CATALOG, CONNECTOR_SCHEMAS } from '../constants/connectorConfig';

export default function Connections() {
  const navigate = useNavigate();

  // Data State
  const [connections, setConnections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assetSearch, setAssetSearch] = useState('');

  // Wizard/Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null); // used when editing

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
    setModalInitialData({ id: c.connectorId, name: c.name, connectorType: c.connectorType, projectId: c.projectId, configJson: c.configJson });
    setShowModal(true);
  };


  return (
    <div className="d-flex flex-column h-100 bg-light">

      {/* Header */}
      <div className="bg-white border-bottom px-4 pt-4 pb-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fw-bold text-dark m-0">Assets</h3>
          <Button variant="primary" style={{ backgroundColor: '#00796b', border: 'none' }} onClick={() => { setModalInitialData(null); setShowModal(true); }}>
            Create connection
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

                <div onClick={(e) => e.stopPropagation()}>
                  <Dropdown align="end" className="asset-actions-dropdown" drop="down">
                    <Dropdown.Toggle as="button" className="btn btn-sm btn-light asset-actions-toggle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, borderRadius: 8 }}>
                      <span className="text-muted">⋯</span>
                    </Dropdown.Toggle>

                    <Dropdown.Menu popperConfig={{ strategy: 'fixed', placement: 'bottom-end', modifiers: [{ name: 'flip', enabled: false }, { name: 'preventOverflow', options: { padding: 8 } }, { name: 'offset', options: { offset: [0, 4] } }] }} className="shadow border-0 p-2 asset-actions-menu" style={{ minWidth: '220px' }}>
                      <div className="px-3 py-2 small text-muted">Actions</div>

                      <Dropdown.Item onClick={() => handleEdit(c)} className="d-flex align-items-start py-2 px-3">
                        <div className="me-3 fs-5">✎</div>
                        <div>
                          <div className="fw-bold">Rename / Settings</div>
                          <div className="small text-muted">Update connection name and settings</div>
                        </div>
                      </Dropdown.Item>

                      <Dropdown.Divider />

                      <Dropdown.Item onClick={() => handleDelete(c.connectorId)} className="d-flex align-items-center py-2 px-3 text-danger">
                        <div className="me-3 fs-5">🗑️</div>
                        <div className="fw-bold">Delete</div>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>

              </div>
            );
          })}

          {filteredConnections.length === 0 && (
                <div className="text-center py-5 text-muted bg-white border rounded">
                    <h5>No Connections found</h5>
                    <p>Try clearing your search or create a new asset.</p>
                </div>
            )}

        </div>
      </div>

      <ConnectionModal
        show={showModal}
        onHide={() => { setShowModal(false); setModalInitialData(null); }}
        projects={projects}
        initialData={modalInitialData}
        requireTest={true}
        onSaved={() => { setShowModal(false); setModalInitialData(null); fetchData(); }}
      />

      {/* Hover Styles */}
      <style>{`
        .app-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15)!important; }
        .dropdown-toggle::after { display: none !important; }
        .dropdown-item:hover { background-color: #f8f9fa; border-radius: 4px; color: black; }

        /* Asset action dropdown styles */
        .asset-card { overflow: visible; }
        .asset-actions-toggle { border: 1px solid rgba(0,0,0,0.06); box-shadow: none; position: relative; z-index: 2; }
        .asset-actions-toggle:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(22,28,45,0.06); }

        .asset-actions-menu { border-radius: 10px; overflow: visible; z-index: 3000 !important; }
        .asset-actions-menu .dropdown-item { padding-top: 10px; padding-bottom: 10px; }
        .asset-actions-menu .dropdown-item .fw-bold { line-height: 1; }
        .asset-actions-menu .dropdown-item .small { margin-top: 2px; color: #6c757d; }

        .asset-actions-menu .dropdown-divider { margin: 6px 0; }
      `}</style>
    </div>
  );
}