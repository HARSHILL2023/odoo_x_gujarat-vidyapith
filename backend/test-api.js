const axios = require('axios');

async function testAPI() {
    try {
        // Test root
        const test = await axios.get('http://localhost:5000/api/test');
        console.log('✅ Test endpoint:', test.data);
        
        // Test vehicles
        const vehicles = await axios.get('http://localhost:5000/api/vehicles');
        console.log('✅ Vehicles:', vehicles.data.length, 'found');
        
        // Test login
        const login = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'manager@fleetflow.com',
            password: 'password'
        });
        console.log('✅ Login:', login.data.success ? 'Success' : 'Failed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();