require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/connect');

const app = express();

// ─── Middleware ─────────────────────────────────────────────
const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isAllowed =
            allowedOrigins.includes(origin) ||
            /\.vercel\.app$/.test(origin) ||
            /^http:\/\/localhost:\d+$/.test(origin);

        if (isAllowed) {
            callback(null, true);
        } else {
            console.error('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors()); // ✅ Handle preflight for ALL routes

app.use(express.json());

// ─── DB Middleware (per-request connection for serverless) ───
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('DB connection failed:', err);
        return res.status(503).json({ error: 'Database unavailable. Please try again.' });
    }
});

// ─── Health Check ───────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({ message: 'FleetFlow API is running!', health: '/health' });
});

app.get('/health', (_req, res) => {
    const mongoStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][require('mongoose').connection.readyState];
    res.json({
        status: 'ok',
        db: mongoStatus,
        timestamp: new Date().toISOString()
    });
});

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/fuel-logs', require('./routes/fuel'));
app.use('/api/analytics', require('./routes/analytics'));

// ─── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// ─── Global Error Handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error.',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ─── Start Server ───────────────────────────────────────────
async function startServer() {
    try {
        await connectDB();

        if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
            const PORT = process.env.PORT || 4000;
            app.listen(PORT, () => {
                console.log(`🚚 FleetFlow API running on http://localhost:${PORT}`);
            });
        }
    } catch (err) {
        console.error('❌ Failed to connect to DB on startup:', err.message);
        // ✅ No process.exit(1) — app stays alive, DB middleware handles retries
    }
}

startServer();

module.exports = app;
