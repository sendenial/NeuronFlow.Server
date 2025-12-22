import axios from 'axios';

// 1. Set the Base URL to your .NET Server API
const API_URL = 'https://localhost:7186/api'; // Check your launchSettings.json for the port (7186, 5000, etc.)

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Add Request Interceptor to attach Token automatically
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Fix the Login Function to match the route "api/Auth/login"
export const login = async (email, password) => {
    // The backend expects { email, password } based on LoginRequest.cs
    const response = await api.post('/auth/login', { email, password });
    return response.data;
};

// FTP Connections
export const ftpApi = {
  getConnections: () => api.get('/connections').catch(() => ({ data: [] })),
  createConnection: (data) => api.post('/connections', data),
};

// CSV Processing
export const csvApi = {
  uploadAndParse: (file, config, connectionId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('connectionId', connectionId);
    formData.append('separator', config.separator);
    formData.append('hasHeader', config.hasHeader.toString());
    return api.post('/csv/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  createFromData: (data) => api.post('/flows/create-from-csv', data),
};

// Flow Management
export const flowApi = {
  saveFlow: (flow) => api.post('/flows/save', flow),
  testFlow: (flow) => api.post('/flows/test', flow),
};


export default api;