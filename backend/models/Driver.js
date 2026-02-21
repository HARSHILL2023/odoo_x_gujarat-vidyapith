const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    license_number: {
        type: String,
        required: true,
        unique: true
    },
    license_expiry: {
        type: Date,
        required: true
    },
    license_category: {
        type: String,
        default: 'van'
    },
    phone: String,
    email: String,
    safety_score: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['On Duty', 'Off Duty', 'Suspended', 'On Trip'],
        default: 'On Duty'
    },
    image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);