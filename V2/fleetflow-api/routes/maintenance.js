const express = require('express');
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// GET /api/maintenance?state=&vehicle=
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.state)   filter.state   = req.query.state;
        if (req.query.vehicle) filter.vehicle = req.query.vehicle;
        const records = await Maintenance.find(filter)
            .populate('vehicle', 'name license_plate')
            .sort({ createdAt: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maintenance records.' });
    }
});

// POST /api/maintenance — auto sets vehicle → in_shop
router.post('/', requireRole('fleet_manager'), async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.body.vehicle);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

        const record = await Maintenance.create(req.body);  // ✅ no session, no array wrap
        await Vehicle.findByIdAndUpdate(vehicle._id, { status: 'in_shop' });

        await record.populate('vehicle', 'name license_plate');
        res.status(201).json(record);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        console.error('POST /maintenance error:', err);
        res.status(500).json({ error: 'Failed to create maintenance record.' });
    }
});

// PATCH /api/maintenance/:id (e.g. scheduled → in_progress)
router.patch('/:id', requireRole('fleet_manager'), async (req, res) => {
    try {
        const record = await Maintenance.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        ).populate('vehicle', 'name');
        if (!record) return res.status(404).json({ error: 'Record not found.' });
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update maintenance record.' });
    }
});

// POST /api/maintenance/:id/complete — smart revert vehicle status
router.post('/:id/complete', requireRole('fleet_manager'), async (req, res) => {
    try {
        const record = await Maintenance.findById(req.params.id);
        if (!record) return res.status(404).json({ error: 'Maintenance record not found.' });
        if (record.state === 'done') return res.status(409).json({ error: 'Already marked as done.' });

        record.state = 'done';
        await record.save();

        // ✅ Smart revert: only set available if NO other open records for this vehicle
        const openCount = await Maintenance.countDocuments({
            vehicle: record.vehicle,
            state:   { $ne: 'done' },
            _id:     { $ne: record._id },
        });

        if (openCount === 0) {
            await Vehicle.findByIdAndUpdate(record.vehicle, { status: 'available' });
        }

        await record.populate('vehicle', 'name');
        res.json(record);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('POST /maintenance/:id/complete error:', err);
        res.status(500).json({ error: 'Failed to complete maintenance.' });
    }
});

module.exports = router;
