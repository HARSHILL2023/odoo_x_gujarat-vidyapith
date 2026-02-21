const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    name: { type: String, required: true, trim: true },
    service_type: {
        type: String,
        enum: ['oil_change', 'tire', 'brake', 'engine', 'electrical', 'bodywork', 'scheduled', 'other'],
        default: 'other',
    },
    service_date: { type: Date },
    cost: { type: Number, default: 0, min: 0 },
    mechanic: { type: String, default: '' },
    state: {
        type: String,
        enum: ['scheduled', 'in_progress', 'done'],
        default: 'scheduled',
    },
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
