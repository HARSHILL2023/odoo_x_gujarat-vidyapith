import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col">
                <Navbar />
                <main className="flex-1 p-8 bg-slate-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
