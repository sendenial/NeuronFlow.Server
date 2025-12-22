import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STARTING_POINTS = [
    { id: 'AppEvent', label: 'Trigger from an app', icon: '⚡', desc: 'Real-time or polled events' },
    { id: 'Schedule', label: 'Run on a schedule', icon: 'clock', desc: 'Interval or specific time' },
    { id: 'Webhook', label: 'Trigger from a webhook', icon: '🔗', desc: 'HTTP callbacks' }
];

export default function RecipeSetup() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [projectId, setProjectId] = useState('');
    const [selectedTrigger, setSelectedTrigger] = useState('AppEvent');
    const [projects, setProjects] = useState([]);

    useEffect(() => {

        api.get('/projects').then(res => {
            setProjects(res.data);
            if (res.data.length > 0) setProjectId(res.data[0].projectId);
        }).catch((err) => {
            if (err.response && err.response.status === 401) {
                navigate('/login');
            }
        });
    }, []);

    const handleCreate = async () => {
        if (!name || !projectId) return alert('Please fill all fields');
        try {
            const res = await api.post('/recipes', {
                name,
                projectId,
                triggerType: selectedTrigger
            }).then(res => {
                // Navigate to the Builder
                navigate(`/dashboard/recipe/${res.data.recipeId}/builder`);
            }).catch((err) => {

                if (err.response && err.response.status === 401) {
                    navigate('/login');
                }   
            });
            // Navigate to the Builder
            // navigate(`/dashboard/recipe/${res.data.recipeId}/builder`);
        } catch (e) {
            alert('Failed to create recipe');
        }
    };

    return (
        <div className="p-5 bg-light h-100">
            <h3 className="fw-bold mb-4">Set up your recipe</h3>

            <Card className="p-4 shadow-sm border-0">
                <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Name</Form.Label>
                    <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sync Salesforce to NetSuite" />
                </Form.Group>

                <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Location <span className="text-danger">*</span></Form.Label>
                    <Form.Select value={projectId} onChange={e => setProjectId(e.target.value)}>
                        {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}
                    </Form.Select>
                </Form.Group>

                <div className="mb-4">
                    <Form.Label className="fw-bold">Pick a starting point <span className="text-danger">*</span></Form.Label>
                    <Row className="g-3">
                        {STARTING_POINTS.map(pt => (
                            <Col md={3} key={pt.id}>
                                <div
                                    className={`p-3 border rounded text-center cursor-pointer ${selectedTrigger === pt.id ? 'border-primary bg-primary bg-opacity-10' : 'bg-white'}`}
                                    style={{ cursor: 'pointer', height: '100%' }}
                                    onClick={() => setSelectedTrigger(pt.id)}
                                >
                                    <div className="fs-1 mb-2">{pt.icon}</div>
                                    <div className="fw-bold">{pt.label}</div>
                                    <div className="small text-muted">{pt.desc}</div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>

                <div className="mt-2">
                    <Button variant="primary" onClick={handleCreate} className="px-4 py-2 fw-bold" style={{ backgroundColor: '#00796b', border: 'none' }}>
                        Start Building
                    </Button>
                </div>
            </Card>
        </div>
    );
}