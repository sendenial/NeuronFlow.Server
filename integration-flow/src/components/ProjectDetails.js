import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button, Form, InputGroup, Spinner, Nav, Badge, Dropdown, Modal, Card } from 'react-bootstrap';
import { CONNECTOR_CATALOG, CONNECTOR_SCHEMAS, CONNECTOR_TYPES } from '../constants/connectorConfig';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  // Data State
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assets');

  // --- CONNECTION WIZARD STATE ---
  const [showConnModal, setShowConnModal] = useState(false);
  const [step, setStep] = useState(1); // 1 = App Catalog, 2 = Config
  const [searchTerm, setSearchTerm] = useState('');
  const [newConnData, setNewConnData] = useState({ name: '', connectorType: null });
  const [configData, setConfigData] = useState({}); 

  // --- RECIPE MODAL STATE ---
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeName, setRecipeName] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  // 1. Load Project & Assets
  const loadData = async () => {
    setLoading(true);
    try {
      // Get Project Info
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);

      // Get Connections
      const connRes = await api.get(`/connections?projectId=${projectId}`);
      
      const connectionAssets = connRes.data.map(c => {
        const meta = CONNECTOR_CATALOG.find(cat => cat.id === c.connectorType) || {};
        return {
            id: c.connectorId,
            type: 'connection',
            title: c.name,
            subtitle: meta.name || 'Unknown App',
            icon: meta.icon || '🔌',
            // Check if config exists to determine status
            status: (c.configJson && c.configJson.length > 2) ? 'Connected' : 'Disconnected', 
            updated: c.modifiedDate || c.createdDate,
            author: c.createdBy || 'System',
            raw: c 
        };
      });

      // Merge and Sort by Date
      const allAssets = [...connectionAssets].sort((a,b) => new Date(b.updated) - new Date(a.updated));
      setAssets(allAssets);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Connection Creation
  const handleAppSelect = (typeId) => {
    setNewConnData({ ...newConnData, connectorType: typeId });
    setConfigData({});
    setStep(2); // Move to configuration
  };

  const handleCreateConnection = async () => {
    try {
      const payload = {
        name: newConnData.name,
        connectorType: parseInt(newConnData.connectorType),
        projectId: projectId, // Important: Link to THIS project
        configJson: JSON.stringify(configData)
      };

      await api.post('/connections', payload);
      setShowConnModal(false);
      resetWizard();
      loadData(); // Refresh list
    } catch (err) {
      alert('Failed to create connection');
    }
  };

  const resetWizard = () => {
    setStep(1);
    setNewConnData({ name: '', connectorType: null });
    setConfigData({});
    setSearchTerm('');
  };

  // 3. Handle Recipe Creation (Placeholder)
  const handleCreateRecipe = () => {
    // Here you would normally POST to your recipe API
    // For now, we'll navigate to the builder
    setShowRecipeModal(false);
    navigate('/dashboard/builder'); 
  };

  // --- RENDERERS ---

  const renderAppCatalog = () => {
    const filteredApps = CONNECTOR_CATALOG.filter(app => 
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="p-3">
        <InputGroup className="mb-4">
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control 
            placeholder="Search for an app..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </InputGroup>
        <div className="row g-3">
          {filteredApps.map((app) => (
            <div className="col-4" key={app.id}>
              <Card 
                className={`h-100 shadow-sm border-0 text-center p-3 app-card ${app.disabled ? 'opacity-50' : ''}`}
                style={{ cursor: app.disabled ? 'default' : 'pointer' }}
                onClick={() => !app.disabled && handleAppSelect(app.id)}
              >
                <div className="mx-auto mb-2" style={{fontSize: '2rem', background: app.color, width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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

  const renderConfigForm = () => {
    const schema = CONNECTOR_SCHEMAS[newConnData.connectorType] || [];
    const appInfo = CONNECTOR_CATALOG.find(c => c.id === newConnData.connectorType) || {};

    return (
      <div className="p-3">
        <div className="d-flex align-items-center mb-4">
            <Button variant="link" className="p-0 me-3 text-decoration-none fs-5" onClick={() => setStep(1)}>←</Button>
            <div className="fw-bold fs-5">Connect to {appInfo.name}</div>
        </div>

        <Form.Group className="mb-3">
            <Form.Label>Connection Name</Form.Label>
            <Form.Control 
                value={newConnData.name}
                onChange={(e) => setNewConnData({...newConnData, name: e.target.value})}
                placeholder={`My ${appInfo.name} Connection`}
            />
        </Form.Group>

        {schema.map((field) => (
            <Form.Group className="mb-3" key={field.key}>
                <Form.Label>{field.label}</Form.Label>
                {field.type === 'select' ? (
                    <Form.Select onChange={(e) => setConfigData({...configData, [field.key]: e.target.value})}>
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </Form.Select>
                ) : (
                    <Form.Control 
                        type={field.type} 
                        onChange={(e) => setConfigData({...configData, [field.key]: e.target.value})}
                    />
                )}
            </Form.Group>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;
  if (!project) return <div className="p-5 text-center">Project not found</div>;

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* HEADER */}
      <div className="bg-white border-bottom px-5 pt-4 pb-0">
        <div className="mb-2 text-muted small">
            <Link to="/dashboard/projects" className="text-decoration-none text-muted">Projects</Link> 
            <span className="mx-2">›</span> 
            {project.projectName}
        </div>
        
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center">
            <div className="project-icon-circle me-3" style={{width: '40px', height: '40px', fontSize: '1.2rem'}}>
                {project.projectName.charAt(0).toUpperCase()}
            </div>
            <h3 className="mb-0 fw-bold">{project.projectName}</h3>
          </div>

          {/* CREATE BUTTON DROPDOWN */}
          <Dropdown>
            <Dropdown.Toggle variant="primary" style={{backgroundColor: '#00796b', border: 'none'}} className="fw-bold px-4">
                Create
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" className="shadow border-0 mt-2" style={{minWidth: '200px'}}>
                <Dropdown.Header className="text-uppercase small fw-bold">Assets</Dropdown.Header>
                <Dropdown.Item onClick={() => setShowRecipeModal(true)} className="py-2">
                    <span className="me-2">📜</span> Recipe
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { resetWizard(); setShowConnModal(true); }} className="py-2">
                    <span className="me-2">⚡</span> Connection
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item disabled className="text-muted">📂 Folder (Coming soon)</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* TABS */}
        <Nav variant="tabs" className="border-bottom-0 mt-4">
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'assets'} 
              onClick={() => setActiveTab('assets')}
              className={`px-4 fw-bold ${activeTab === 'assets' ? 'text-primary border-bottom border-primary border-3 bg-white' : 'text-muted'}`}
            >
              Assets <Badge bg="light" text="dark" className="ms-1 border">{assets.length}</Badge>
            </Nav.Link>
          </Nav.Item>
          {/* <Nav.Item>
            <Nav.Link onClick={() => setActiveTab('settings')} className="text-muted px-4">Settings</Nav.Link>
          </Nav.Item> */}
        </Nav>
      </div>

      {/* ASSET LIST */}
      <div className="p-5">
        <div className="d-flex mb-3">
            <InputGroup style={{maxWidth: '400px'}}>
                <InputGroup.Text className="bg-white">🔍</InputGroup.Text>
                <Form.Control placeholder="Search assets..." className="border-start-0" />
            </InputGroup>
        </div>

        {assets.length === 0 ? (
            <div className="text-center py-5 text-muted border rounded bg-white">
                <h5>No assets yet</h5>
                <p>Create a connection or recipe to get started.</p>
            </div>
        ) : (
            <div className="d-flex flex-column gap-3">
                {assets.map(asset => (
                    <div key={asset.id} className="asset-card d-flex align-items-center bg-white p-3 rounded border shadow-sm">
                        <div 
                            className="asset-icon-box me-3 p-2 rounded d-flex align-items-center justify-content-center" 
                            style={{
                                fontSize: '1.5rem', 
                                width: '50px', height: '50px',
                                background: asset.type === 'connection' ? '#fce4ec' : '#e3f2fd',
                                color: asset.type === 'connection' ? '#c2185b' : '#1565c0'
                            }}
                        >
                            {asset.icon}
                        </div>
                        <div className="flex-grow-1">
                            <div className="fw-bold text-dark">{asset.title}</div>
                            <div className="text-muted small">
                                {asset.type === 'connection' ? 'Connection' : 'Recipe'} • {asset.subtitle}
                            </div>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="text-end text-muted small me-4" style={{minWidth: '120px'}}>
                            {asset.status === 'Connected' && <Badge bg="success" className="mb-1">Connected</Badge>}
                            {asset.status === 'Disconnected' && <Badge bg="light" text="dark" className="border mb-1">Disconnected</Badge>}
                            {asset.status === 'Stopped' && <Badge bg="secondary" className="mb-1">Stopped</Badge>}
                            
                            <div style={{fontSize: '0.75rem'}}>
                                {new Date(asset.updated).toLocaleDateString()}
                            </div>
                        </div>
                        
                        <div className="text-muted fs-5 px-2" style={{cursor: 'pointer'}}>...</div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- MODAL 1: CREATE CONNECTION WIZARD --- */}
      <Modal show={showConnModal} onHide={() => setShowConnModal(false)} size="lg" centered>
        <Modal.Header closeButton>
            <Modal.Title>{step === 1 ? 'New Connection' : 'Configure Connection'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{minHeight: '400px'}}>
            {step === 1 ? renderAppCatalog() : renderConfigForm()}
        </Modal.Body>
        {step === 2 && (
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button variant="success" onClick={handleCreateConnection}>Connect</Button>
            </Modal.Footer>
        )}
      </Modal>

      {/* --- MODAL 2: CREATE RECIPE (Placeholder) --- */}
      <Modal show={showRecipeModal} onHide={() => setShowRecipeModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>New Recipe</Modal.Title></Modal.Header>
        <Modal.Body>
            <Form.Group>
                <Form.Label>Recipe Name</Form.Label>
                <Form.Control 
                    value={recipeName} 
                    onChange={(e) => setRecipeName(e.target.value)} 
                    placeholder="e.g. Sync Leads to SQL"
                    autoFocus
                />
            </Form.Group>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="primary" onClick={handleCreateRecipe}>Start Building</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .app-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15)!important; }
      `}</style>
    </div>
  );
}