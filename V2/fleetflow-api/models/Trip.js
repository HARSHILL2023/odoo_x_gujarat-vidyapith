const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    reference: { type: String, unique: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    cargo_weight: { type: Number, required: true, min: 0 },
    state: {
        type: String,
        enum: ['draft', 'dispatched', 'completed', 'cancelled'],
        default: 'draft',
    },
    date_start: { type: Date },
    date_end: { type: Date },
    odometer_start: { type: Number },
    odometer_end: { type: Number },
}, { timestamps: true });

// Auto-generate reference before save
tripSchema.pre('save', async function (next) {
    if (!this.reference) {
        const count = await mongoose.model('Trip').countDocuments();
        this.reference = `TRP-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Trip', tripSchema);
