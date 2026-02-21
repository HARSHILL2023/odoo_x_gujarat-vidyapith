import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { get, post, patch, del } from '../api';

const FleetContext = createContext(null);

// ── Safe ID helper — handles ObjectId, populated object, or plain string ──
const sid = (val) => String(val?._id ?? val ?? '');

export function FleetProvider({ children }) {
    const [vehicles,    setVehicles]    = useState([]);
    const [drivers,     setDrivers]     = useState([]);
    const [trips,       setTrips]       = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [fuelLogs,    setFuelLogs]    = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);

    // ── INITIAL LOAD ─────────────────────────────────────────
    const refreshAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [v, d, t, m, f] = await Promise.all([
                get('/api/vehicles'),
                get('/api/drivers'),
                get('/api/trips'),
                get('/api/maintenance'),
                get('/api/fuel-logs'),
            ]);
            setVehicles(v    || []);
            setDrivers(d     || []);
            setTrips(t       || []);
            setMaintenance(m || []);
            setFuelLogs(f    || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (localStorage.getItem('ff-token')) refreshAll();
    }, [refreshAll]);

    // ── VEHICLES ─────────────────────────────────────────────
    const addVehicle = async (data) => {
        const v = await post('/api/vehicles', data);
        setVehicles(p => [...p, v]);
        return v;
    };

    const updateVehicle = async (id, data) => {
        const v = await patch(`/api/vehicles/${id}`, data);
        // ✅ FIX: use sid() for safe _id comparison
        setVehicles(p => p.map(x => sid(x) === sid(id) ? v : x));
        return v;
    };

    const deleteVehicle = async (id) => {
        await del(`/api/vehicles/${id}`);
        // ✅ FIX: safe ID comparison
        setVehicles(p => p.map(x => sid(x) === sid(id) ? { ...x, status: 'retired' } : x));
    };

    // ── DRIVERS ──────────────────────────────────────────────
    const addDriver = async (data) => {
        const d = await post('/api/drivers', data);
        setDrivers(p => [...p, d]);
        return d;
    };

    const updateDriver = async (id, data) => {
        const d = await patch(`/api/drivers/${id}`, data);
        setDrivers(p => p.map(x => sid(x) === sid(id) ? d : x));
        return d;
    };

    const deleteDriver = async (id) => {
        await del(`/api/drivers/${id}`);
        setDrivers(p => p.filter(x => sid(x) !== sid(id)));
    };

    // ── TRIPS ────────────────────────────────────────────────
    const addTrip = async (data) => {
        const t = await post('/api/trips', data);
        setTrips(p => [t, ...p]);
        return t;
    };

    const dispatchTrip = async (id) => {
        const t = await post(`/api/trips/${id}/dispatch`);
        setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
        // ✅ FIX: vehicle/driver may be populated object OR raw id string
        if (t.vehicle) setVehicles(p => p.map(v =>
            sid(v) === sid(t.vehicle) ? { ...v, status: 'on_trip' } : v
        ));
        if (t.driver) setDrivers(p => p.map(d =>
            sid(d) === sid(t.driver) ? { ...d, status: 'on_duty' } : d
        ));
        return t;
    };

    const completeTrip = async (id, odometer_end) => {
        const t = await post(`/api/trips/${id}/complete`, { odometer_end });
        setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
        if (t.vehicle) setVehicles(p => p.map(v =>
            sid(v) === sid(t.vehicle) ? { ...v, status: 'available' } : v
        ));
        // ✅ FIX: safe trips_completed increment (guard against undefined)
        if (t.driver) setDrivers(p => p.map(d =>
            sid(d) === sid(t.driver)
                ? { ...d, status: 'off_duty', trips_completed: (d.trips_completed ?? 0) + 1 }
                : d
        ));
        return t;
    };

    const cancelTrip = async (id) => {
        const t = await post(`/api/trips/${id}/cancel`);
        setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
        if (t.vehicle) setVehicles(p => p.map(v =>
            sid(v) === sid(t.vehicle) ? { ...v, status: 'available' } : v
        ));
        if (t.driver) setDrivers(p => p.map(d =>
            sid(d) === sid(t.driver) ? { ...d, status: 'off_duty' } : d
        ));
        return t;
    };

    // ── MAINTENANCE ──────────────────────────────────────────
    const addMaintenance = async (data) => {
        const m = await post('/api/maintenance', data);
        setMaintenance(p => [m, ...p]);
        // ✅ FIX: safe vehicle ID extraction (may be populated object or string)
        if (m.vehicle) setVehicles(p => p.map(v =>
            sid(v) === sid(m.vehicle) ? { ...v, status: 'in_shop' } : v
        ));
        return m;
    };

    const updateMaintenance = async (id, data) => {
        const m = await patch(`/api/maintenance/${id}`, data);
        setMaintenance(p => p.map(x => sid(x) === sid(id) ? m : x));
        return m;
    };

    const completeMaintenance = async (id) => {
        const m = await post(`/api/maintenance/${id}/complete`);
        setMaintenance(p => p.map(x => sid(x) === sid(id) ? m : x));
        // ✅ FIX: safe vehicle ID before fetching
        const vehicleId = sid(m.vehicle);
        if (vehicleId) {
            try {
                const v = await get(`/api/vehicles/${vehicleId}`);
                setVehicles(p => p.map(x => sid(x) === sid(v) ? v : x));
            } catch {
                // If fetch fails, just refresh all vehicles
                const allVehicles = await get('/api/vehicles');
                setVehicles(allVehicles || []);
            }
        }
        return m;
    };

    // ── FUEL LOGS ─────────────────────────────────────────────
    const addFuelLog = async (data) => {
        const f = await post('/api/fuel-logs', data);
        setFuelLogs(p => [f, ...p]);
        return f;
    };

    const deleteFuelLog = async (id) => {
        await del(`/api/fuel-logs/${id}`);
        setFuelLogs(p => p.filter(x => sid(x) !== sid(id)));
    };

    // ── DERIVED HELPERS ───────────────────────────────────────
    const isLicenseExpired = (driver) =>
        driver?.is_license_expired ?? (new Date(driver?.license_expiry) < new Date());

    // ✅ FIX: use sid() for safe ID comparison in both helpers
    const vehicleTotalFuel = (vehicleId) =>
        fuelLogs
            .filter(f => sid(f.vehicle) === sid(vehicleId))
            .reduce((s, f) => s + (f.cost || 0), 0);

    const vehicleTotalMaintenance = (vehicleId) =>
        maintenance
            .filter(m => sid(m.vehicle) === sid(vehicleId))
            .reduce((s, m) => s + (m.cost || 0), 0);

    return (
        <FleetContext.Provider
            value={{
                vehicles, drivers, trips, maintenance, fuelLogs,
                loading, error, refreshAll,
                addVehicle, updateVehicle, deleteVehicle,
                addDriver, updateDriver, deleteDriver,
                addTrip, dispatchTrip, completeTrip, cancelTrip,
                addMaintenance, updateMaintenance, completeMaintenance,
                addFuelLog, deleteFuelLog,
                isLicenseExpired, vehicleTotalFuel, vehicleTotalMaintenance,
            }}
        >
            {children}
        </FleetContext.Provider>
    );
}

export const useFleet = () => useContext(FleetContext);
