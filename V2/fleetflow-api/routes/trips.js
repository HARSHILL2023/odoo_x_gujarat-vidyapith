const express = require('express');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// GET /api/trips?state=&vehicle=&driver=
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.state) filter.state = req.query.state;
        if (req.query.vehicle) filter.vehicle = req.query.vehicle;
        if (req.query.driver) filter.driver = req.query.driver;
        const trips = await Trip.find(filter)
            .populate('vehicle', 'name license_plate')
            .populate('driver', 'name')
            .sort({ createdAt: -1 });
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trips.' });
    }
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('vehicle', 'name license_plate max_capacity')
            .populate('driver', 'name license_category');
        if (!trip) return res.status(404).json({ error: 'Trip not found.' });
        res.json(trip);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trip.' });
    }
});

// POST /api/trips — with full business logic validation
router.post('/', requireRole('fleet_manager', 'dispatcher'), async (req, res) => {
    const { vehicle: vehicleId, driver: driverId, origin, destination, cargo_weight, date_start, odometer_start } = req.body;

    if (!vehicleId || !driverId || !origin || !destination || cargo_weight == null)
        return res.status(400).json({ error: 'vehicle, driver, origin, destination, cargo_weight are required.' });

    try {
        const [vehicle, driver] = await Promise.all([
            Vehicle.findById(vehicleId),
            Driver.findById(driverId),
        ]);

        if (!vehicle) throw { status: 404, message: 'Vehicle not found.' };
        if (!driver)  throw { status: 404, message: 'Driver not found.' };

        // 1. Vehicle availability
        if (vehicle.status !== 'available')
            throw { status: 409, message: `Vehicle is not available. Status: ${vehicle.status}` };

        // 2. Cargo weight
        if (parseFloat(cargo_weight) > vehicle.max_capacity)
            throw { status: 422, message: `Cargo (${cargo_weight} kg) exceeds vehicle capacity (${vehicle.max_capacity} kg).` };

        // 3. Driver checks
        if (driver.status === 'suspended') throw { status: 409, message: 'Driver is suspended.' };
        if (driver.status === 'on_duty')   throw { status: 409, message: 'Driver is already on duty.' };
        if (driver.license_expiry < new Date())
            throw { status: 409, message: `Driver license expired on ${driver.license_expiry.toDateString()}.` };

        // 4. License category match
        if (driver.license_category !== vehicle.type)
            throw { status: 422, message: `Driver license (${driver.license_category}) doesn't match vehicle type (${vehicle.type}).` };

        // Create trip (pre-save hook generates reference)
        const trip = await Trip.create({
            vehicle: vehicleId,
            driver: driverId,
            origin,
            destination,
            cargo_weight,
            date_start: date_start || null,
            odometer_start: odometer_start || null,
        });

        await trip.populate(['vehicle', 'driver']);
        res.status(201).json(trip);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: 'Failed to create trip.' });
    }
});

// POST /api/trips/:id/dispatch — Draft → Dispatched
router.post('/:id/dispatch', requireRole('fleet_manager', 'dispatcher'), async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) throw { status: 404, message: 'Trip not found.' };
        if (trip.state !== 'draft') throw { status: 409, message: `Cannot dispatch a trip in state: ${trip.state}` };

        trip.state = 'dispatched';
        trip.date_start = trip.date_start || new Date();
        await trip.save();

        await Promise.all([
            Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'on_trip' }),
            Driver.findByIdAndUpdate(trip.driver,   { status: 'on_duty' }),
        ]);

        await trip.populate(['vehicle', 'driver']);
        res.json(trip);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        res.status(500).json({ error: 'Failed to dispatch trip.' });
    }
});

// POST /api/trips/:id/complete — Dispatched → Completed
router.post('/:id/complete', requireRole('fleet_manager', 'dispatcher'), async (req, res) => {
    const { odometer_end } = req.body;
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) throw { status: 404, message: 'Trip not found.' };
        if (trip.state !== 'dispatched') throw { status: 409, message: `Cannot complete a trip in state: ${trip.state}` };

        trip.state = 'completed';
        trip.date_end = new Date();
        trip.odometer_end = odometer_end || trip.odometer_end;
        await trip.save();

        const vehicleUpdate = { status: 'available' };
        if (odometer_end) vehicleUpdate.odometer = odometer_end;

        await Promise.all([
            Vehicle.findByIdAndUpdate(trip.vehicle, vehicleUpdate),
            Driver.findByIdAndUpdate(trip.driver, { status: 'off_duty', $inc: { trips_completed: 1 } }),
        ]);

        await trip.populate(['vehicle', 'driver']);
        res.json(trip);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        res.status(500).json({ error: 'Failed to complete trip.' });
    }
});

// POST /api/trips/:id/cancel — Draft or Dispatched → Cancelled
router.post('/:id/cancel', requireRole('fleet_manager', 'dispatcher'), async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) throw { status: 404, message: 'Trip not found.' };
        if (!['draft', 'dispatched'].includes(trip.state))
            throw { status: 409, message: `Cannot cancel a trip in state: ${trip.state}` };

        // ✅ Save BEFORE changing state — original logic preserved
        const wasDispatched = trip.state === 'dispatched' || req.body._prevState === 'dispatched';

        trip.state = 'cancelled';
        trip.date_end = new Date();
        await trip.save();

        // Only revert statuses if trip was dispatched
        if (wasDispatched) {
            await Promise.all([
                Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' }),
                Driver.findByIdAndUpdate(trip.driver,   { status: 'off_duty' }),
            ]);
        }

        await trip.populate(['vehicle', 'driver']);
        res.json(trip);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        res.status(500).json({ error: 'Failed to cancel trip.' });
    }
});

module.exports = router;
