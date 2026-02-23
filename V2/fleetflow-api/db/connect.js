const mongoose = require('mongoose');

// ─── Connection Cache (critical for Vercel serverless) ───────
let cached = global._mongoConn || (global._mongoConn = { conn: null, promise: null });

async function connectDB() {
    // Return existing connection if available
    if (cached.conn) {
        return cached.conn;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('❌ MONGODB_URI is missing from environment variables');
    }

    // Reuse in-progress connection promise
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI, {
            bufferCommands: false,          // ✅ Prevents 10000ms timeout error
            serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB unreachable
            connectTimeoutMS: 10000,
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log('✅ Connected to MongoDB:', mongoose.connection.name);
    } catch (err) {
        cached.promise = null; // ✅ Reset so next request retries fresh
        console.error('❌ MongoDB connection error:', err.message);
        throw err;
    }

    return cached.conn;
}

// ─── Connection Events ───────────────────────────────────────
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — resetting cache');
    cached.conn = null;    // ✅ Force reconnect on next request
    cached.promise = null;
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
    cached.conn = null;    // ✅ Force reconnect on next request
    cached.promise = null;
});

module.exports = connectDB;
