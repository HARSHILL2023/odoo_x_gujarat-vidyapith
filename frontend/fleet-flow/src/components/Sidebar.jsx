import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, MapPin, LogOut } from 'lucide-react';

const Sidebar = () => {
    const menuItems = [
        { title: 'Dashboard', path: '/', icon: LayoutDashboard },
        { title: 'Vehicles', path: '/vehicles', icon: Truck },
        { title: 'Drivers', path: '/drivers', icon: Users },
        { title: 'Trips', path: '/trips', icon: MapPin },
    ];

    return (
        <div className="w-64 bg-white h-screen border-r border-slate-200 flex flex-col fixed left-0 top-0">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                    FleetFlow
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        {item.title}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
