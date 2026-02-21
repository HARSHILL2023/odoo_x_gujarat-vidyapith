import API from './api';

const tripService = {
    getAll: async () => {
        try {
            const response = await API.get('/trips');
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to fetch trips' };
        }
    },

    create: async (tripData) => {
        try {
            const response = await API.post('/trips', tripData);
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to create trip' };
        }
    },

    complete: async (id, odometer_end) => {
        try {
            const response = await API.put(`/trips/${id}/complete`, { odometer_end });
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to complete trip' };
        }
    },

    cancel: async (id) => {
        try {
            const response = await API.put(`/trips/${id}/cancel`, {});
            return response.data;
        } catch (error) {
            console.error('API Error:', error.response || error);
            throw error.response?.data || { message: 'Failed to cancel trip' };
        }
    }
};

export default tripService;