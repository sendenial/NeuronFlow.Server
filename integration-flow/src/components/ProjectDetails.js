import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button, Form, InputGroup, Spinner, Nav, Badge, Dropdown, Card } from 'react-bootstrap';
import { CONNECTOR_CATALOG } from '../constants/connectorConfig';
import ConnectionModal from './ConnectionModal';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Data State
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('assets');

  const [showConnModal, setShowConnModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Project Details
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);

      // 2. Fetch Connections for this Project
      const connRes = await api.get(`/connections?projectId=${projectId}`);

      // 3. Transform Connections to "Asset" objects
      const connectionAssets = connRes.data.map(c => {
        const meta = CONNECTOR_CATALOG.find(cat => cat.id === c.connectorType) || {};
        return {
          id: c.connectorId,
          type: 'connection', // Distinguishes this from recipes
          title: c.name,
          subtitle: meta.name || 'Unknown App',
          icon: meta.icon || '🔌',
          status: (c.configJson && c.configJson.length > 2) ? 'Connected' : 'Disconnected',
          updated: c.modifiedDate || c.createdDate,
          author: c.modifiedByName || c.createdByName || 'System',
          data: c // Keep original data for editing
        };
      });

      // 4. (Mock) Recipes - Replace this with API call later
      // const recipeAssets = [
      //     { 
      //         id: 'r1', 
      //         type: 'recipe', 
      //         title: 'Sync Salesforce Leads', 
      //         subtitle: 'Trigger: New Record', 
      //         icon: '⚡', 
      //         status: 'Stopped', 
      //         updated: new Date().toISOString(), 
      //         author: 'Sid' 
      //     },
      //     { 
      //         id: 'r2', 
      //         type: 'recipe', 
      //         title: 'Daily Report to Slack', 
      //         subtitle: 'Trigger: Schedule', 
      //         icon: '⏰', 
      //         status: 'Never active', 
      //         updated: new Date().toISOString(), 
      //         author: 'Sid' 
      //     }
      // ];

      // 5. Merge & Sort (Newest first)
      const allAssets = [...connectionAssets].sort((a, b) => new Date(b.updated) - new Date(a.updated));
      setAssets(allAssets);

    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleDelete = async (asset) => {
    if (asset.type !== 'connection') {
      alert('Recipe deletion not implemented yet');
      return;
    }
    if (window.confirm(`Delete connection "${asset.title}"?`)) {
      try {
        await api.delete(`/connections/${asset.id}`);
        loadProjectData();
      } catch (err) {
        alert('Failed to delete asset');
        if (err.response && err.response.status === 401) {
          navigate('/login');
        }
      }
    }
  };

  const handleEdit = (asset) => {
    if (asset.type !== 'connection') return;
    setEditingAsset(asset);
    setShowConnModal(true);
  };





  // --- FILTERING ---
  const filteredAssets = assets.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );



  if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;
  if (!project) return <div className="p-5 text-center">Project not found</div>;

  return (
    <div className="d-flex flex-column h-100 bg-light">

      {/* HEADER */}
      <div className="bg-white border-bottom px-4 pt-4 pb-0">
        <div className="mb-2 text-muted small">
          <Link to="/dashboard/projects" className="text-decoration-none text-muted">Projects</Link>
          <span className="mx-2">›</span>
          {project.projectName}
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center">
            <div className="project-icon-circle me-3" style={{ width: '40px', height: '40px', fontSize: '1.2rem', backgroundColor: '#546e7a' }}>
              {project.projectName.charAt(0).toUpperCase()}
            </div>
            <h3 className="mb-0 fw-bold">{project.projectName}</h3>
          </div>

          <Dropdown>
            <Dropdown.Toggle variant="primary" style={{ backgroundColor: '#00796b', border: 'none' }} className="fw-bold px-4">
              Create
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" className="shadow border-0 mt-2">
              <Dropdown.Header className="text-uppercase small fw-bold">Create New</Dropdown.Header>
              <Dropdown.Item onClick={() => navigate('/dashboard/recipe/new')} className="py-2"><span className="me-2">📜</span> Recipe</Dropdown.Item>
              <Dropdown.Item onClick={() => { setEditingAsset(null); setShowConnModal(true); }} className="py-2"><span className="me-2">⚡</span> Connection</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <Nav variant="tabs" className="border-bottom-0 mt-4">
          <Nav.Item>
            <Nav.Link active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} className={`px-4 fw-bold ${activeTab === 'assets' ? 'text-primary border-bottom border-primary border-3 bg-white' : 'text-muted'}`}>
              Assets <Badge bg="light" text="dark" className="ms-1 border">{assets.length}</Badge>
            </Nav.Link>
          </Nav.Item>
          {/* <Nav.Item><Nav.Link onClick={() => setActiveTab('settings')} className="text-muted px-4">Settings</Nav.Link></Nav.Item> */}
        </Nav>
      </div>

      {/* LIST CONTENT */}
      <div className="p-4 flex-grow-1">

        {/* Filter Bar */}
        <div className="d-flex mb-4">
          <InputGroup style={{ maxWidth: '350px' }}>
            <InputGroup.Text className="bg-white border-end-0">🔍</InputGroup.Text>
            <Form.Control placeholder="Search assets..." className="border-start-0 ps-0" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </InputGroup>
          {/* <div className="ms-3 d-flex gap-2">
                <Button variant="outline-secondary" className="bg-white border text-muted">All assets ▼</Button>
                <Button variant="outline-secondary" className="bg-white border text-muted">App ▼</Button>
            </div>
             <div className="ms-auto text-muted small align-self-center">
                Sort by: <span className="fw-bold text-dark">Latest activity ▼</span>
            </div> */}
        </div>

        {/* ASSET CARDS */}
        <div className="d-flex flex-column gap-3">
          {filteredAssets.map(asset => (
            <div key={asset.id} className={`asset-card type-${asset.type} d-flex align-items-center p-3 border rounded shadow-sm bg-white`}>

              {/* Icon */}
              <div className="me-3 p-2 rounded d-flex align-items-center justify-content-center asset-icon-box"
                style={{
                  width: '48px', height: '48px',
                  fontSize: '1.5rem',
                  background: asset.type === 'connection' ? '#fce4ec' : '#e3f2fd',
                  color: asset.type === 'connection' ? '#c2185b' : '#1565c0'
                }}>
                {asset.icon}
              </div>

              {/* Title */}
              <div className="flex-grow-1">
                <div className="fw-bold text-dark">{asset.title}</div>
                <div className="text-muted small">
                  {/* Show different subtitle based on type */}
                  {asset.type === 'connection'
                    ? <span><span className="me-1">📂</span> {project.projectName}</span>
                    : <span>{asset.subtitle}</span>
                  }
                </div>
              </div>

              {/* Meta Columns */}
              <div className="d-flex align-items-center text-muted small gap-5 me-3">
                <div style={{ minWidth: '150px' }}>
                  {/* Status Badge */}
                  {asset.status === 'Connected' && <Badge bg="success" className="bg-opacity-25 text-success border border-success px-2 py-1 mb-1">Connected</Badge>}
                  {asset.status === 'Disconnected' && <Badge bg="light" className="text-secondary border px-2 py-1 mb-1">Disconnected</Badge>}
                  {asset.status === 'Stopped' && <Badge bg="secondary" className="bg-opacity-25 text-secondary border border-secondary px-2 py-1 mb-1">Stopped</Badge>}

                  <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                    Updated by <strong>{asset.author}</strong><br />
                    on {new Date(asset.updated).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ minWidth: '80px' }}>
                  {asset.type === 'connection' ? '0 Recipes' : '—'}
                </div>

                <div className="d-flex align-items-center gap-1 text-muted" style={{ cursor: 'pointer' }}>
                  <span style={{ transform: 'rotate(45deg)' }}>🏷️</span> Apply tags
                </div>
              </div>

              {/* Action Menu */}
              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown align="end" className="asset-actions-dropdown" drop="down">
                  <Dropdown.Toggle as="button" className="btn btn-sm btn-light asset-actions-toggle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, borderRadius: 8 }}>
                    <span className="text-muted">⋯</span>
                  </Dropdown.Toggle>

                  <Dropdown.Menu popperConfig={{ strategy: 'fixed', placement: 'bottom-end', modifiers: [{ name: 'flip', enabled: false }, { name: 'preventOverflow', options: { padding: 8 } }, { name: 'offset', options: { offset: [0, 4] } }] }} className="shadow border-0 p-2 asset-actions-menu" style={{ minWidth: '220px' }}>
                    <div className="px-3 py-2 small text-muted">Actions</div>

                    <Dropdown.Item onClick={() => handleEdit(asset)} className="d-flex align-items-start py-2 px-3">
                      <div className="me-3 fs-5">✎</div>
                      <div>
                        <div className="fw-bold">Rename / Settings</div>
                        <div className="small text-muted">Update connection name and settings</div>
                      </div>
                    </Dropdown.Item>

                    <Dropdown.Divider />

                    <Dropdown.Item onClick={() => handleDelete(asset)} className="d-flex align-items-center py-2 px-3 text-danger">
                      <div className="me-3 fs-5">🗑️</div>
                      <div className="fw-bold">Delete</div>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

            </div>
          ))}

          {filteredAssets.length === 0 && (
            <div className="text-center py-5 text-muted bg-white border rounded">
              <h5>No assets found</h5>
              <p>Try clearing your search or create a new asset.</p>
            </div>
          )}
        </div>
      </div>

      {/* Shared Connection Modal */}
      <ConnectionModal
        show={showConnModal}
        onHide={() => { setShowConnModal(false); setEditingAsset(null); }}
        fixedProjectId={projectId}
        initialData={editingAsset ? { id: editingAsset.data.connectorId || editingAsset.id, name: editingAsset.title, connectorType: editingAsset.data.connectorType, projectId: editingAsset.data.projectId, configJson: editingAsset.data.configJson } : null}
        onSaved={() => { setShowConnModal(false); setEditingAsset(null); loadProjectData(); }}
      />

      <style>{`
        /* Styles for Colored Strips */
        .asset-card { border-left: 4px solid transparent; transition: transform 0.2s; }
        .asset-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.1)!important; }
        
        .type-connection { border-left-color: #f06292; } /* Pink */
        .type-recipe { border-left-color: #7986cb; }     /* Purple/Blue */
        
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