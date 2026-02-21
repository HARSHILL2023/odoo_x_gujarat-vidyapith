const express = require('express');
const { Parser } = require('json2csv');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Maintenance = require('../models/Maintenance');
const FuelLog = require('../models/FuelLog');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// GET /api/analytics/summary — Dashboard KPIs
router.get('/summary', async (req, res) => {
    try {
        const [vehicleStats, tripStats, maintenanceStats, fuelStats] = await Promise.all([
            Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Trip.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }]),
            Maintenance.aggregate([{
                $group: {
                    _id: null,
                    openCount: { $sum: { $cond: [{ $ne: ['$state', 'done'] }, 1, 0] } },
                    totalCost: { $sum: '$cost' },
                },
            }]),
            FuelLog.aggregate([{
                $group: { _id: null, totalCost: { $sum: '$cost' }, totalLiters: { $sum: '$liters' } },
            }]),
        ]);

        const vehicleByStatus = {};
        vehicleStats.forEach(v => { vehicleByStatus[v._id] = v.count; });
        const tripByState = {};
        tripStats.forEach(t => { tripByState[t._id] = t.count; });

        const total = Object.values(vehicleByStatus).reduce((a, b) => a + b, 0);
        const utilization = total > 0
            ? Math.round(((total - (vehicleByStatus.available || 0)) / total) * 100)
            : 0;

        res.json({
            vehicles: vehicleByStatus,
            trips: tripByState,
            activeFleet: vehicleByStatus.on_trip || 0,
            inShop: vehicleByStatus.in_shop || 0,
            available: vehicleByStatus.available || 0,
            utilization,
            pendingCargo: tripByState.draft || 0,
            openMaintenance: maintenanceStats[0]?.openCount || 0,
            totalMaintenanceCost: maintenanceStats[0]?.totalCost || 0,
            totalFuelCost: fuelStats[0]?.totalCost || 0,
            totalFuelLiters: fuelStats[0]?.totalLiters || 0,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load analytics summary.' });
    }
});

