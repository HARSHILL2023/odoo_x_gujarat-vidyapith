import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import authService from '@/services/authService';

const ROLES = ['Fleet Manager', 'Dispatcher', 'Finance Admin'];

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('manager@fleetflow.com');
    const [password, setPassword] = useState('password');
    const [role, setRole] = useState('Fleet Manager');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.message) {
            setSuccess(location.state.message);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authService.login(email, password);

            if (response.success) {
                // Pass the user data to App.jsx
                onLogin(response.user);
            }
        } catch (err) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
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
                    {success && <div className="alert alert-success">{success}</div>}
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            className="form-control"
                            type="email"
                            placeholder="you@fleetflow.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setSuccess(''); }}
                            disabled={loading}
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
                            disabled={loading}
                        />
                    </div>

                    <div className="login-divider">Select your role</div>
                    <div className="login-role-grid">
                        {ROLES.map((r) => (
                            <button
                                key={r}
                                type="button"
                                className={`login-role-btn${role === r ? ' active' : ''}`}
                                onClick={() => setRole(r)}
                                disabled={loading}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <button
                        className="login-btn"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Signing In...' : 'Sign In →'}
                    </button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Don't have an account? <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 600 }}>Create Account</Link>
                    </div>

                    <div className="login-forgot">Forgot password?</div>
                </form>

                {/* Demo credentials hint */}
                <div style={{
                    marginTop: '1rem',
                    padding: '0.5rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#4b5563'
                }}>
                    <strong>Demo Credentials:</strong><br />
                    manager@fleetflow.com / password<br />
                    dispatcher@fleetflow.com / password
                </div>
            </div>
        </div>
    );
}