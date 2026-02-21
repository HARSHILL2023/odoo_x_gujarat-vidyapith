import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Navbar = () => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="relative w-96">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search size={18} />
                </span>
                <input
                    type="text"
                    placeholder="Search..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        <User size={18} />
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-semibold text-slate-900 leading-none">Admin User</p>
                        <p className="text-xs text-slate-500 mt-1">Fleet Manager</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
