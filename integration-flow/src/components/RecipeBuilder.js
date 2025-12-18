import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Badge, Nav, Modal } from 'react-bootstrap';
import api from '../services/api';

// --- CONFIG: ACTION TYPES ---
const ACTION_TYPES = [
    { id: 'action', label: 'Action in app', icon: '⚡', color: '#e3f2fd', textColor: '#0d47a1' },
    { id: 'function', label: 'Recipe function', icon: 'fx', color: '#e0f2f1', textColor: '#00695c' },
    { id: 'if', label: 'IF condition', icon: '🔀', color: '#fff8e1', textColor: '#ff6f00' },
    { id: 'foreach', label: 'Repeat for each', icon: '🔁', color: '#f3e5f5', textColor: '#7b1fa2' },
    { id: 'while', label: 'Repeat while', icon: '🔄', color: '#f3e5f5', textColor: '#7b1fa2' },
    { id: 'stop', label: 'Stop job', icon: '🛑', color: '#ffebee', textColor: '#c62828' },
    { id: 'error', label: 'Handle errors', icon: '👁️', color: '#fff3e0', textColor: '#e65100' }
];

export default function RecipeBuilder() {
    const { recipeId } = useParams();
    const [recipe, setRecipe] = useState(null);
    
    // UI State
    const [activeStepId, setActiveStepId] = useState('trigger'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // STATE: Tracks which "+" button was clicked (the index in the array)
    // If null, no menu is open. If set to a number (e.g., 0), the menu shows after step 0.
    const [addingAtIndex, setAddingAtIndex] = useState(null); 

    // Flow Data
    const [steps, setSteps] = useState([
        { id: 'trigger', type: 'trigger', name: 'New Record in Salesforce', icon: '☁️', valid: true }
    ]);

    useEffect(() => {
        // Mock load
        api.get(`/recipes/${recipeId}`).then(res => setRecipe(res.data)).catch(() => {});
        // In real app: setSteps(JSON.parse(res.data.definitionJson).steps)
    }, [recipeId]);

    // --- HANDLERS ---

    const handleAddStep = (typeObj) => {
        const newStep = {
            id: `step_${Date.now()}`, // Unique ID
            type: typeObj.id,
            name: typeObj.id === 'action' ? 'Select an app and action' : typeObj.label,
            icon: typeObj.icon,
            valid: false
        };

        // Insert the new step at the correct position
        const newSteps = [...steps];
        // addingAtIndex is the index of the step *before* the plus button. 
        // So we splice at index + 1.
        newSteps.splice(addingAtIndex + 1, 0, newStep);
        
        setSteps(newSteps);
        setAddingAtIndex(null); // Close menu
        setActiveStepId(newStep.id); // Focus new step
        setIsSidebarOpen(true); // Open config sidebar
    };

    // --- RENDERERS ---

    const renderActionMenu = () => (
        <Card className="shadow-sm border-0 p-2 mt-2" style={{width: '650px', maxWidth: '90%'}}>
            <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                <small className="text-muted fw-bold">CHOOSE A STEP</small>
                <button 
                    type="button" 
                    className="btn-close" 
                    aria-label="Close" 
                    onClick={() => setAddingAtIndex(null)}
                ></button>
            </div>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
                {ACTION_TYPES.map(type => (
                    <div 
                        key={type.id}
                        className="d-flex flex-column align-items-center justify-content-center p-2 border rounded action-option"
                        style={{width: '100px', height: '100px', cursor: 'pointer', backgroundColor: 'white'}}
                        onClick={() => handleAddStep(type)}
                    >
                        <div 
                            className="mb-2 d-flex align-items-center justify-content-center rounded"
                            style={{width: '40px', height: '40px', backgroundColor: type.color, color: type.textColor, fontSize: '1.2rem'}}
                        >
                            {type.icon}
                        </div>
                        <div className="small text-center fw-bold text-muted" style={{fontSize: '0.75rem', lineHeight: '1.1'}}>
                            {type.label}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );

    const renderFlow = () => (
        <div className="d-flex flex-column align-items-center py-5" style={{minHeight: '100%'}}>
            
            {/* 1. Render Existing Steps */}
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    {/* Connection Line (Top) */}
                    {index > 0 && <div className="vertical-line"></div>}
                    
                    {/* Step Card */}
                    <Card 
                        className={`p-3 shadow-sm mb-0 step-card ${activeStepId === step.id ? 'active-step' : ''}`}
                        onClick={() => { setActiveStepId(step.id); setIsSidebarOpen(true); }}
                    >
                        <div className="d-flex align-items-center">
                            <div className="me-3 fs-3 icon-box">{step.icon}</div>
                            <div>
                                <div className="step-type-label">{step.type === 'trigger' ? 'TRIGGER' : 'ACTION'}</div>
                                <div className="fw-bold">{step.name}</div>
                            </div>
                        </div>
                    </Card>

                    {/* 2. Render Add Button OR Menu below this step */}
                    <div className="vertical-line"></div>
                    
                    {addingAtIndex === index ? (
                        // SHOW MENU
                        renderActionMenu()
                    ) : (
                        // SHOW PLUS BUTTON
                        <Button 
                            variant="outline-secondary" 
                            className="add-btn"
                            onClick={() => setAddingAtIndex(index)} // Open menu for this specific slot
                        >
                            +
                        </Button>
                    )}
                </React.Fragment>
            ))}
            
            {/* End of flow spacer */}
            <div style={{height: '100px'}}></div>
        </div>
    );

    // --- SIDEBAR (Right) ---
    const renderSidebar = () => {
        if(!activeStepId) return <div className="p-5 text-center text-muted">Select a step to configure</div>;
        
        // Find the active step object
        const activeStep = steps.find(s => s.id === activeStepId) || {};

        return (
            <div className="d-flex flex-column h-100 bg-white border-start">
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                    <div className="d-flex align-items-center">
                        <div className="me-2 fs-4">{activeStep.icon}</div>
                        <h6 className="m-0 fw-bold">Configure {activeStep.type}</h6>
                    </div>
                    <Button variant="close" onClick={() => setIsSidebarOpen(false)}></Button>
                </div>
                
                <div className="p-4">
                    {activeStep.type === 'action' ? (
                        <div className="alert alert-info">Here you will select the App (HTTP, SQL, etc.)</div>
                    ) : (
                        <div className="text-muted">Configuration for <strong>{activeStep.name}</strong> goes here.</div>
                    )}
                </div>
            </div>
        );
    };

    if(!recipe) return <div className="p-5">Loading...</div>;

    return (
        <div className="d-flex flex-column h-100" style={{background: '#f4f6f8'}}>
            {/* Header */}
            <div className="bg-dark text-white px-4 py-2 d-flex justify-content-between align-items-center shadow-sm" style={{zIndex: 10}}>
                <div className="d-flex align-items-center">
                     <Button variant="link" className="text-white p-0 me-3 text-decoration-none fs-5">←</Button>
                     <span className="fw-bold">{recipe.name}</span>
                     <Badge bg="secondary" className="ms-2">Draft</Badge>
                </div>
                <div>
                    <Button variant="outline-light" size="sm" className="me-2">Test Jobs</Button>
                    <Button variant="primary" size="sm" style={{backgroundColor: '#00796b', border: 'none'}}>Save</Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="d-flex flex-grow-1 overflow-hidden">
                {/* Canvas */}
                <div className="flex-grow-1 overflow-auto position-relative custom-scrollbar">
                    {renderFlow()}
                </div>

                {/* Sidebar */}
                {isSidebarOpen && (
                    <div style={{width: '400px', transition: 'width 0.3s'}} className="shadow-lg">
                        {renderSidebar()}
                    </div>
                )}
            </div>
            
            <style>{`
                .vertical-line { width: 2px; height: 30px; background: #ddd; }
                .step-card { width: 450px; cursor: pointer; border: 1px solid #e0e0e0; transition: all 0.2s; border-radius: 8px; }
                .step-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05)!important; }
                .active-step { border: 2px solid #00796b !important; background-color: #f0fdfc; }
                
                .step-type-label { font-size: 0.7rem; font-weight: bold; color: #888; letter-spacing: 0.5px; }
                
                .add-btn { 
                    width: 36px; height: 36px; 
                    border-radius: 50%; 
                    font-weight: bold; 
                    display: flex; align-items: center; justify-content: center;
                    background-color: white; border: 1px solid #ccc; color: #666;
                    transition: all 0.2s;
                }
                .add-btn:hover { background-color: #00796b; color: white; border-color: #00796b; transform: scale(1.1); }

                /* Action Menu Items */
                .action-option { transition: all 0.2s; border: 1px solid transparent; }
                .action-option:hover { background-color: #f8f9fa !important; border-color: #dee2e6; transform: translateY(-2px); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            `}</style>
        </div>
    );
}