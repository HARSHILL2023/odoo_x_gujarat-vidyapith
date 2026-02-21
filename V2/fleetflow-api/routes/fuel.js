const express = require('express');
const FuelLog = require('../models/FuelLog');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// GET /api/fuel-logs?vehicle=&trip=
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.vehicle) filter.vehicle = req.query.vehicle;
        if (req.query.trip) filter.trip = req.query.trip;
        const logs = await FuelLog.find(filter)
            .populate('vehicle', 'name license_plate')
            .populate('trip', 'reference')
            .sort({ date: -1 });
        res.json(logs); // cost_per_liter virtual is included via toJSON
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch fuel logs.' });
    }
});

// POST /api/fuel-logs
router.post('/', requireRole('fleet_manager', 'dispatcher'), async (req, res) => {
    try {
        const log = await FuelLog.create(req.body);
        await log.populate('vehicle', 'name');
        res.status(201).json(log);
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Failed to create fuel log.' });
    }
});

// DELETE /api/fuel-logs/:id
router.delete('/:id', requireRole('fleet_manager'), async (req, res) => {
    try {
        const log = await FuelLog.findByIdAndDelete(req.params.id);
        if (!log) return res.status(404).json({ error: 'Fuel log not found.' });
        res.json({ message: 'Fuel log deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete fuel log.' });
    }
});

module.exports = router;
