import API from './api';

const driverService = {
    // Get all drivers
    getAll: async () => {
        try {
            const response = await API.get('/drivers');
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to fetch drivers' };
        }
    },

    // Create new driver
    create: async (driverData) => {
        try {
            const response = await API.post('/drivers', driverData);
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to create driver' };
        }
    },

    // Check license validity
    checkLicense: async (id) => {
        try {
            const response = await API.get(`/drivers/${id}/license-valid`);
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to check license' };
        }
    },

    // Update driver status
    updateStatus: async (id, status) => {
        try {
            const response = await API.put(`/drivers/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to update status' };
        }
    },

    // Delete driver
    delete: async (id) => {
        try {
            const response = await API.delete(`/drivers/${id}`);
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to delete driver' };
        }
    }
};

export default driverService;