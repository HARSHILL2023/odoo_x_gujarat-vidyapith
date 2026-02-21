import API from './api';

const fuelService = {
    getAll: async () => {
        try {
            const response = await API.get('/fuel');
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to fetch fuel logs' };
        }
    },

    create: async (data) => {
        try {
            const response = await API.post('/fuel', data);
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to create fuel log' };
        }
    }
};

export default fuelService;