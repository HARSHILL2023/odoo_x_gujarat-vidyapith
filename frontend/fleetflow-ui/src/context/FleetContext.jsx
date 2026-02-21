import { createContext, useContext, useState } from 'react';
import {
    INITIAL_VEHICLES,
    INITIAL_DRIVERS,
    INITIAL_TRIPS,
    INITIAL_MAINTENANCE,
    INITIAL_FUEL_LOGS,
} from '../data/mockData';

const FleetContext = createContext(null);

export function FleetProvider({ children }) {
    const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
    const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
    const [trips, setTrips] = useState(INITIAL_TRIPS);
    const [maintenance, setMaintenance] = useState(INITIAL_MAINTENANCE);
    const [fuelLogs, setFuelLogs] = useState(INITIAL_FUEL_LOGS);

    // ── VEHICLES ──────────────────────────────────────────────
    const addVehicle = (v) => setVehicles((p) => [...p, { ...v, id: Date.now() }]);
    const updateVehicle = (id, data) =>
        setVehicles((p) => p.map((v) => (v.id === id ? { ...v, ...data } : v)));
    const deleteVehicle = (id) => setVehicles((p) => p.filter((v) => v.id !== id));

    // ── DRIVERS ───────────────────────────────────────────────
    const addDriver = (d) => setDrivers((p) => [...p, { ...d, id: Date.now() }]);
    const updateDriver = (id, data) =>
        setDrivers((p) => p.map((d) => (d.id === id ? { ...d, ...data } : d)));
    const deleteDriver = (id) => setDrivers((p) => p.filter((d) => d.id !== id));

    // ── TRIPS ─────────────────────────────────────────────────
    const addTrip = (t) => {
        const ref = `TRIP-${new Date().getFullYear()}-${String(trips.length + 1).padStart(3, '0')}`;
        setTrips((p) => [...p, { ...t, id: Date.now(), reference: ref, state: 'draft' }]);
    };
    const updateTrip = (id, data) =>
        setTrips((p) => p.map((t) => (t.id === id ? { ...t, ...data } : t)));

    const dispatchTrip = (id) => {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        updateTrip(id, { state: 'dispatched' });
        updateVehicle(trip.vehicleId, { status: 'on_trip' });
        updateDriver(trip.driverId, { status: 'on_duty' });
    };
    const completeTrip = (id) => {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        updateTrip(id, { state: 'completed', dateEnd: new Date().toISOString() });
        updateVehicle(trip.vehicleId, { status: 'available' });
    };
    const cancelTrip = (id) => {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        updateTrip(id, { state: 'cancelled' });
        updateVehicle(trip.vehicleId, { status: 'available' });
    };

    // ── MAINTENANCE ───────────────────────────────────────────
    const addMaintenance = (m) => {
        setMaintenance((p) => [...p, { ...m, id: Date.now(), state: 'scheduled' }]);
        // Auto: vehicle → in_shop
        updateVehicle(m.vehicleId, { status: 'in_shop' });
    };
    const updateMaintenance = (id, data) =>
        setMaintenance((p) => p.map((m) => (m.id === id ? { ...m, ...data } : m)));
    const completeMaintenance = (id) => {
        const rec = maintenance.find((m) => m.id === id);
        if (!rec) return;
        updateMaintenance(id, { state: 'done' });
        // Revert vehicle to available if no other open records
        const openForVehicle = maintenance.filter(
            (m) => m.vehicleId === rec.vehicleId && m.id !== id && m.state !== 'done'
        );
        if (openForVehicle.length === 0) updateVehicle(rec.vehicleId, { status: 'available' });
    };

    // ── FUEL LOGS ─────────────────────────────────────────────
    const addFuelLog = (f) => setFuelLogs((p) => [...p, { ...f, id: Date.now() }]);

    // ── DERIVED HELPERS ───────────────────────────────────────
    const isLicenseExpired = (driver) => new Date(driver.licenseExpiry) < new Date();

    const vehicleTotalFuel = (vehicleId) =>
        fuelLogs.filter((f) => f.vehicleId === vehicleId).reduce((s, f) => s + f.cost, 0);
    const vehicleTotalMaintenance = (vehicleId) =>
        maintenance.filter((m) => m.vehicleId === vehicleId).reduce((s, m) => s + m.cost, 0);

    return (
        <FleetContext.Provider
            value={{
                vehicles, drivers, trips, maintenance, fuelLogs,
                addVehicle, updateVehicle, deleteVehicle,
                addDriver, updateDriver, deleteDriver,
                addTrip, updateTrip, dispatchTrip, completeTrip, cancelTrip,
                addMaintenance, updateMaintenance, completeMaintenance,
                addFuelLog,
                isLicenseExpired, vehicleTotalFuel, vehicleTotalMaintenance,
            }}
        >
            {children}
        </FleetContext.Provider>
    );
}

export const useFleet = () => useContext(FleetContext);
