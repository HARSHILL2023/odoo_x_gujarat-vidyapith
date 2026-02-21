import { useState } from 'react';

const ROLES = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'];

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('admin@fleetflow.com');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Fleet Manager');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email || !password) { setError('Please fill in all fields.'); return; }
        onLogin({ name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()), email, role });
    };

    return (
        <div className="login-page">
            <div className="login-card slide-up">
                <div className="login-logo">
                    <div className="login-logo-icon">🚚</div>
                    <div className="login-logo-name">FleetFlow</div>
                    <div className="login-logo-tag">Fleet & Logistics Management System</div>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            className="form-control"
                            type="email"
                            placeholder="you@fleetflow.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-control"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        />
                    </div>

                    <div className="login-divider">Select your role</div>
                    <div className="login-role-grid">
                        {ROLES.map((r) => (
                            <button
                                key={r} type="button"
                                className={`login-role-btn${role === r ? ' active' : ''}`}
                                onClick={() => setRole(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <button className="login-btn" type="submit">Sign In →</button>
                    <div className="login-forgot">Forgot password?</div>
                </form>
            </div>
        </div>
    );
}
