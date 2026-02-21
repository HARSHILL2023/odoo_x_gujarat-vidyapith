require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./connect');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Maintenance = require('../models/Maintenance');
const FuelLog = require('../models/FuelLog');

async function seed() {
    await connectDB();
    console.log('🌱 Seeding database...');

    // Clear all
    await Promise.all([
        User.deleteMany({}), Vehicle.deleteMany({}), Driver.deleteMany({}),
        Trip.deleteMany({}), Maintenance.deleteMany({}), FuelLog.deleteMany({}),
    ]);

    const hash = await bcrypt.hash('password123', 10);

    // Users
    await User.insertMany([
        { name: 'Admin Manager', email: 'admin@fleetflow.com', password_hash: hash, role: 'fleet_manager' },
        { name: 'Sara Dispatcher', email: 'sara@fleetflow.com', password_hash: hash, role: 'dispatcher' },
        { name: 'Omar Safety', email: 'omar@fleetflow.com', password_hash: hash, role: 'safety_officer' },
        { name: 'Priya Finance', email: 'priya@fleetflow.com', password_hash: hash, role: 'financial_analyst' },
    ]);

    // Vehicles
    const vehicles = await Vehicle.insertMany([
        { name: 'Volvo FH-500', license_plate: 'TN-01-AB-1234', type: 'truck', max_capacity: 15000, odometer: 45000, status: 'available', region: 'North', acquisition_cost: 1200000 },
        { name: 'Ford Transit', license_plate: 'MH-03-CD-5678', type: 'van', max_capacity: 1500, odometer: 22000, status: 'available', region: 'West', acquisition_cost: 550000 },
        { name: 'Tata Ace', license_plate: 'DL-05-EF-9012', type: 'van', max_capacity: 750, odometer: 18500, status: 'in_shop', region: 'Central', acquisition_cost: 380000 },
        { name: 'Hero Splendor', license_plate: 'KA-07-GH-3456', type: 'bike', max_capacity: 150, odometer: 12000, status: 'available', region: 'South', acquisition_cost: 95000 },
        { name: 'Ashok Leyland', license_plate: 'GJ-09-IJ-7890', type: 'truck', max_capacity: 20000, odometer: 61000, status: 'available', region: 'East', acquisition_cost: 1850000 },
    ]);

    // Drivers
    const drivers = await Driver.insertMany([
        { name: 'Alex Kumar', license_number: 'DL-2020-1234567', license_expiry: new Date('2026-12-31'), license_category: 'truck', status: 'off_duty', safety_score: 92, trips_completed: 145, phone: '+91-9000000001', email: 'alex@fleetflow.com' },
        { name: 'Priya Singh', license_number: 'MH-2019-7654321', license_expiry: new Date('2025-06-10'), license_category: 'van', status: 'off_duty', safety_score: 78, trips_completed: 89, phone: '+91-9000000002', email: 'priya.d@fleetflow.com' },
        { name: 'Ravi Thomas', license_number: 'TN-2021-1122334', license_expiry: new Date('2027-06-30'), license_category: 'van', status: 'off_duty', safety_score: 95, trips_completed: 212, phone: '+91-9000000003', email: 'ravi@fleetflow.com' },
        { name: 'Aisha Mehta', license_number: 'GJ-2018-5566778', license_expiry: new Date('2024-11-01'), license_category: 'bike', status: 'off_duty', safety_score: 85, trips_completed: 56, phone: '+91-9000000004', email: 'aisha@fleetflow.com' },
        { name: 'Dev Nair', license_number: 'KA-2022-9988776', license_expiry: new Date('2028-01-15'), license_category: 'truck', status: 'suspended', safety_score: 60, trips_completed: 34, phone: '+91-9000000005', email: 'dev@fleetflow.com' },
    ]);

    // Completed trip
    const completedTrip = await Trip.create({
        vehicle: vehicles[0]._id, driver: drivers[0]._id,
        origin: 'Chennai Hub', destination: 'Bangalore WH',
        cargo_weight: 8000, state: 'completed',
        date_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        date_end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        odometer_start: 44600, odometer_end: 44980,
    });

    // Draft trip
    await Trip.create({
        vehicle: vehicles[1]._id, driver: drivers[2]._id,
        origin: 'Mumbai Central', destination: 'Pune Depot',
        cargo_weight: 1200, state: 'draft',
    });

    // Maintenance (Tata Ace in shop)
    await Maintenance.insertMany([
        { vehicle: vehicles[2]._id, name: 'Engine Oil Change + Filter', service_type: 'oil_change', service_date: new Date(), cost: 3500, mechanic: 'Sharma Auto Works', state: 'in_progress' },
        { vehicle: vehicles[0]._id, name: 'Annual Scheduled Service', service_type: 'scheduled', service_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), cost: 12000, mechanic: 'Volvo Authorised', state: 'scheduled' },
    ]);

    // Fuel logs
    await FuelLog.insertMany([
        { vehicle: vehicles[0]._id, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), liters: 120.5, cost: 13255, odometer: 44800 },
        { vehicle: vehicles[1]._id, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), liters: 45.0, cost: 4950, odometer: 21900 },
        { vehicle: vehicles[0]._id, trip: completedTrip._id, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), liters: 180.0, cost: 19800, odometer: 44200 },
    ]);

    console.log('✅ Seed complete!');
    console.log('   Users seeded (password: password123):');
    console.log('   admin@fleetflow.com  | fleet_manager');
    console.log('   sara@fleetflow.com   | dispatcher');
    console.log('   omar@fleetflow.com   | safety_officer');
    console.log('   priya@fleetflow.com  | financial_analyst');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
