import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Nav, Form, InputGroup } from 'react-bootstrap';
import api from '../services/api';
import { CONNECTOR_CATALOG } from '../constants/connectorConfig';

const APP_ACTIONS = {
    // 1: REST API / HTTP
    1: [
        { id: 'get', name: 'Send GET request', desc: 'Retrieve data from a URL', type: 'read' },
        { id: 'post', name: 'Send POST request', desc: 'Send data to a server', type: 'write' },
        { id: 'put', name: 'Send PUT request', desc: 'Update existing data', type: 'write' },
    ],
    // 0: SQL Server
    0: [
        { id: 'new_row', name: 'New row', desc: 'Triggers when a new row is inserted', type: 'trigger' },
        { id: 'update_row', name: 'Updated row', desc: 'Triggers when a row is modified', type: 'trigger' },
        { id: 'insert', name: 'Insert row', desc: 'Add a new record to a table', type: 'write' },
        { id: 'select', name: 'Select rows', desc: 'Query rows using SQL', type: 'read' },
    ],
    // 2: FTP
    2: [
        { id: 'upload', name: 'Upload file', desc: 'Upload a file to the server', type: 'write' },
        { id: 'download', name: 'Download file', desc: 'Get a file from the server', type: 'read' },
    ]
};

// --- CONFIG: OPTIONS & COLORS ---
// These match the exact Workato color schemes
const ACTION_OPTS = [
    { id: 'action', label: 'Action in app', icon: '⚡', bg: '#e3f2fd', color: '#1565c0' }, // Blue
    { id: 'if', label: 'IF condition', icon: '🔀', bg: '#fff3e0', color: '#ef6c00' },    // Orange
    { id: 'foreach', label: 'Repeat for each', icon: '🔁', bg: '#f3e5f5', color: '#7b1fa2' }, // Purple
    { id: 'while', label: 'Repeat while', icon: '🔄', bg: '#f3e5f5', color: '#7b1fa2' }, // Purple
    { id: 'call', label: 'Call recipe', icon: '📞', bg: '#e0f2f1', color: '#00695c' },    // Teal
    { id: 'stop', label: 'Stop job', icon: '🛑', bg: '#ffebee', color: '#c62828' },       // Red
    { id: 'error', label: 'Handle errors', icon: '🛡️', bg: '#eceff1', color: '#455a64' }   // Grey
];

