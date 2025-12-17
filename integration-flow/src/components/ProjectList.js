import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button, Form, InputGroup, Dropdown, Modal } from 'react-bootstrap';

export default function ProjectList() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [showCreate, setShowCreate] = useState(false);
    const [newProject, setNewProject] = useState({ projectName: '', projectDescription: '' });
    const [showEdit, setShowEdit] = useState(false);
    const [editingProject, setEditingProject] = useState({ projectId: '', projectName: '', projectDescription: '' });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async () => {
        try {
            const res = await api.post('/projects', newProject);
            setShowCreate(false);
            setNewProject({ projectName: '', projectDescription: '' });
            navigate(`/dashboard/project/${res.data.projectId}`);
        } catch (err) {
            alert('Failed to create project');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this project?')) {
            await api.delete(`/projects/${id}`);
            fetchProjects();
        }
    };

    const openEditModal = (e, project) => {
        e.stopPropagation();
        setEditingProject({ ...project });
        setShowEdit(true);
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/projects/${editingProject.projectId}`, editingProject);
            setShowEdit(false);
            fetchProjects();
        } catch (err) {
            alert('Failed to update project');
        }
    };

    const filteredProjects = projects.filter(p =>
        p.projectName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Projects</h2>
                <Button variant="primary" style={{ backgroundColor: '#00796b', border: 'none' }} onClick={() => setShowCreate(true)}>
                    Create project
                </Button>
            </div>

            <div className="mb-4" style={{ maxWidth: '400px' }}>
                <InputGroup>
                    <InputGroup.Text className="bg-white border-end-0">🔍</InputGroup.Text>
                    <Form.Control
                        placeholder="Search projects"
                        className="border-start-0 ps-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </InputGroup>
            </div>

            <div className="row g-4">
                {filteredProjects.map((p) => (
                    <div className="col-md-4 col-xl-3" key={p.projectId}>
                        <div
                            className="project-card h-100"
                            onClick={() => navigate(`/dashboard/project/${p.projectId}`)}
                            style={{ position: 'relative' }} // Needed for card layout
                        >

                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <h5 className="fw-bold text-dark mb-0 text-truncate" style={{ maxWidth: '85%' }}>{p.projectName}</h5>

                                {/* --- DROPDOWN FIX START --- */}
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Dropdown align="end">
                                        <Dropdown.Toggle
                                            as="div" // Renders as div to remove default button styles
                                            className="text-muted p-0 no-caret fs-4 fw-bold"
                                            style={{ cursor: 'pointer', lineHeight: '0.5', padding: '0 5px' }}
                                        >
                                            ...
                                        </Dropdown.Toggle>

                                        {/* 1. strategy="fixed" fixes the overlap issue */}
                                        {/* 2. Custom styles match your screenshot */}
                                        <Dropdown.Menu
                                            popperConfig={{ strategy: "fixed" }}
                                            renderOnMount
                                            className="shadow border-0 p-2"
                                            style={{ minWidth: '180px', borderRadius: '8px' }}
                                        >
                                            <Dropdown.Item
                                                onClick={(e) => openEditModal(e, p)}
                                                className="d-flex align-items-center py-2 px-3 rounded text-secondary"
                                                style={{ fontSize: '0.9rem', fontWeight: '500' }}
                                            >
                                                {/* Pencil Icon */}
                                                <span className="me-3">✎</span> Rename
                                            </Dropdown.Item>

                                            <Dropdown.Item
                                                onClick={(e) => handleDelete(e, p.projectId)}
                                                className="d-flex align-items-center py-2 px-3 rounded text-secondary"
                                                style={{ fontSize: '0.9rem', fontWeight: '500' }}
                                            >
                                                {/* Trash Icon */}
                                                <span className="me-3">🗑️</span> Delete
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                                {/* --- DROPDOWN FIX END --- */}

                            </div>

                            <div className="text-muted mb-3 small" style={{ minHeight: '40px' }}>
                                {p.projectDescription || <span className="fst-italic text-light-gray">Add a description</span>}
                            </div>

                            <div className="card-meta-text d-flex align-items-center mt-auto border-top pt-3">
                                <div className="project-icon-circle me-2">
                                    {p.projectName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    {/* UPDATE HERE: Use modifiedByName or createdByName */}
                                    <div>
                                        Last updated by <strong>{p.modifiedByName || p.createdByName || 'Unknown'}</strong>
                                    </div>
                                    <div style={{ fontSize: '0.7rem' }}>
                                        on {new Date(p.modifiedDate || p.createdDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODALS (Create/Edit) --- */}
            <Modal show={showCreate} onHide={() => setShowCreate(false)}>
                <Modal.Header closeButton><Modal.Title>New Project</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={newProject.projectName} onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })} autoFocus /></Form.Group>
                    <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" value={newProject.projectDescription} onChange={(e) => setNewProject({ ...newProject, projectDescription: e.target.value })} /></Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate}>Create Project</Button></Modal.Footer>
            </Modal>

            <Modal show={showEdit} onHide={() => setShowEdit(false)}>
                <Modal.Header closeButton><Modal.Title>Rename Project</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={editingProject.projectName} onChange={(e) => setEditingProject({ ...editingProject, projectName: e.target.value })} /></Form.Group>
                    <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" value={editingProject.projectDescription} onChange={(e) => setEditingProject({ ...editingProject, projectDescription: e.target.value })} /></Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdate}>Save Changes</Button></Modal.Footer>
            </Modal>

            {/* Custom CSS for hover effects */}
            <style>{`
        .dropdown-item:hover { background-color: #f8f9fa; color: #000; }
        .dropdown-toggle::after { display: none !important; } /* Hides the default arrow */
      `}</style>
        </div>
    );
}