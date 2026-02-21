const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());          
app.use(express.json());   

const MONGODB_URI = 'mongodb://localhost:27017/fleetflow';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

app.get('/api/test', (req, res) => {
    res.json({ message: 'FleetFlow backend is working!' });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});