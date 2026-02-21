const express = require('express');
const router = express.Router();
const FuelLog = require('../models/FuelLog');

// GET all fuel logs
router.get('/', async (req, res) => {
    try {
        const logs = await FuelLog.find()
            .populate('vehicle_id')
            .sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new fuel log
router.post('/', async (req, res) => {
    try {
        const log = new FuelLog(req.body);
        await log.save();
        res.status(201).json(log);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
