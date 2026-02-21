import { useState, useEffect } from 'react';
import { post, saveToken } from '../api';

/* ─── Data ────────────────────────────────────────────────── */
const ROLES = [
    { label: 'Fleet Manager', value: 'fleet_manager', emoji: '🛡️', color: '#238bfa', desc: 'Full system access' },
    { label: 'Dispatcher', value: 'dispatcher', emoji: '📦', color: '#16a34a', desc: 'Trips & fuel logs' },
    { label: 'Safety Officer', value: 'safety_officer', emoji: '🔍', color: '#d97706', desc: 'Compliance & scores' },
    { label: 'Financial Analyst', value: 'financial_analyst', emoji: '📊', color: '#9333ea', desc: 'Reports & ROI' },
];

const DEMO_ACCOUNTS = [
    { label: 'Fleet Manager', email: 'admin@fleetflow.com', role: 'fleet_manager', emoji: '🛡️', color: '#238bfa' },
    { label: 'Dispatcher', email: 'sara@fleetflow.com', role: 'dispatcher', emoji: '📦', color: '#16a34a' },
    { label: 'Safety Officer', email: 'omar@fleetflow.com', role: 'safety_officer', emoji: '🔍', color: '#d97706' },
    { label: 'Financial Analyst', email: 'priya@fleetflow.com', role: 'financial_analyst', emoji: '📊', color: '#9333ea' },
];

/* ─── Password strength ───────────────────────────────────── */
function getStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0–5
}

function StrengthBar({ password }) {
    const score = getStrength(password);
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
    if (!password) return null;
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 999,
                        background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)',
                        boxShadow: i <= score ? `0 0 6px ${colors[score]}80` : 'none',
                        transition: 'all 0.3s ease',
                    }} />
                ))}
            </div>
            <div style={{ fontSize: 11, color: colors[score], fontWeight: 600, textAlign: 'right' }}>
                {labels[score]}
            </div>
        </div>
    );
}

/* ─── Password input with toggle ─────────────────────────── */
function PasswordInput({ value, onChange, placeholder, autoComplete, id }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                id={id}
                className="form-control"
                type={show ? 'text' : 'password'}
                placeholder={placeholder ?? '••••••••'}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                style={{ paddingRight: 44 }}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, lineHeight: 1, color: 'var(--text-muted)',
                    padding: 2, transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                tabIndex={-1}
                title={show ? 'Hide password' : 'Show password'}
            >
                {show ? '🙈' : '👁'}
            </button>
        </div>
    );
}

