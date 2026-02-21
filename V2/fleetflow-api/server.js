require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/connect');

const app = express();

// ─── Connect to MongoDB ─────────────────────────────────────
connectDB();

// ─── Middleware ─────────────────────────────────────────────
const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Check if origin is in our whitelist or is a vercel.app subdomain
        const isAllowed = allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
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
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({ message: 'FleetFlow API is running!', health: '/health' });
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', db: 'mongodb', timestamp: new Date().toISOString() });
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
    res.status(500).json({ error: 'Internal server error.' });
});

// ─── Export/Start Server ──────────────────────────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚚 FleetFlow API running on http://localhost:${PORT}`);
    });
}

module.exports = app;
