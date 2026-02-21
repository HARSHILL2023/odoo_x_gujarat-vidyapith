import React from 'react';
import { Truck } from 'lucide-react';

const Login = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 text-white mb-6">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">FleetFlow</h1>
                    <p className="text-slate-500 mt-2">Sign in to manage your fleet</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                placeholder="admin@fleetflow.com"
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-slate-600">Remember me</span>
                            </label>
                            <a href="#" className="text-blue-600 font-semibold hover:underline">Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transform transition-all active:scale-[0.98] shadow-lg shadow-blue-100"
                        >
                            Login
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-slate-500 text-sm">
                    Don't have an account? <a href="#" className="font-bold text-blue-600 hover:underline">Contact sales</a>
                </p>
            </div>
        </div>
    );
};

export default Login;
