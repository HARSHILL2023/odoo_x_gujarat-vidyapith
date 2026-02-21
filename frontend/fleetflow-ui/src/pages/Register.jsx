import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '@/services/authService';

const ROLES = ['Fleet Manager', 'Dispatcher', 'Finance Admin'];

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Dispatcher');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authService.register({ name, email, password, role });

            if (response.success) {
                // Redirect to login after successful registration
                navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
            }
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
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
                    <div className="login-logo-tag">Join the Fleet Management System</div>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            className="form-control"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            className="form-control"
                            type="email"
                            placeholder="you@fleetflow.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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

                    <div className="login-divider">Assign your role</div>
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
                        {loading ? 'Creating Account...' : 'Create Account →'}
                    </button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign In</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
