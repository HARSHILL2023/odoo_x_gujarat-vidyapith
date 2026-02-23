import {
    createContext, useCallback, useContext,
    useEffect, useMemo, useRef, useState,
} from 'react';
import { get, post, patch, del } from '../api';

const FleetContext = createContext(null);

// ── Safe ID helper ────────────────────────────────────────
export const sid = (val) => String(val?._id ?? val ?? '');

/* ════════════════════════════════════════════════════════════
   PROVIDER
   ════════════════════════════════════════════════════════════ */
export function FleetProvider({ children }) {

    /* ── State ─────────────────────────────────────────────── */
    const [vehicles,    setVehicles]    = useState([]);
    const [drivers,     setDrivers]     = useState([]);
    const [trips,       setTrips]       = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [fuelLogs,    setFuelLogs]    = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [mutating,    setMutating]    = useState(0);    // in-flight mutation count
    const [error,       setError]       = useState(null);

    /* ── Abort controller — prevents stale refreshAll ──────── */
    const abortRef = useRef(null);

    /* ════════════════════════════════════════════════════════
       CORE MUTATION WRAPPER
       - Tracks in-flight count (mutating > 0 = busy)
       - Calls rollback() on any error before re-throwing
       ════════════════════════════════════════════════════════ */
    const mutate = useCallback(async (fn, rollback) => {
        setMutating(c => c + 1);
        try {
            return await fn();
        } catch (err) {
            rollback?.();
            throw err;   // let the caller's toast.promise / try-catch handle it
        } finally {
            setMutating(c => c - 1);
        }
    }, []);

    /* ════════════════════════════════════════════════════════
       REFRESH
       ════════════════════════════════════════════════════════ */
    const refreshAll = useCallback(async () => {
        /* Abort any previous in-flight refreshAll */
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

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
            if (ctrl.signal.aborted) return;
            setVehicles(v    || []);
            setDrivers(d     || []);
            setTrips(t       || []);
            setMaintenance(m || []);
            setFuelLogs(f    || []);
        } catch (err) {
            if (err.name === 'AbortError') return;
            setError(err.message);
        } finally {
            if (!ctrl.signal.aborted) setLoading(false);
        }
    }, []);

    /* ── Selective refresh helpers — use these after targeted ops */
    const refreshVehicles    = useCallback(async () => { try { setVehicles(   await get('/api/vehicles')    || []); } catch {} }, []);
    const refreshDrivers     = useCallback(async () => { try { setDrivers(    await get('/api/drivers')     || []); } catch {} }, []);
    const refreshTrips       = useCallback(async () => { try { setTrips(      await get('/api/trips')       || []); } catch {} }, []);
    const refreshMaintenance = useCallback(async () => { try { setMaintenance(await get('/api/maintenance') || []); } catch {} }, []);
    const refreshFuelLogs    = useCallback(async () => { try { setFuelLogs(   await get('/api/fuel-logs')   || []); } catch {} }, []);

    useEffect(() => {
        if (localStorage.getItem('ff-token')) refreshAll();
        return () => abortRef.current?.abort();
    }, [refreshAll]);

    /* ── Refetch on window focus (user returns from another tab) */
    useEffect(() => {
        const onFocus = () => {
            if (localStorage.getItem('ff-token')) refreshAll();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [refreshAll]);

    /* ════════════════════════════════════════════════════════
       VEHICLES
       ════════════════════════════════════════════════════════ */
    const addVehicle = useCallback(async (data) =>
        mutate(async () => {
            const v = await post('/api/vehicles', data);
            setVehicles(p => [...p, v]);
            return v;
        }),
    [mutate]);

    const updateVehicle = useCallback(async (id, data) => {
        /* Optimistic — apply locally immediately */
        let snap;
        setVehicles(p => { snap = p; return p.map(x => sid(x) === sid(id) ? { ...x, ...data } : x); });
        return mutate(
            async () => {
                const v = await patch(`/api/vehicles/${id}`, data);
                setVehicles(p => p.map(x => sid(x) === sid(id) ? v : x));
                return v;
            },
            () => setVehicles(snap),    // rollback on error
        );
    }, [mutate]);

    const deleteVehicle = useCallback(async (id) => {
        let snap;
        setVehicles(p => { snap = p; return p.map(x => sid(x) === sid(id) ? { ...x, status: 'retired' } : x); });
        return mutate(
            async () => { await del(`/api/vehicles/${id}`); },
            () => setVehicles(snap),
        );
    }, [mutate]);

    /* ════════════════════════════════════════════════════════
       DRIVERS
       ════════════════════════════════════════════════════════ */
    const addDriver = useCallback(async (data) =>
        mutate(async () => {
            const d = await post('/api/drivers', data);
            setDrivers(p => [...p, d]);
            return d;
        }),
    [mutate]);

    const updateDriver = useCallback(async (id, data) => {
        let snap;
        setDrivers(p => { snap = p; return p.map(x => sid(x) === sid(id) ? { ...x, ...data } : x); });
        return mutate(
            async () => {
                const d = await patch(`/api/drivers/${id}`, data);
                setDrivers(p => p.map(x => sid(x) === sid(id) ? d : x));
                return d;
            },
            () => setDrivers(snap),
        );
    }, [mutate]);

    const deleteDriver = useCallback(async (id) => {
        let snap;
        setDrivers(p => { snap = p; return p.filter(x => sid(x) !== sid(id)); });
        return mutate(
            async () => { await del(`/api/drivers/${id}`); },
            () => setDrivers(snap),
        );
    }, [mutate]);

    /* ════════════════════════════════════════════════════════
       TRIPS
       ════════════════════════════════════════════════════════ */
    const addTrip = useCallback(async (data) =>
        mutate(async () => {
            const t = await post('/api/trips', data);
            setTrips(p => [t, ...p]);
            return t;
        }),
    [mutate]);

    /* NEW — patch trip fields (e.g. notes, cargo weight) */
    const updateTrip = useCallback(async (id, data) => {
        let snap;
        setTrips(p => { snap = p; return p.map(x => sid(x) === sid(id) ? { ...x, ...data } : x); });
        return mutate(
            async () => {
                const t = await patch(`/api/trips/${id}`, data);
                setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
                return t;
            },
            () => setTrips(snap),
        );
    }, [mutate]);

    /* NEW — hard delete a draft trip */
    const deleteTrip = useCallback(async (id) => {
        let snap;
        setTrips(p => { snap = p; return p.filter(x => sid(x) !== sid(id)); });
        return mutate(
            async () => { await del(`/api/trips/${id}`); },
            () => setTrips(snap),
        );
    }, [mutate]);

    const dispatchTrip = useCallback(async (id) =>
        mutate(async () => {
            const t = await post(`/api/trips/${id}/dispatch`);
            setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
            if (t.vehicle) setVehicles(p => p.map(v => sid(v) === sid(t.vehicle) ? { ...v, status: 'on_trip'  } : v));
            if (t.driver)  setDrivers(p  => p.map(d => sid(d) === sid(t.driver)  ? { ...d, status: 'on_duty'  } : d));
            return t;
        }),
    [mutate]);

    const completeTrip = useCallback(async (id, odometer_end) =>
        mutate(async () => {
            const t = await post(`/api/trips/${id}/complete`, { odometer_end });
            setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
            if (t.vehicle) setVehicles(p => p.map(v =>
                sid(v) === sid(t.vehicle) ? { ...v, status: 'available' } : v
            ));
            if (t.driver)  setDrivers(p => p.map(d =>
                sid(d) === sid(t.driver)
                    ? { ...d, status: 'off_duty', trips_completed: (d.trips_completed ?? 0) + 1 }
                    : d
            ));
            return t;
        }),
    [mutate]);

    const cancelTrip = useCallback(async (id) =>
        mutate(async () => {
            const t = await post(`/api/trips/${id}/cancel`);
            setTrips(p => p.map(x => sid(x) === sid(id) ? t : x));
            if (t.vehicle) setVehicles(p => p.map(v => sid(v) === sid(t.vehicle) ? { ...v, status: 'available' } : v));
            if (t.driver)  setDrivers(p  => p.map(d => sid(d) === sid(t.driver)  ? { ...d, status: 'off_duty'  } : d));
            return t;
        }),
    [mutate]);

    /* ════════════════════════════════════════════════════════
       MAINTENANCE
       ════════════════════════════════════════════════════════ */
    const addMaintenance = useCallback(async (data) =>
        mutate(async () => {
            const m = await post('/api/maintenance', data);
            setMaintenance(p => [m, ...p]);
            if (m.vehicle) setVehicles(p => p.map(v =>
                sid(v) === sid(m.vehicle) ? { ...v, status: 'in_shop' } : v
            ));
            return m;
        }),
    [mutate]);

    const updateMaintenance = useCallback(async (id, data) => {
        let snap;
        setMaintenance(p => { snap = p; return p.map(x => sid(x) === sid(id) ? { ...x, ...data } : x); });
        return mutate(
            async () => {
                const m = await patch(`/api/maintenance/${id}`, data);
                setMaintenance(p => p.map(x => sid(x) === sid(id) ? m : x));
                return m;
            },
            () => setMaintenance(snap),
        );
    }, [mutate]);

    /* NEW */
    const deleteMaintenance = useCallback(async (id) => {
        let snap;
        setMaintenance(p => { snap = p; return p.filter(x => sid(x) !== sid(id)); });
        return mutate(
            async () => { await del(`/api/maintenance/${id}`); },
            () => setMaintenance(snap),
        );
    }, [mutate]);

    const completeMaintenance = useCallback(async (id) =>
        mutate(async () => {
            const m = await post(`/api/maintenance/${id}/complete`);
            setMaintenance(p => p.map(x => sid(x) === sid(id) ? m : x));
            const vehicleId = sid(m.vehicle);
            if (vehicleId) {
                try {
                    const v = await get(`/api/vehicles/${vehicleId}`);
                    setVehicles(p => p.map(x => sid(x) === sid(v) ? v : x));
                } catch {
                    await refreshVehicles();
                }
            }
            return m;
        }),
    [mutate, refreshVehicles]);

    /* ════════════════════════════════════════════════════════
       FUEL LOGS
       ════════════════════════════════════════════════════════ */
    const addFuelLog = useCallback(async (data) =>
        mutate(async () => {
            const f = await post('/api/fuel-logs', data);
            setFuelLogs(p => [f, ...p]);
            return f;
        }),
    [mutate]);

    /* NEW */
    const updateFuelLog = useCallback(async (id, data) => {
        let snap;
        setFuelLogs(p => { snap = p; return p.map(x => sid(x) === sid(id) ? { ...x, ...data } : x); });
        return mutate(
            async () => {
                const f = await patch(`/api/fuel-logs/${id}`, data);
                setFuelLogs(p => p.map(x => sid(x) === sid(id) ? f : x));
                return f;
            },
            () => setFuelLogs(snap),
        );
    }, [mutate]);

    const deleteFuelLog = useCallback(async (id) => {
        let snap;
        setFuelLogs(p => { snap = p; return p.filter(x => sid(x) !== sid(id)); });
        return mutate(
            async () => { await del(`/api/fuel-logs/${id}`); },
            () => setFuelLogs(snap),
        );
    }, [mutate]);

    /* ════════════════════════════════════════════════════════
       DERIVED HELPERS
       ════════════════════════════════════════════════════════ */
    const isLicenseExpired = useCallback((driver) =>
        driver?.is_license_expired ?? (new Date(driver?.license_expiry) < new Date()),
    []);

    const vehicleTotalFuel = useCallback((vehicleId) =>
        fuelLogs.filter(f => sid(f.vehicle) === sid(vehicleId))
                .reduce((s, f) => s + (f.cost || 0), 0),
    [fuelLogs]);

    const vehicleTotalMaintenance = useCallback((vehicleId) =>
        maintenance.filter(m => sid(m.vehicle) === sid(vehicleId))
                   .reduce((s, m) => s + (m.cost || 0), 0),
    [maintenance]);

    /* ════════════════════════════════════════════════════════
       MEMOIZED DASHBOARD STATS
       Pre-computed once whenever the raw arrays change.
       Consumers read `stats.utilization` instead of computing it themselves.
       ════════════════════════════════════════════════════════ */
    const stats = useMemo(() => {
        const totalVehicles    = vehicles.length;
        const availVehicles    = vehicles.filter(v => v.status === 'available').length;
        const onTripVehicles   = vehicles.filter(v => v.status === 'on_trip').length;
        const inShopVehicles   = vehicles.filter(v => v.status === 'in_shop').length;
        const utilization      = totalVehicles ? Math.round(onTripVehicles / totalVehicles * 100) : 0;

        const activeTrips      = trips.filter(t => t.status === 'dispatched').length;
        const completedTrips   = trips.filter(t => t.status === 'completed').length;
        const cancelledTrips   = trips.filter(t => t.status === 'cancelled').length;

        const onDutyDrivers    = drivers.filter(d => d.status === 'on_duty').length;
        const availDrivers     = drivers.filter(d => d.status === 'off_duty').length;
        const expiredDrivers   = drivers.filter(d => isLicenseExpired(d)).length;
        const suspendedDrivers = drivers.filter(d => d.status === 'suspended').length;

        const totalFuelCost    = fuelLogs.reduce((s, f) => s + (f.cost    || 0), 0);
        const totalMaintCost   = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
        const totalOpCost      = totalFuelCost + totalMaintCost;
        const pendingMaint     = maintenance.filter(m => ['scheduled', 'in_progress'].includes(m.status)).length;

        return {
            totalVehicles, availVehicles, onTripVehicles, inShopVehicles, utilization,
            activeTrips, completedTrips, cancelledTrips,
            onDutyDrivers, availDrivers, expiredDrivers, suspendedDrivers,
            totalFuelCost, totalMaintCost, totalOpCost, pendingMaint,
        };
    }, [vehicles, drivers, trips, maintenance, fuelLogs, isLicenseExpired]);

    /* ── Context value ─────────────────────────────────────── */
    const value = useMemo(() => ({
        // Raw state
        vehicles, drivers, trips, maintenance, fuelLogs,
        loading, mutating: mutating > 0, error,

        // Pre-computed stats (for Dashboard)
        stats,

        // Refresh
        refreshAll, refreshVehicles, refreshDrivers,
        refreshTrips, refreshMaintenance, refreshFuelLogs,

        // Vehicles
        addVehicle, updateVehicle, deleteVehicle,

        // Drivers
        addDriver, updateDriver, deleteDriver,

        // Trips
        addTrip, updateTrip, deleteTrip,
        dispatchTrip, completeTrip, cancelTrip,

        // Maintenance
        addMaintenance, updateMaintenance, deleteMaintenance, completeMaintenance,

        // Fuel
        addFuelLog, updateFuelLog, deleteFuelLog,

        // Derived helpers
        isLicenseExpired, vehicleTotalFuel, vehicleTotalMaintenance,
    }), [
        vehicles, drivers, trips, maintenance, fuelLogs,
        loading, mutating, error, stats,
        refreshAll, refreshVehicles, refreshDrivers, refreshTrips, refreshMaintenance, refreshFuelLogs,
        addVehicle, updateVehicle, deleteVehicle,
        addDriver, updateDriver, deleteDriver,
        addTrip, updateTrip, deleteTrip, dispatchTrip, completeTrip, cancelTrip,
        addMaintenance, updateMaintenance, deleteMaintenance, completeMaintenance,
        addFuelLog, updateFuelLog, deleteFuelLog,
        isLicenseExpired, vehicleTotalFuel, vehicleTotalMaintenance,
    ]);

    return (
        <FleetContext.Provider value={value}>
            {children}
        </FleetContext.Provider>
    );
}

export const useFleet = () => useContext(FleetContext);
