import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Form, Modal, Table, Alert, Row, Col } from 'react-bootstrap';
import api, { ftpApi } from '../services/api';
import ConnectionModal from './ConnectionModal';
import TriggerConfig from './steps/TriggerConfig';
import CsvStep from './steps/CsvStep';
import HttpStep from './steps/HttpStep';

const ACTION_OPTS = [
    { id: 'csv', label: 'Upload CSV', icon: '📊', bg: '#e8f5e8', color: '#2e7d32' },
    { id: 'http', label: 'HTTP Request', icon: '🌐', bg: '#e3f2fd', color: '#1565c0' },
    { id: 'action', label: 'Action in app', icon: '⚡', bg: '#e3f2fd', color: '#1565c0' },
    { id: 'if', label: 'IF condition', icon: '🔀', bg: '#fff3e0', color: '#ef6c00' },
    { id: 'foreach', label: 'Repeat for each', icon: '🔁', bg: '#f3e5f5', color: '#7b1fa2' },
    { id: 'stop', label: 'Stop job', icon: '🛑', bg: '#ffebee', color: '#c62828' }
];

export default function RecipeBuilder() {
    const { recipeId } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [flow, setFlow] = useState([{ id: 'trigger', type: 'trigger', name: 'Start', icon: '🚀', children: null }]);

    // UI State
    const [activeStepId, setActiveStepId] = useState('trigger');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [addLocation, setAddLocation] = useState(null);

    // Sidebar state
    const [sidebarConnections, setSidebarConnections] = useState([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [showConnectionModal, setShowConnectionModal] = useState(false);

    useEffect(() => {
        if (recipeId) {
            api.get(`/recipes/${recipeId}`)
                .then(res => setRecipe(res.data))
                .catch((err) => {
                    if (err.response && err.response.status === 401) {
                        navigate('/login');
                    }
                });;
        }
    }, [recipeId]);

    // Fetch available connections for CSV step
    const fetchConnections = async () => {
        setLoadingConnections(true);
        try {
            const res = await ftpApi.getConnections();
            setSidebarConnections(res.data || []);
        } catch (err) {
            setSidebarConnections([]);
        } finally {
            setLoadingConnections(false);
        }
    };







    // Flow manipulation functions
    const updateStepInFlow = (currentSteps, stepId, updates) => {
        return currentSteps.map(step => {
            if (step.id === stepId) return { ...step, ...updates };
            if (step.children) return { ...step, children: updateStepInFlow(step.children, stepId, updates) };
            return step;
        });
    };

    const addStepToFlow = (currentSteps, parentId, index, newStep) => {
        if (parentId === null) {
            const newArr = [...currentSteps];
            newArr.splice(index, 0, newStep);
            return newArr;
        }
        return currentSteps.map(step => {
            if (step.id === parentId) {
                const newChildren = step.children ? [...step.children] : [];
                newChildren.splice(index, 0, newStep);
                return { ...step, children: newChildren };
            }
            if (step.children) {
                return { ...step, children: addStepToFlow(step.children, parentId, index, newStep) };
            }
            return step;
        });
    };

    const findStep = (steps, id) => {
        for (const step of steps) {
            if (step.id === id) return step;
            if (step.children) {
                const found = findStep(step.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    // Step validity tracking and linking
    const [stepValidityState, setStepValidityState] = useState({ trigger: false });

    const setStepValidity = (stepId, valid) => {
        setStepValidityState(prev => ({ ...prev, [stepId]: valid }));
    };

    // prevent adding a new step in a position if previous step is invalid
    const canAddAt = (parentId) => {
        if (!parentId) {
            // Adding at root: enforce last top-level step validity
            const last = flow[flow.length - 1];
            if (!last) return true;
            if (last.id === 'trigger') return !!stepValidityState['trigger'];
            return !!stepValidityState[last.id];
        }
        // find parent and ensure it's valid or it's the trigger
        const parent = findStep(flow, parentId);
        if (!parent) return true;
        // prevent adding under a step which has its own child container
        if (parent.children !== null) return false;
        // if parent is trigger, need valid trigger
        if (parent.id === 'trigger') return !!stepValidityState['trigger'];
        return !!stepValidityState[parent.id];
    };

    // helper to enforce linking: make sure a new step's "prevId" is set to previous step
    const linkStepToPrevious = (parentId, index, newStep) => {
        // When inserting into parent's children, the previous step is the item at index-1
        if (parentId === null) {
            const prev = flow[index - 1];
            if (prev) newStep.prevId = prev.id;
        } else {
            const parent = findStep(flow, parentId);
            const prev = (parent && parent.children) ? parent.children[index - 1] : null;
            if (prev) newStep.prevId = prev.id;
        }
        return newStep;
    };


    const handleAddStep = (opt) => {
        const newStep = {
            id: `step_${Date.now()}`,
            type: opt.id,
            name: opt.label,
            icon: opt.icon,
            children: (opt.id === 'if' || opt.id === 'foreach') ? [] : null,
            data: {}
        };

        // Validate previous (parent) step validity
        if (!canAddAt(addLocation?.parentId)) {
            alert('Please complete required fields in the previous step before adding a new step.');
            return;
        }

        // Link to previous and insert
        const linkedStep = linkStepToPrevious(addLocation?.parentId, addLocation?.index || 1, newStep);
        setFlow(prevFlow => addStepToFlow(prevFlow, addLocation?.parentId, addLocation?.index || 1, linkedStep));
        setAddLocation(null);
        setActiveStepId(linkedStep.id);
        // Initialize validity to false until component validates
        setStepValidity(linkedStep.id, false);

        // Open the sidebar for configuration; for CSV step pre-load connections
        setIsSidebarOpen(true);
        if (opt.id === 'csv') {
            fetchConnections();
        }
    };



    const renderStepsRecursive = (steps) => {
        return (
            <div className="d-flex flex-column align-items-center w-100">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="vertical-line"></div>
                        <Card
                            className={`step-card p-3 shadow-sm ${activeStepId === step.id ? 'active-step' : ''}`}
                            onClick={() => {
                                setActiveStepId(step.id);
                                setIsSidebarOpen(true);
                                if (step.type === 'csv') {
                                    fetchConnections();
                                }
                            }}
                        >
                            <div className="d-flex align-items-center">
                                <div className="step-icon me-3">{step.icon}</div>
                                <div>
                                    <div className="step-type">{step.type.toUpperCase()}</div>
                                    <div className="step-name">{step.name}</div>
                                    {step.csvResult && (
                                        <small className="text-success">✓ CSV Processed</small>
                                    )}
                                </div>
                            </div>
                        </Card>

                    </React.Fragment>
                ))}

                {/* One more button at the bottom to add step after canvas */}
                <Button
                    variant="outline-success"
                    size="sm"
                    className="fw-bold mb-3"
                    onClick={() => {
                        if (!canAddAt(null)) {
                            alert('Please complete required fields in the previous step before adding a new step.');
                            return;
                        }
                        setAddLocation({ parentId: null, index: 1 });
                    }}
                >
                    ➕ Add Step
                </Button>

                {/* Action Options */}
                {addLocation && (
                    <Card className="p-3 shadow-sm">
                        <h6 className="fw-bold mb-3 text-sm">Choose Action</h6>
                        <div className="d-flex flex-wrap gap-2">
                            {ACTION_OPTS.map(opt => (
                                <Button
                                    key={opt.id}
                                    variant="outline-primary"
                                    size="sm"
                                    className="fw-bold px-3 py-2"
                                    style={{
                                        backgroundColor: opt.bg,
                                        borderColor: opt.color,
                                        color: opt.color
                                    }}
                                    onClick={() => {
                                        if (!canAddAt(addLocation?.parentId)) {
                                            alert('Please complete required fields in the previous step before adding a new step.');
                                            return;
                                        }
                                        handleAddStep(opt);
                                    }}
                                >
                                    {opt.icon} {opt.label}
                                </Button>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        );
    };

    if (!recipe) {
        return <div className="p-5 text-center">Loading...</div>;
    }

    return (
        <div className="d-flex flex-column h-100" style={{ background: '#fff', minHeight: '100vh' }}>
            {/* Header */}
            <div className="bg-dark text-white px-4 py-3 d-flex justify-content-between align-items-center shadow" style={{ background: '#0f766e' }}>
                <div className="d-flex align-items-center gap-3">
                    <Button variant="link" className="text-white p-0 text-decoration-none fs-5 fw-bold" onClick={() => navigate('/dashboard')}>
                        ← Back
                    </Button>
                    <h5 className="m-0 fw-bold">{recipe.name || 'New Recipe'}</h5>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="light" className="fw-bold" style={{ backgroundColor: '#14b8a6', border: 'none', color: '#fff' }}>
                        💾 Save
                    </Button>
                </div>
            </div>

            {/* Main Area */}
            <div className="d-flex flex-grow-1 overflow-hidden">
                {/* Left Sidebar */}
                <div style={{ width: '300px', background: '#f9fafb', borderRight: '1px solid #e5e7eb' }} className="p-4">
                    <h6 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Steps</h6>
                    <div className={`p-3 rounded mb-3 cursor-pointer ${activeStepId === 'trigger' ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200'}`}
                        onClick={() => setActiveStepId('trigger')}>
                        <div className="d-flex align-items-center">
                            <span className="fs-5 me-2">🚀</span>
                            <div>
                                <div className="fw-bold text-sm">TRIGGER</div>
                                <div className="text-xs text-gray-500">Start</div>
                            </div>
                        </div>
                    </div>

                    <div className="position-relative">
                        <Button
                            variant="outline-success"
                            size="sm"
                            className="w-100 fw-bold mb-3"
                            onClick={() => {
                                if (!canAddAt(null)) {
                                    alert('Please complete required fields in the previous step before adding a new step.');
                                    return;
                                }
                                setAddLocation({ parentId: null, index: 1 });
                            }}
                        >
                            ➕ Add Step
                        </Button>


                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-grow-1 p-5 overflow-auto" style={{ background: '#f8fafc' }}>
                    <div className="d-flex flex-column align-items-center" style={{ minHeight: '100%' }}>
                        {renderStepsRecursive(flow)}
                    </div>
                </div>

                {/* Right Sidebar - Trigger & Step Configuration */}
                {isSidebarOpen && (
                    <div style={{
                        width: '420px',
                        background: '#ffffff',
                        borderLeft: '1px solid #e5e7eb',
                        boxShadow: '-4px 0 12px rgba(0,0,0,0.1)'
                    }}>
                        <div className="p-4 border-bottom">
                            <h6 className="fw-bold mb-0">Configure</h6>
                        </div>

                        {/* Trigger configuration */}
                        {activeStepId === 'trigger' && (
                            <div className="p-4">
                                <TriggerConfig
                                    step={findStep(flow, 'trigger')}
                                    onChange={(data) => setFlow(prev => updateStepInFlow(prev, 'trigger', { data }))}
                                    onValidityChange={(valid) => setStepValidity('trigger', valid)}
                                />
                            </div>
                        )}

                        {/* Non-trigger step configuration */}
                        {activeStepId !== 'trigger' && (
                            <div className="p-4">
                                {(() => {
                                    const active = findStep(flow, activeStepId);
                                    if (!active) return <p className="text-muted">No step selected</p>;

                                    if (active.type === 'csv') {
                                        return (
                                            <CsvStep
                                                step={active}
                                                connections={sidebarConnections}
                                                refreshConnections={fetchConnections}
                                                onChange={(data) => setFlow(prev => updateStepInFlow(prev, activeStepId, { data }))}
                                                onValidityChange={(valid) => setStepValidity(activeStepId, valid)}
                                            />
                                        );
                                    }

                                    if (active.type === 'http') {
                                        return (
                                            <HttpStep
                                                step={active}
                                                onChange={(data) => setFlow(prev => updateStepInFlow(prev, activeStepId, { data }))}
                                                onValidityChange={(valid) => setStepValidity(activeStepId, valid)}
                                            />
                                        );
                                    }

                                    return <div className="text-muted">No configuration available for this step.</div>;
                                })()}
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Connection Modal used to create new connections for CSV step */}
            <ConnectionModal
                show={showConnectionModal}
                onHide={() => setShowConnectionModal(false)}
                projects={[]}
                onSaved={() => { setShowConnectionModal(false); fetchConnections(); }}
            />

            <style jsx>{`
                .vertical-line { 
                    width: 2px; height: 30px; background: #d1d5db; margin: 0 auto; 
                }
                .step-card { 
                    width: 100%; max-width: 400px; cursor: pointer; 
                    border: 2px solid #e5e7eb; border-radius: 12px; margin: 0 auto 20px;
                    transition: all 0.3s ease; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .step-card:hover { 
                    border-color: #10b981; transform: translateY(-2px); box-shadow: 0 12px 24px rgba(16,185,129,0.15);
                }
                .active-step { 
                    border-color: #10b981 !important; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    box-shadow: 0 12px 24px rgba(16,185,129,0.2);
                }
                .step-icon { 
                    width: 48px; height: 48px; border-radius: 12px; display: flex; 
                    align-items: center; justify-content: center; font-size: 1.5rem;
                    background: #f0fdf4; border: 2px solid #dcfce7; flex-shrink: 0;
                }
                .step-type { 
                    font-size: 0.7rem; font-weight: 700; color: #10b981; 
                    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
                }
                .step-name { 
                    font-size: 1rem; font-weight: 600; color: #1f2937;
                }
                .add-btn { 
                    width: 40px; height: 40px; border-radius: 50%; 
                    border: 2px solid #d1d5db; background: white; color: #10b981;
                    font-weight: bold; font-size: 1.4rem; cursor: pointer;
                    transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .add-btn:hover { 
                    background: #10b981; color: white; border-color: #10b981;
                    transform: scale(1.1); box-shadow: 0 8px 20px rgba(16,185,129,0.3);
                }
                .cursor-pointer { cursor: pointer; }
            `}</style>
        </div>
    );
}
