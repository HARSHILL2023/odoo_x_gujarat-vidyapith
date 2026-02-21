import React from 'react';
import { Filter, Calendar } from 'lucide-react';
import { tripsData } from '../data/dummyData';
import StatusBadge from '../components/StatusBadge';

const Trips = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Trips</h2>
                    <p className="text-slate-500">Track and manage vehicle deployments.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm font-medium">
                        <Filter size={18} />
                        Filter
                    </button>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm font-medium">
                        <Calendar size={18} />
                        Schedule Trip
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trip ID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tripsData.map((trip) => (
                            <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm font-medium text-blue-600">{trip.id}</td>
                                <td className="px-6 py-4">
                                    <span className="text-slate-900 font-medium">{trip.vehicle}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{trip.driver}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={trip.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Trips;
