const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    license_number: { type: String, required: true, unique: true, trim: true },
    license_expiry: { type: Date, required: true },
    license_category: { type: String, enum: ['van', 'truck', 'bike'], default: 'van' },
    status: {
        type: String,
        enum: ['on_duty', 'off_duty', 'suspended'],
        default: 'off_duty',
    },
    safety_score: { type: Number, default: 100, min: 0, max: 100 },
    trips_completed: { type: Number, default: 0, min: 0 },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true },
}, { timestamps: true });

// Virtual: is license expired?
driverSchema.virtual('is_license_expired').get(function () {
    return this.license_expiry < new Date();
});

driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);
