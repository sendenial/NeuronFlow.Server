import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList'; // NEW
import ProjectDetails from './components/ProjectDetails'; // NEW
import Connections from './components/Connections';
import WorkflowBuilder from './WorkflowBuilder';

const PrivateRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}>
        {/* Shows the Grid of Project Cards */}
        <Route path="projects" element={<ProjectList />} />
        
        {/* Shows the Specific Project Details (Assets List) */}
        <Route path="project/:projectId" element={<ProjectDetails />} />
        
        <Route path="connections" element={<Connections />} />
        <Route path="builder" element={<WorkflowBuilder />} />
        
        {/* Default to projects list */}
        <Route path="" element={<Navigate to="projects" />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;