import React, { useState, useEffect } from 'react';

export default function PropertyPanel({ selectedNode, updateNodeData, closePanel }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');

  // Load data from the selected node into the form
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setUrl(selectedNode.data.config?.url || '');
      setMethod(selectedNode.data.config?.method || 'GET');
    }
  }, [selectedNode]);

  const handleSave = () => {
    // Pass updated data back to the parent WorkflowBuilder
    updateNodeData(selectedNode.id, {
      ...selectedNode.data,
      label: label,
      config: { 
          ...selectedNode.data.config, 
          url: url,
          method: method
      }
    });
  };

  if (!selectedNode) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3>Configure Step</h3>
        <button onClick={closePanel} style={closeBtnStyle}>✕</button>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>Step Name</label>
        <input 
          style={inputStyle}
          value={label} 
          onChange={(e) => setLabel(e.target.value)} 
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>HTTP Method</label>
        <select 
          style={inputStyle} 
          value={method} 
          onChange={(e) => setMethod(e.target.value)}
        >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>API Endpoint URL</label>
        <input 
          style={inputStyle}
          placeholder="https://api.example.com/users"
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
        />
      </div>

      <button onClick={handleSave} style={saveBtnStyle}>Save Configuration</button>
    </div>
  );
}

// Styles
const panelStyle = {
  position: 'absolute', right: 0, top: 0, bottom: 0, width: '320px',
  background: 'white', borderLeft: '1px solid #ccc', padding: '20px', zIndex: 10,
  boxShadow: '-2px 0 10px rgba(0,0,0,0.05)'
};
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#555' };
const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
const saveBtnStyle = { width: '100%', padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' };