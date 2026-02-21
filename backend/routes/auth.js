const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && user.password === password) {
            res.json({
                success: true,
                user: {
                    id: user._id,
                    name: user.name,
                    role: user.role,
                    email: user.email
                },
                token: 'demo-token-' + user._id // Simple token for demo
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;