const CONDITION_OPS = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_present', label: 'is present' },
    { value: 'is_blank', label: 'is blank' }
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
    const [sidebarTab, setSidebarTab] = useState('app'); 
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.get(`/recipes/${recipeId}`).then(res => setRecipe(res.data)).catch(() => {});
    }, [recipeId]);

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

    const handleAddStep = (opt) => {
        const newStep = {
            id: `step_${Date.now()}`,
            type: opt.id,
            name: opt.id === 'action' ? 'Select an app' : opt.label,
            icon: opt.icon,
            children: (opt.id === 'if' || opt.id === 'foreach') ? [] : null,
            // IF BLOCK DATA
            conditionData: opt.id === 'if' ? { field: '', operator: 'equals', value: '' } : null
        };

        setFlow(addStepToFlow(flow, addLocation.parentId, addLocation.index, newStep));
        setAddLocation(null);
        setActiveStepId(newStep.id);
        setIsSidebarOpen(true);
    };

    // --- RENDERERS: CONDITION BUILDER ---
    const renderConditionBuilder = (step) => {
        const data = step.conditionData || { field: '', operator: 'equals', value: '' };

        const updateCondition = (key, val) => {
            const newData = { ...data, [key]: val };
            setFlow(updateStepInFlow(flow, step.id, { conditionData: newData }));
        };

        return (
            <div className="d-flex flex-column h-100">
                <div className="p-4">
                    <h6 className="fw-bold mb-3">Data field</h6>
                    
                    {/* 1. DATA FIELD INPUT (Pill Style) */}
                    <div className="pill-input-container mb-3">
                        <input 
                            className="pill-input" 
                            placeholder="Data field" 
                            value={data.field}
                            onChange={(e) => updateCondition('field', e.target.value)}
                        />
                        <span className="pill-icon">📄</span>
                    </div>

                    <h6 className="fw-bold mb-3">Condition</h6>
                    
                    {/* 2. OPERATOR DROPDOWN */}
                    <Form.Select 
                        className="mb-3 shadow-none border-secondary-subtle" 
                        value={data.operator}
                        onChange={(e) => updateCondition('operator', e.target.value)}
                        style={{fontWeight: 500, color: '#333'}}
                    >
                        {CONDITION_OPS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </Form.Select>

                    {/* 3. VALUE INPUT (Only if operator needs it) */}
                    {!['is_true','is_false','is_present','is_blank'].includes(data.operator) && (
                        <>
                            <h6 className="fw-bold mb-3">Value</h6>
                            <div className="pill-input-container mb-1">
                                <input 
                                    className="pill-input" 
                                    placeholder="Value" 
                                    value={data.value}
                                    onChange={(e) => updateCondition('value', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* 4. FORMULA LINK */}
                    <div className="mt-3 d-flex align-items-center">
                        <span className="me-2 text-muted" style={{fontSize: '0.9rem'}}>fx</span>
                        <a href="#" className="text-decoration-none fw-bold" style={{color: '#00796b', fontSize: '0.9rem'}}>
                            Get started with formulas
                        </a>
                    </div>
                </div>
            </div>
        );
    };

    const renderSidebar = () => {
        const activeStep = findStep(flow, activeStepId);
        
        return (
            <div className="d-flex flex-column h-100 bg-white border-start shadow-lg">
                {/* Header */}
                <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-white">
                    <div className="d-flex align-items-center">
                        <span className="fs-5 me-2">{activeStep?.icon || '⚡'}</span>
                        <h6 className="m-0 fw-bold">{activeStep?.type === 'if' ? 'IF condition' : 'Configure Step'}</h6>
                    </div>
                    <Button variant="close" onClick={() => setIsSidebarOpen(false)}></Button>
                </div>

                {/* Content Area */}
                <div className="flex-grow-1 overflow-auto custom-scrollbar">
                    {activeStep?.type === 'if' ? (
                        // SHOW CONDITION BUILDER
                        renderConditionBuilder(activeStep)
                    ) : (
                        // SHOW STANDARD APP/ACTION CONFIG (From previous code)
                        <div className="p-4 text-center text-muted">
                            App Configuration UI (See previous code)
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderStepsRecursive = (steps, parentId = null) => {
        return (
            <div className="d-flex flex-column align-items-center w-100">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="vertical-line"></div>
                        <Card 
                            className={`step-card p-3 shadow-sm ${activeStepId === step.id ? 'active-step' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveStepId(step.id); setIsSidebarOpen(true); }}
                        >
                            <div className="d-flex align-items-center">
                                <div className="step-icon me-3">{step.icon}</div>
                                <div>
                                    <div className="step-type">{step.type.toUpperCase()}</div>
                                    <div className="step-name">{step.name}</div>
                                </div>
                            </div>
                        </Card>
                        {step.children && (
                            <div className="logic-container w-100 d-flex">
                                <div className="logic-line-left"></div>
                                <div className="logic-content flex-grow-1">
                                    {renderStepsRecursive(step.children, step.id)}
                                </div>
                            </div>
                        )}
                        <div className="vertical-line"></div>
                        <div className="position-relative d-flex justify-content-center">
                             {/* ... (Plus button logic) ... */}
                             <button className="add-btn shadow-sm" onClick={() => handleAddStep({id:'if', label:'IF', icon:'🔀'})}>+</button>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderStepsList = (steps, level = 0, parentNumber = '') => {
        return (
            <div>
                {steps.map((step, index) => {
                    const stepNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
                    const isActive = activeStepId === step.id;
                    return (
                        <React.Fragment key={step.id}>
                            <div 
                                className={`steps-list-item ${isActive ? 'active' : ''}`}
                                onClick={() => { setActiveStepId(step.id); setIsSidebarOpen(true); }}
                                style={{marginLeft: `${level * 16}px`}}
                            >
                                <div className="steps-list-number">{step.type.toUpperCase()}</div>
                                <div className="steps-list-name">{step.name}</div>
                            </div>
                            {step.children && (
                                <div style={{marginLeft: `${16}px`, paddingLeft: '8px', borderLeft: '1px solid #e5e7eb', marginTop: '4px', marginBottom: '4px'}}>
                                    {renderStepsList(step.children, level + 1, stepNumber)}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    if(!recipe) return <div className="p-5 text-center">Loading...</div>;

    return (
        <div className="d-flex flex-column h-100" style={{background: '#fff', minHeight: '100vh'}}>
            {/* Header */}
            <div className="bg-dark text-white px-4 py-3 d-flex justify-content-between align-items-center shadow" style={{background: '#0f766e', zIndex: 20}}>
                <div className="d-flex align-items-center gap-3">
                    <Button 
                        variant="link" 
                        className="text-white p-0 text-decoration-none fs-5 fw-bold"
                        onClick={() => navigate('/dashboard/projects')}
                    >
                        ← Back
                    </Button>
                    <h5 className="m-0 fw-bold ms-3">{recipe.name}</h5>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-light" size="sm" className="fw-bold">RECIPE</Button>
                    <Button variant="outline-light" size="sm" className="fw-bold">TEST JOBS</Button>
                    <Button 
                        variant="light" 
                        size="sm" 
                        className="fw-bold ms-3"
                        style={{backgroundColor: '#14b8a6', border: 'none', color: '#fff'}}
                    >
                        💾 Save
                    </Button>
                    <Button variant="outline-light" size="sm">🔄 Refresh</Button>
                    <Button variant="outline-light" size="sm">⊗ Exit</Button>
                </div>
            </div>

            {/* Main Area */}
            <div className="d-flex flex-grow-1 overflow-hidden">
                {/* Left Sidebar - Steps List */}
                <div style={{width: '450px', background: '#f9f9f9', borderRight: '1px solid #e5e7eb', overflowY: 'auto'}} className="custom-scrollbar">
                    <div className="p-4">
                        {/* Trigger Section */}
                        <div className="mb-5">
                            <h6 style={{fontSize: '0.75rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px'}}>Trigger</h6>
                            <div 
                                className={`steps-list-item ${activeStepId === 'trigger' ? 'active' : ''}`}
                                onClick={() => { setActiveStepId('trigger'); setIsSidebarOpen(true); }}
                            >
                                <div className="steps-list-number">TRIGGER</div>
                                <div className="steps-list-name">Start</div>
                            </div>
                        </div>

                        {/* Actions Section */}
                        <div>
                            <h6 style={{fontSize: '0.75rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px'}}>Actions</h6>
                            {renderStepsList(flow.slice(1))}
                        </div>
                    </div>
                </div>

                {/* Center Canvas */}
                <div className="flex-grow-1 overflow-auto position-relative custom-scrollbar" style={{background: '#ffffff'}}>
                    <div className="d-flex flex-column align-items-center py-5" style={{minHeight: '100%', paddingBottom: '100px'}}>
                        <div style={{maxWidth: '800px', width: '100%', paddingLeft: '20px', paddingRight: '20px'}}>
                            {renderStepsRecursive(flow)}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Config Panel */}
                {isSidebarOpen && (
                    <div style={{
                        width: '420px',
                        background: '#ffffff',
                        borderLeft: '1px solid #e5e7eb',
                        boxShadow: '-2px 0 10px rgba(0,0,0,0.08)',
                        animation: 'slideInRight 0.3s ease-out',
                        overflowY: 'auto'
                    }} className="custom-scrollbar">
                        {renderSidebar()}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }

                /* Steps List Sidebar */
                .steps-list-item {
                    padding: 12px 16px;
                    margin-bottom: 8px;
                    border-left: 3px solid transparent;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid #e5e7eb;
                }

                .steps-list-item:hover {
                    border-color: #14b8a6;
                    background: #f0fdf9;
                }

                .steps-list-item.active {
                    border-left-color: #14b8a6;
                    background: #f0fdf9;
                    border: 1px solid #14b8a6;
                    box-shadow: 0 2px 8px rgba(20,184,166,0.1);
                }

                .steps-list-number {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #999;
                    margin-bottom: 2px;
                }

                .steps-list-name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #1f2937;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Canvas Elements */
                .vertical-line { 
                    width: 2px; 
                    height: 25px; 
                    background: #d1d5db;
                    margin: 0 auto;
                }

                .step-card { 
                    width: 100%;
                    max-width: 550px;
                    cursor: pointer; 
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    margin: 0 auto;
                    transition: all 0.2s ease;
                    background: white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
                    animation: popIn 0.3s ease-out;
                    padding: 16px !important;
                }
                
                .step-card:hover { 
                    border-color: #14b8a6;
                    box-shadow: 0 8px 16px rgba(20,184,166,0.12);
                    transform: translateY(-2px);
                }

                .active-step { 
                    border: 2px solid #14b8a6 !important; 
                    background: linear-gradient(135deg, #f0fdf9 0%, #d1fae5 100%);
                    box-shadow: 0 8px 20px rgba(20,184,166,0.15);
                }

                .step-icon { 
                    width: 44px; 
                    height: 44px; 
                    border-radius: 8px;
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-size: 1.4rem;
                    background: #f0fdf9;
                    border: 1px solid #ccf0ee;
                    flex-shrink: 0;
                }

                .step-type { 
                    font-size: 0.65rem; 
                    font-weight: 700;
                    color: #14b8a6; 
                    letter-spacing: 0.5px; 
                    text-transform: uppercase;
                    margin-bottom: 2px;
                }

                .step-name { 
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .add-btn { 
                    width: 32px; 
                    height: 32px; 
                    border-radius: 50%;
                    border: 2px solid #d1d5db;
                    background: white;
                    color: #14b8a6;
                    font-weight: bold;
                    font-size: 1.2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    padding-bottom: 2px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                }

                .add-btn:hover { 
                    background: #14b8a6; 
                    color: white;
                    border-color: #14b8a6;
                    transform: scale(1.1);
                    box-shadow: 0 6px 14px rgba(20,184,166,0.3);
                }

                /* Logic Container */
                .logic-container { 
                    padding-left: 28px;
                    position: relative;
                    margin: 8px 0;
                }

                .logic-line-left { 
                    width: 24px;
                    border-left: 2px solid #d1d5db;
                    border-bottom: 2px solid #d1d5db;
                    border-bottom-left-radius: 12px;
                    margin-bottom: 24px;
                    margin-top: -8px;
                }

                .logic-content { 
                    padding: 12px;
                    background: #f9f9f9;
                    border-left: 2px solid #14b8a6;
                    border-radius: 4px;
                }

                /* Sidebar Config */
                .pill-input-container {
                    position: relative;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: #fff;
                    transition: all 0.2s ease;
                }

                .pill-input-container:focus-within {
                    border-color: #14b8a6;
                    box-shadow: 0 0 0 3px rgba(20,184,166,0.1);
                }

                .pill-input {
                    width: 100%;
                    border: none;
                    padding: 10px 12px;
                    padding-right: 32px;
                    border-radius: 6px;
                    outline: none;
                    color: #333;
                    font-size: 0.95rem;
                }

                .pill-icon {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                    pointer-events: none;
                    font-size: 1.1rem;
                }

                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}