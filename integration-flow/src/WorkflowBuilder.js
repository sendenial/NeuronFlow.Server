import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState 
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode'; // Import Custom Node
import PropertyPanel from './PropertyPanel'; // Import Panel
import axios from 'axios';

// Register the custom node type
const nodeTypes = {
  custom: CustomNode,
};

const initialNodes = [
  { 
    id: '1', 
    type: 'custom', 
    data: { label: 'New Webhook', subLabel: 'TRIGGER', type: 'trigger', config: {} }, 
    position: { x: 250, y: 50 } 
  },
];

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // 1. Open Panel on Node Click
  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  // 2. Update Node State when Property Panel Saves
  const updateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // Create a new object to ensure React detects the change
          return { ...node, data: { ...newData } };
        }
        return node;
      })
    );
  };

  // 3. Add New Node
  const addNode = () => {
    const id = (nodes.length + 1).toString();
    const newNode = {
      id,
      type: 'custom',
      data: { label: 'New HTTP Action', subLabel: 'ACTION', type: 'action', config: { url: '', method: 'GET' } },
      position: { x: Math.random() * 400 + 50, y: Math.random() * 400 + 50 },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // 4. Save to Backend (Updated to handle config)
  const saveWorkflow = async () => {
      const steps = nodes.map((node, index) => ({
          Id: 0,
          WorkflowId: 1,
          Type: node.data.type === 'trigger' ? 'Trigger' : 'HttpAction',
          // We now serialize the actual config from the Property Panel
          Configuration: JSON.stringify(node.data.config), 
          OrderIndex: index
      }));

      const payload = {
          Id: 1,
          Name: "My Professional Workflow",
          IsActive: true,
          GraphJson: JSON.stringify({ nodes, edges }), 
          Steps: steps 
      };

      try {
          await axios.post('http://localhost:5000/api/workflow/save', payload);
          alert('Workflow Saved Successfully!');
      } catch (error) {
          console.error(error);
          alert('Failed to save');
      }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Toolbar */}
      <div style={{ padding: '15px', background: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, marginRight: '20px' }}>Workato Clone</h3>
        <button onClick={addNode} style={btnStyle}>+ Add Step</button>
        <button onClick={saveWorkflow} style={{...btnStyle, background: '#4CAF50'}}>Save</button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes} 
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick} 
          fitView
        >
          <Background color="#aaa" gap={16} />
          <Controls />
        </ReactFlow>

        {/* Render Property Panel if a node is selected */}
        {selectedNode && (
          <PropertyPanel 
            selectedNode={selectedNode} 
            updateNodeData={updateNodeData} 
            closePanel={() => setSelectedNode(null)}
          />
        )}
      </div>  
    </div>
  );
}

const btnStyle = { padding: '8px 16px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };