import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // REMOVED 'BrowserRouter'

import Dashboard from './components/Dashboard'; 
import Login from './components/Login';

import ProjectList from './components/ProjectList';
import ProjectDetails from './components/ProjectDetails';
import Connections from './components/Connections';
import RecipeSetup from './components/RecipeSetup';
import RecipeBuilder from './components/RecipeBuilder';

function App() {
  const isAuthenticated = !!localStorage.getItem('token'); 

  return (
    // REMOVED <Router> tag here. The parent index.js likely handles it.
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard/projects" />} />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}>
        
        {/* Default to projects when going to /dashboard */}
        <Route index element={<Navigate to="projects" />} />
        
        <Route path="projects" element={<ProjectList />} />
        <Route path="project/:projectId" element={<ProjectDetails />} />
        <Route path="connections" element={<Connections />} />
        
        {/* Recipe Routes */}
        <Route path="recipe/new" element={<RecipeSetup />} />
      </Route>

      {/* Full Screen Builder Route (Outside Dashboard Layout) */}
      <Route 
          path="/dashboard/recipe/:recipeId/builder" 
          element={isAuthenticated ? <RecipeBuilder /> : <Navigate to="/login" />} 
      />

    </Routes>
  );
}

export default App;