const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const tripRoutes = require('./routes/trips');
const maintenanceRoutes = require('./routes/maintenance');
const fuelRoutes = require('./routes/fuel');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// CORS configuration - allowing local dev and prepared for production
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleetflow';

console.log('📡 Attempting to connect to MongoDB...');
// Log sanitized URI (hide password)
const sanitizedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
console.log(`🔌 Connection String: ${sanitizedUri}`);

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
})
    .then(() => console.log('✅ Connected to MongoDB successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error detail:');
        console.error(err.message);
        if (err.name === 'MongooseServerSelectionError') {
            console.error('👉 Tip: Check your IP Whitelist in MongoDB Atlas and your password in Render.');
        }
    });

app.get('/', (req, res) => {
    res.send('FleetFlow Backend API is LIVE! Access endpoints via /api');
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'FleetFlow backend is working!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('\n📌 Available endpoints:');
    console.log('   GET  /api/test');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/vehicles');
    console.log('   POST /api/vehicles');
    console.log('   GET  /api/drivers');
    console.log('   POST /api/drivers');
    console.log('   GET  /api/trips');
    console.log('   POST /api/trips');
    console.log('   GET  /api/maintenance');
    console.log('   POST /api/maintenance');
    console.log('   GET  /api/dashboard\n');
});