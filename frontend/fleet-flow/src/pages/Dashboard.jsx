import React from 'react';
import { Truck, Users, Wrench, Navigation } from 'lucide-react';
import { statsData } from '../data/dummyData';

const Dashboard = () => {
    const iconMap = {
        Truck: Truck,
        Users: Users,
        Wrench: Wrench,
        Navigation: Navigation,
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
                <p className="text-slate-500">Welcome back, manager. Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsData.map((stat, index) => {
                    const IconComponent = iconMap[stat.icon];
                    return (
                        <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                                    <IconComponent size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <span className="text-xs font-bold">#{i}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Trip TRP-00{i} completed successfully.</p>
                                    <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Maintenance Alerts</h3>
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                                    <Wrench size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 font-semibold">Vehicle Service Overdue</p>
                                    <p className="text-xs text-slate-500 mt-1 uppercase">Toyota Hilux • GJ 01 AB 1234</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
