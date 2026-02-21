const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB:', mongoose.connection.name);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
}

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));

module.exports = connectDB;
