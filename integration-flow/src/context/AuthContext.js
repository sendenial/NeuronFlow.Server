import React, { createContext, useContext, useState, } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem('token'));

  const loginAction = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken); // This triggers the re-render!
  };

  const logoutAction = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, loginAction, logoutAction }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);