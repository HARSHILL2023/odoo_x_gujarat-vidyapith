import axios from 'axios';

// Base API configuration
const API = axios.create({
    baseURL: 'http://localhost:5000/api', // Your backend URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if it exists
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default API;