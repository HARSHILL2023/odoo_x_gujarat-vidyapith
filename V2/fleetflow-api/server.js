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
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);

        // More robust check for allowed origins
        const isAllowed = allowedOrigins.includes(origin) ||
            /\.vercel\.app$/.test(origin) ||          // Matches any vercel.app subdomain
            /^http:\/\/localhost:\d+$/.test(origin); // Matches localhost with any port

        if (isAllowed) {
            callback(null, true);
        } else {
            console.error('CORS blocked origin:', origin);
            // Instead of error, we can technically callback(null, false) 
            // but the library behavior is safer with callback(null, true) 
            // if we want to debug, or we can just allow it if it's a known pattern.
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

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
    res.status(500).json({ error: 'Internal server error.' });
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
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

module.exports = app;
