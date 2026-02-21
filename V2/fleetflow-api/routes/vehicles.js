const express = require('express');
const Vehicle = require('../models/Vehicle');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// GET /api/vehicles?status=&type=&region=
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.type) filter.type = req.query.type;
        if (req.query.region) filter.region = { $regex: req.query.region, $options: 'i' };
        const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vehicles.' });
    }
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vehicle.' });
    }
});

// POST /api/vehicles — fleet_manager only
router.post('/', requireRole('fleet_manager'), async (req, res) => {
    try {
        const vehicle = await Vehicle.create(req.body);
        res.status(201).json(vehicle);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'License plate already exists.' });
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Failed to create vehicle.' });
    }
});

// PATCH /api/vehicles/:id — fleet_manager only
router.patch('/:id', requireRole('fleet_manager'), async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
        res.json(vehicle);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'License plate already exists.' });
        res.status(500).json({ error: 'Failed to update vehicle.' });
    }
});

// DELETE /api/vehicles/:id — soft-delete (retired)
router.delete('/:id', requireRole('fleet_manager'), async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { status: 'retired' },
            { new: true }
        );
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
        res.json({ message: 'Vehicle marked as retired.', vehicle });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retire vehicle.' });
    }
});

module.exports = router;
