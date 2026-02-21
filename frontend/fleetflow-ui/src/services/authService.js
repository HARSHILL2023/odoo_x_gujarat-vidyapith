import API from './api';

const authService = {
    // Register user
    register: async (userData) => {
        try {
            const response = await API.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            console.error('Registration error:', error.response || error);
            throw error.response?.data || { message: 'Registration failed' };
        }
    },

    // Login user
    login: async (email, password) => {
        try {
            const response = await API.post('/auth/login', { email, password });
            if (response.data.success) {
                // Store user data and token
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('token', response.data.token);
            }
            return response.data;
        } catch (error) {
            console.error('Login error:', error.response || error);
            throw error.response?.data || { message: 'Login failed' };
        }
    },

    // Logout user
    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    },

    // Get current user
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Check if user is logged in
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};

export default authService;