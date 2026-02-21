const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const User = require('./models/User');
const FuelLog = require('./models/FuelLog');

const MONGODB_URI = 'mongodb://localhost:27017/fleetflow';

const vehicles = [
    { name: 'Mercedes-Benz Actros', model: '2023 Heavy Duty', license_plate: 'UK68 FOX', max_load: 25000, odometer: 12500, status: 'Available' },
    { name: 'Volvo FH16', model: '2022 Long Haul', license_plate: 'EU22 TRK', max_load: 30000, odometer: 45000, status: 'On Trip' },
    { name: 'Scania R500', model: '2021 Tipper', license_plate: 'SC11 TIP', max_load: 18000, odometer: 89000, status: 'In Shop' },
    { name: 'MAN TGX', model: '2023 Logistics', license_plate: 'MN23 LOG', max_load: 22000, odometer: 5000, status: 'Available' }
];

const drivers = [
    { name: 'John Doe', license_number: 'LN123456', license_expiry: '2025-12-31', safety_score: 98, status: 'On Duty' },
    { name: 'Jane Smith', license_number: 'LN789012', license_expiry: '2023-01-01', safety_score: 85, status: 'Off Duty' },
    { name: 'Mike Ross', license_number: 'LN345678', license_expiry: '2025-06-30', safety_score: 92, status: 'On Trip' }
];

const users = [
    { name: 'Admin User', email: 'manager@fleetflow.com', password: 'password', role: 'Fleet Manager' },
    { name: 'Dispatcher User', email: 'dispatcher@fleetflow.com', password: 'password', role: 'Dispatcher' },
    { name: 'Finance Admin', email: 'finance@fleetflow.com', password: 'password', role: 'Finance Admin' }
];

const seedDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        await Vehicle.deleteMany({});
        await Driver.deleteMany({});
        await User.deleteMany({});
        await FuelLog.deleteMany({});

        const savedVehicles = await Vehicle.insertMany(vehicles);
        await Driver.insertMany(drivers);
        await User.insertMany(users);

        // Add some fuel logs for the first vehicle
        const fuelLogs = [
            { vehicle_id: savedVehicles[0]._id, liters: 450, cost: 550, odometer: 12500, date: new Date('2024-01-01') },
            { vehicle_id: savedVehicles[0]._id, liters: 400, cost: 480, odometer: 13000, date: new Date('2024-01-15') }
        ];
        await FuelLog.insertMany(fuelLogs);

        console.log('✅ Database seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