/* ─── Input field wrapper ─────────────────────────────────── */
function Field({ label, children, hint }) {
    return (
        <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{label}</span>
                {hint && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{hint}</span>}
            </label>
            {children}
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Login({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [role, setRole] = useState('fleet_manager');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [filledDemo, setFilledDemo] = useState(null);

    const isLogin = mode === 'login';
    const selectedRole = ROLES.find(r => r.value === role);

    /* ── Reset on mode switch ─────────────────────────────── */
    const switchMode = m => {
        setMode(m); setError('');
        setEmail(''); setPassword('');
        setConfirm(''); setName('');
        setFilledDemo(null);
    };

    /* ── Demo fill ────────────────────────────────────────── */
    const fillDemo = account => {
        setEmail(account.email);
        setPassword('password123');
        setRole(account.role);
        setError('');
        setFilledDemo(account.role);
    };

    /* ── Validation ───────────────────────────────────────── */
    const validate = () => {
        if (!email || !password) return 'Please fill in all required fields.';
        if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.';
        if (!isLogin) {
            if (!name.trim()) return 'Please enter your full name.';
            if (password.length < 6) return 'Password must be at least 6 characters.';
            if (password !== confirm) return 'Passwords do not match.';
        }
        return null;
    };

    /* ── Submit ───────────────────────────────────────────── */
    const handleSubmit = async e => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }
        setLoading(true);
        setError('');
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const body = isLogin
                ? { email, password }
                : { name, email, password, role };
            const data = await post(endpoint, body);
            saveToken(data.token);
            onLogin({ ...data.user });
        } catch (err) {
            setError(err.message || (isLogin ? 'Invalid email or password.' : 'Registration failed.'));
        } finally {
            setLoading(false);
        }
    };

    const pwMatch = confirm && password !== confirm;

    return (
        <div className="login-page">
            <div className="login-card slide-up" style={{ maxWidth: 420, width: '100%' }}>

                {/* ── Logo ──────────────────────────────────── */}
                <div className="login-logo" style={{ marginBottom: 24 }}>
                    <div className="login-logo-icon" style={{
                        fontSize: 40, filter: 'drop-shadow(0 0 16px rgba(56,189,248,0.4))',
                    }}>
                        🚚
                    </div>
                    <div className="login-logo-name" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
                        FleetFlow
                    </div>
                    <div className="login-logo-tag" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Fleet &amp; Logistics Management System
                    </div>
                </div>

                {/* ── Mode Tabs ─────────────────────────────── */}
                <div style={{
                    display: 'flex', marginBottom: 24,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 10, padding: 3,
                    border: '1px solid var(--glass-border)',
                }}>
                    {[
                        { key: 'login', label: 'Sign In' },
                        { key: 'register', label: 'Create Account' },
                    ].map(m => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => switchMode(m.key)}
                            style={{
                                flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: 13, borderRadius: 8,
                                background: mode === m.key
                                    ? 'var(--accent)'
                                    : 'transparent',
                                color: mode === m.key ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.25s ease',
                                boxShadow: mode === m.key ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
                            }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* ── Form ──────────────────────────────────── */}
                <form onSubmit={handleSubmit} noValidate style={{ animation: 'fadeIn 0.25s ease' }}>

                    {/* Error banner */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', marginBottom: 16,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: 9, fontSize: 13, color: 'var(--red-t)',
                            animation: 'fadeInScale 0.2s ease',
                        }}>
                            <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Name (register only) */}
                    {!isLogin && (
                        <Field label="Full Name">
                            <input
                                className="form-control"
                                type="text"
                                placeholder="e.g. Rajan Sharma"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(''); }}
                                autoComplete="name"
                            />
                        </Field>
                    )}

                    {/* Email */}
                    <Field label="Email Address">
                        <input
                            className="form-control"
                            type="email"
                            placeholder="you@fleetflow.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); setFilledDemo(null); }}
                            autoComplete="email"
                        />
                    </Field>

                    {/* Password */}
                    <Field
                        label="Password"
                        hint={!isLogin ? 'Min. 6 characters' : null}
                    >
                        <PasswordInput
                            id="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                        />
                        {!isLogin && <StrengthBar password={password} />}
                    </Field>

                    {/* Confirm password (register only) */}
                    {!isLogin && (
                        <Field label="Confirm Password">
                            <PasswordInput
                                id="confirm"
                                value={confirm}
                                onChange={e => { setConfirm(e.target.value); setError(''); }}
                                autoComplete="new-password"
                                placeholder="Re-enter password"
                            />
                            {pwMatch && (
                                <div style={{ fontSize: 11, color: 'var(--red-t)', marginTop: 5, fontWeight: 600 }}>
                                    ✗ Passwords do not match
                                </div>
                            )}
                            {confirm && !pwMatch && (
                                <div style={{ fontSize: 11, color: 'var(--green-t)', marginTop: 5, fontWeight: 600 }}>
                                    ✓ Passwords match
                                </div>
                            )}
                        </Field>
                    )}

                    {/* Role selector (register only) */}
                    {!isLogin && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.7px',
                                marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                Select Your Role
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {ROLES.map(r => {
                                    const isActive = role === r.value;
                                    return (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setRole(r.value)}
                                            style={{
                                                padding: '10px 12px', cursor: 'pointer',
                                                borderRadius: 10, textAlign: 'left',
                                                background: isActive ? `${r.color}20` : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${isActive ? r.color + '55' : 'var(--glass-border)'}`,
                                                boxShadow: isActive ? `0 0 0 1px ${r.color}25` : 'none',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--bg-hover)')}
                                            onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                        >
                                            <div style={{ fontSize: 18, marginBottom: 4 }}>{r.emoji}</div>
                                            <div style={{
                                                fontSize: 12, fontWeight: 700,
                                                color: isActive ? r.color : 'var(--text-primary)',
                                                marginBottom: 2, transition: 'color 0.2s',
                                            }}>
                                                {r.label}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                                {r.desc}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        className="login-btn"
                        type="submit"
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 8,
                            opacity: loading ? 0.75 : 1,
                            background: !isLogin && selectedRole
                                ? `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)`
                                : undefined,
                            boxShadow: !isLogin && selectedRole
                                ? `0 4px 16px ${selectedRole.color}40`
                                : undefined,
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff', borderRadius: '50%',
                                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                                }} />
                                {isLogin ? 'Signing in…' : 'Creating account…'}
                            </>
                        ) : (
                            <>{isLogin ? 'Sign In' : 'Create Account'} →</>
                        )}
                    </button>
                </form>

                {/* ── Demo Accounts (login only) ─────────────── */}
                {isLogin && (
                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{
                            fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
                            marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.9px',
                            fontWeight: 600,
                        }}>
                            ⚡ Quick Demo Access
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                            {DEMO_ACCOUNTS.map(a => {
                                const isActive = filledDemo === a.role;
                                return (
                                    <button
                                        key={a.email}
                                        type="button"
                                        onClick={() => fillDemo(a)}
                                        style={{
                                            padding: '9px 11px', cursor: 'pointer',
                                            borderRadius: 9, textAlign: 'left',
                                            background: isActive ? `${a.color}18` : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${isActive ? a.color + '50' : 'var(--glass-border)'}`,
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = `${a.color}12`;
                                            e.currentTarget.style.borderColor = `${a.color}40`;
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                            <span style={{ fontSize: 14 }}>{a.emoji}</span>
                                            <span style={{
                                                fontSize: 12, fontWeight: 700,
                                                color: isActive ? a.color : 'var(--text-primary)',
                                                transition: 'color 0.2s',
                                            }}>
                                                {a.label}
                                            </span>
                                            {isActive && (
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, marginLeft: 'auto',
                                                    color: a.color, background: `${a.color}20`,
                                                    padding: '1px 5px', borderRadius: 99,
                                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                                }}>
                                                    filled
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            {a.email}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{
                            fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
                            marginTop: 10, padding: '6px 12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: 7, border: '1px solid var(--glass-border)',
                        }}>
                            All demo accounts use password: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>password123</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Required CSS (add to global) ──────────────── */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