// GET /api/analytics/fleet — Per-vehicle fuel efficiency + ROI
router.get('/fleet', async (req, res) => {
    try {
        const [fuelByVehicle, maintenanceByVehicle, tripsByVehicle, vehicles] = await Promise.all([
            FuelLog.aggregate([{
                $group: {
                    _id: '$vehicle',
                    totalFuelCost: { $sum: '$cost' },
                    totalLiters: { $sum: '$liters' },
                },
            }]),
            Maintenance.aggregate([{
                $group: { _id: '$vehicle', totalMaintenanceCost: { $sum: '$cost' } },
            }]),
            Trip.aggregate([
                { $match: { state: 'completed', odometer_end: { $exists: true }, odometer_start: { $exists: true } } },
                {
                    $group: {
                        _id: '$vehicle',
                        totalKm: { $sum: { $subtract: ['$odometer_end', '$odometer_start'] } },
                        completedTrips: { $sum: 1 },
                    }
                },
            ]),
            Vehicle.find({}, 'name type max_capacity acquisition_cost status'),
        ]);

        const fuelMap = {}; fuelByVehicle.forEach(f => { fuelMap[f._id] = f; });
        const maintMap = {}; maintenanceByVehicle.forEach(m => { maintMap[m._id] = m; });
        const tripMap = {}; tripsByVehicle.forEach(t => { tripMap[t._id] = t; });

        const result = vehicles.map(v => {
            const id = v._id.toString();
            const fuel = fuelMap[id] || { totalFuelCost: 0, totalLiters: 0 };
            const maint = maintMap[id] || { totalMaintenanceCost: 0 };
            const trips = tripMap[id] || { totalKm: 0, completedTrips: 0 };
            const opCost = fuel.totalFuelCost + maint.totalMaintenanceCost;
            const revenue = trips.completedTrips * 500; // mock: ₹500 revenue per trip
            const acqCost = v.acquisition_cost;
            return {
                vehicle_id: id,
                name: v.name,
                status: v.status,
                total_km: trips.totalKm,
                total_liters: fuel.totalLiters,
                km_per_liter: fuel.totalLiters > 0 ? parseFloat((trips.totalKm / fuel.totalLiters).toFixed(2)) : null,
                total_fuel_cost: fuel.totalFuelCost,
                total_maintenance_cost: maint.totalMaintenanceCost,
                total_operational_cost: opCost,
                acquisition_cost: acqCost,
                completed_trips: trips.completedTrips,
                estimated_revenue: revenue,
                roi: acqCost > 0 ? parseFloat(((revenue - opCost) / acqCost * 100).toFixed(2)) : null,
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load fleet analytics.' });
    }
});

// GET /api/analytics/drivers — Driver performance
router.get('/drivers', async (req, res) => {
    try {
        const tripStats = await Trip.aggregate([
            {
                $group: {
                    _id: '$driver',
                    totalTrips: { $sum: 1 },
                    completedTrips: { $sum: { $cond: [{ $eq: ['$state', 'completed'] }, 1, 0] } },
                }
            },
        ]);
        const tripMap = {};
        tripStats.forEach(t => { tripMap[t._id.toString()] = t; });

        const drivers = await Driver.find({}, 'name safety_score license_expiry status');
        const result = drivers.map(d => {
            const stats = tripMap[d._id.toString()] || { totalTrips: 0, completedTrips: 0 };
            return {
                driver_id: d._id,
                name: d.name,
                safety_score: d.safety_score,
                license_expiry: d.license_expiry,
                status: d.status,
                is_license_expired: d.license_expiry < new Date(),
                total_trips: stats.totalTrips,
                completed_trips: stats.completedTrips,
                completion_rate: stats.totalTrips > 0
                    ? parseFloat(((stats.completedTrips / stats.totalTrips) * 100).toFixed(1))
                    : 0,
            };
        });

        res.json(result.sort((a, b) => b.safety_score - a.safety_score));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load driver analytics.' });
    }
});

// GET /api/analytics/export/csv?type=fuel|maintenance|trips
router.get('/export/csv', async (req, res) => {
    const { type = 'fuel' } = req.query;
    try {
        let data = [], filename = '';

        if (type === 'fuel') {
            const logs = await FuelLog.find().populate('vehicle', 'name').populate('trip', 'reference').lean();
            data = logs.map(l => ({
                id: l._id, vehicle: l.vehicle?.name, date: l.date?.toISOString().split('T')[0],
                liters: l.liters, cost: l.cost, cost_per_liter: l.liters > 0 ? (l.cost / l.liters).toFixed(2) : '',
                odometer: l.odometer, trip: l.trip?.reference || '',
            }));
            filename = 'fuel_logs.csv';
        } else if (type === 'maintenance') {
            const records = await Maintenance.find().populate('vehicle', 'name').lean();
            data = records.map(m => ({
                id: m._id, vehicle: m.vehicle?.name, service: m.name, type: m.service_type,
                date: m.service_date?.toISOString().split('T')[0], cost: m.cost, mechanic: m.mechanic, state: m.state,
            }));
            filename = 'maintenance_logs.csv';
        } else if (type === 'trips') {
            const trips = await Trip.find().populate('vehicle', 'name').populate('driver', 'name').lean();
            data = trips.map(t => ({
                id: t._id, reference: t.reference, vehicle: t.vehicle?.name, driver: t.driver?.name,
                origin: t.origin, destination: t.destination, cargo_weight: t.cargo_weight, state: t.state,
                date_start: t.date_start?.toISOString().split('T')[0],
                date_end: t.date_end?.toISOString().split('T')[0],
                distance_km: t.odometer_end && t.odometer_start ? t.odometer_end - t.odometer_start : '',
            }));
            filename = 'trips.csv';
        } else {
            return res.status(400).json({ error: 'Invalid type. Use: fuel, maintenance, trips' });
        }

        if (!data.length) return res.status(204).send();
        const csv = new Parser({ fields: Object.keys(data[0]) }).parse(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to export CSV.' });
    }
});

module.exports = router;
