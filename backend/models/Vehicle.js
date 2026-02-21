const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    license_plate: {
        type: String,
        required: true,
        unique: true
    },
    max_load: {
        type: Number,
        required: true
    },
    odometer: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Available', 'On Trip', 'In Shop', 'Out of Service'],
        default: 'Available'
    },
    image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);