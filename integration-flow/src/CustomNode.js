import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Styles mimicking a Workato/integration card
const nodeStyle = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '10px',
  minWidth: '200px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
};

const iconStyle = {
  width: '32px',
  height: '32px',
  background: '#e3f2fd',
  color: '#1565c0',
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontWeight: 'bold',
  fontSize: '14px',
};

// Memo helps performance so it doesn't re-render constantly
export default memo(({ data, isConnectable }) => {
  return (
    <div style={nodeStyle}>
      {/* Input Handle (Target) - where lines come IN */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      {/* Node Content */}
      <div style={iconStyle}>
        {data.type === 'trigger' ? '⚡' : '⚙️'}
      </div>
      <div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>
          {data.subLabel || 'Action'}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
          {data.label}
        </div>
      </div>

      {/* Output Handle (Source) - where lines go OUT */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
});