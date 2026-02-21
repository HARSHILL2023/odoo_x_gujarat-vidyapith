const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI is missing');
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB:', mongoose.connection.name);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
    }
}

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));

module.exports = connectDB;
