const mongoose = require('mongoose');

const fuelLogSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    date: { type: Date, required: true },
    liters: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    odometer: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// Virtual: cost per liter
fuelLogSchema.virtual('cost_per_liter').get(function () {
    return this.liters > 0 ? parseFloat((this.cost / this.liters).toFixed(2)) : null;
});

fuelLogSchema.set('toJSON', { virtuals: true });
fuelLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FuelLog', fuelLogSchema);
