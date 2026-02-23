const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const VALID_ROLES = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];
    const userRole = VALID_ROLES.includes(role) ? role : 'dispatcher';

    try {
        const exists = await User.findOne({ email: email.toLowerCase().trim() });
        if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });

        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email: email.toLowerCase().trim(), password_hash, role: userRole });

        const payload = { id: user._id, name: user.name, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.status(201).json({ token, user: payload });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// POST /api/auth/login

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });

    try {
        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET is not defined');
            return res.status(500).json({ error: 'Server configuration error (JWT).' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

        const payload = { id: user._id, name: user.name, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        console.log(`✅ Login successful: ${email}`);
        res.json({ token, user: payload });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: `Server error during login: ${err.message}` });
    }
});

// POST /api/auth/logout (stateless — client drops token)
router.post('/logout', (_req, res) => {
    res.json({ message: 'Logged out. Please discard your token on the client.' });
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password_hash');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
