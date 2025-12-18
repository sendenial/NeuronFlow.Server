import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const { logoutAction } = useAuth();

  const handleLogout = () => {
    logoutAction();
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column vh-100">
      {/* Top Navbar */}
      <Navbar bg="dark" variant="dark" className="px-3">
        <Navbar.Brand href="#home">NeuronFlow</Navbar.Brand>
        <Nav className="ms-auto">
          <span className="text-white me-3 mt-2">Welcome, {user?.fullName}</span>
          <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
        </Nav>
      </Navbar>

      <div className="d-flex flex-grow-1">
        {/* Sidebar */}
        <div className="bg-light border-end" style={{ width: '250px', minHeight: '100%' }}>
          <div className="p-3">
            <Nav className="flex-column nav-pills">

              <NavLink to="/dashboard/projects" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active' : 'link-dark'}`}>
                📊 Projects
              </NavLink>

              <NavLink to="/dashboard/connections" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active' : 'link-dark'}`}>
                🔌 Connections
              </NavLink>
              
            </Nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow-1 bg-light">
          <Outlet />
        </div>
      </div>
    </div>
  );
}