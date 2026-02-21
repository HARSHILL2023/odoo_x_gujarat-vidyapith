import React from 'react';
import { Plus, User, MoreVertical } from 'lucide-react';
import { driversData } from '../data/dummyData';
import StatusBadge from '../components/StatusBadge';

const Drivers = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Drivers</h2>
                    <p className="text-slate-500">View and manage your professional driving team.</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm font-medium">
                    <Plus size={20} />
                    Add Driver
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver Name</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">License Number</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {driversData.map((driver) => (
                            <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                            <User size={20} />
                                        </div>
                                        <span className="font-semibold text-slate-900">{driver.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{driver.license}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={driver.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                                        <MoreVertical size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Drivers;
