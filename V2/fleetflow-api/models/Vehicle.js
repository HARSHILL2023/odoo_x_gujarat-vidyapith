const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    license_plate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['van', 'truck', 'bike'], default: 'van' },
    max_capacity: { type: Number, required: true, min: 0 },
    odometer: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['available', 'on_trip', 'in_shop', 'retired'],
        default: 'available',
    },
    region: { type: String, default: '' },
    acquisition_cost: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
