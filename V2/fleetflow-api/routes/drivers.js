const express = require('express');
const Driver = require('../models/Driver');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// GET /api/drivers?status=
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        const drivers = await Driver.find(filter).sort({ createdAt: -1 });
        res.json(drivers); // is_license_expired virtual is auto-included via toJSON
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch drivers.' });
    }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });
        res.json(driver);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch driver.' });
    }
});

// POST /api/drivers
router.post('/', requireRole('fleet_manager', 'safety_officer'), async (req, res) => {
    try {
        const driver = await Driver.create(req.body);
        res.status(201).json(driver);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'License number already exists.' });
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Failed to create driver.' });
    }
});

// PATCH /api/drivers/:id
router.patch('/:id', requireRole('fleet_manager', 'safety_officer'), async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });
        res.json(driver);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'License number already exists.' });
        res.status(500).json({ error: 'Failed to update driver.' });
    }
});

// DELETE /api/drivers/:id
router.delete('/:id', requireRole('fleet_manager'), async (req, res) => {
    try {
        const driver = await Driver.findByIdAndDelete(req.params.id);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });
        res.json({ message: 'Driver deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete driver.' });
    }
});

module.exports = router;
