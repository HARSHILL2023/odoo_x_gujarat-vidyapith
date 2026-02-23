import { useCallback, useMemo, useState } from 'react';
import { post, saveToken } from '../api';
import {
    Shield, Package, Search, BarChart3,
    Eye, EyeOff, AlertTriangle, X, Check,
    ArrowRight
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════ */
const ROLES = [
    { label: 'Fleet Manager', value: 'fleet_manager', Icon: Shield, color: '#238bfa', desc: 'Full system access' },
    { label: 'Dispatcher', value: 'dispatcher', Icon: Package, color: '#16a34a', desc: 'Trips & fuel logs' },
    { label: 'Safety Officer', value: 'safety_officer', Icon: Search, color: '#d97706', desc: 'Compliance & scores' },
    { label: 'Financial Analyst', value: 'financial_analyst', Icon: BarChart3, color: '#9333ea', desc: 'Reports & ROI' },
];

const DEMO_ACCOUNTS = [
    { label: 'Fleet Manager', email: 'admin@fleetflow.com', role: 'fleet_manager', Icon: Shield, color: '#238bfa' },
    { label: 'Dispatcher', email: 'sara@fleetflow.com', role: 'dispatcher', Icon: Package, color: '#16a34a' },
    { label: 'Safety Officer', email: 'omar@fleetflow.com', role: 'safety_officer', Icon: Search, color: '#d97706' },
    { label: 'Financial Analyst', email: 'priya@fleetflow.com', role: 'financial_analyst', Icon: BarChart3, color: '#9333ea' },
];

const MODE_TABS = [
    { key: 'login', label: 'Sign In' },
    { key: 'register', label: 'Create Account' },
];

/* ── Inject spin keyframe once ─────────────────────────────── */
function injectSpinStyle() {
    if (document.getElementById('ff-login-spin')) return;
    const s = document.createElement('style');
    s.id = 'ff-login-spin';
    s.textContent = '@keyframes ff-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
}
injectSpinStyle();

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
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

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── FleetFlow SVG mark ──────────────────────────────────── */
function FleetFlowMark() {
    return (
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="5" width="9" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
            <path d="M10 7h3l2 3H10V7z" fill="white" fillOpacity="0.9" />
            <circle cx="4" cy="11.5" r="1.5" fill="white" fillOpacity="0.95" />
            <circle cx="12" cy="11.5" r="1.5" fill="white" fillOpacity="0.95" />
        </svg>
    );
}

/* ── StrengthBar ───────────────────────────────────────────── */
function StrengthBar({ password }) {
    const score = getStrength(password);
    if (!password) return null;
    const color = STRENGTH_COLORS[score];
    return (
        <div style={{ marginTop: 8 }} role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={5}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 999,
                        background: i <= score ? color : 'rgba(255,255,255,0.08)',
                        boxShadow: i <= score ? `0 0 6px ${color}80` : 'none',
                        transition: 'all 0.3s ease',
                    }} />
                ))}
            </div>
            <div style={{
                fontSize: 11, fontWeight: 600,
                color, textAlign: 'right',
            }}>
                {STRENGTH_LABELS[score]}
            </div>
        </div>
    );
}

/* ── PasswordInput ─────────────────────────────────────────── */
function PasswordInput({ value, onChange, placeholder, autoComplete, id, autoFocus }) {
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
                autoFocus={autoFocus}
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
                aria-label={show ? 'Hide password' : 'Show password'}
                title={show ? 'Hide password' : 'Show password'}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

/* ── Field ─────────────────────────────────────────────────── */
function Field({ label, children, hint }) {
    // Safely extract ID for htmlFor, handling both single child and array of children
    const childArray = Array.isArray(children) ? children : [children];
    const targetChild = childArray.find(c => c && typeof c === 'object' && c.props && c.props.id);
    const id = targetChild?.props?.id;

    return (
        <div className="form-group">
            <label className="form-label" htmlFor={id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>{label}</span>
                {hint && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                        {hint}
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
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

    /* FIX: useMemo — was re-computed on every render via .find() */
    const selectedRole = useMemo(
        () => ROLES.find(r => r.value === role),
        [role]
    );

    /* ── Reset on mode switch ───────────────────────────────── */
    const switchMode = useCallback((m) => {
        setMode(m);
        setError('');
        setEmail('');
        setPassword('');
        setConfirm('');
        setName('');
        setFilledDemo(null);
    }, []);

    /* ── Demo fill ──────────────────────────────────────────── */
    const fillDemo = useCallback((account) => {
        setEmail(account.email);
        setPassword('password123');
        setRole(account.role);
        setError('');
        setFilledDemo(account.role);
    }, []);

    /* ── Validation ─────────────────────────────────────────── */
    /* FIX: renamed to avoid name collision with the catch (err) block below */
    const validate = useCallback(() => {
        if (!email || !password) return 'Please fill in all required fields.';
        if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.';
        if (!isLogin) {
            if (!name.trim()) return 'Please enter your full name.';
            if (password.length < 6) return 'Password must be at least 6 characters.';
            if (password !== confirm) return 'Passwords do not match.';
        }
        return null;
    }, [email, password, name, confirm, isLogin]);

    /* ── Submit ─────────────────────────────────────────────── */
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        /* FIX: was `const err = validate(); catch (err)` — catch block shadowed
           the outer variable, making the validation error string unreachable */
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

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
        } catch (apiErr) {
            setError(
                apiErr.message ??
                (isLogin ? 'Invalid email or password.' : 'Registration failed.')
            );
        } finally {
            setLoading(false);
        }
    }, [validate, isLogin, email, password, name, role, onLogin]);

    /* ── Derived ────────────────────────────────────────────── */
    /* true when user has typed in confirm AND it doesn't match */
    const pwMismatch = Boolean(confirm && password !== confirm);
    const pwMatch = Boolean(confirm && password === confirm);

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div className="login-page">
            <div className="login-card slide-up">

                {/* ── Logo ──────────────────────────────────── */}
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <FleetFlowMark />
                    </div>
                    <div className="login-logo-name">FleetFlow</div>
                    <div className="login-logo-tag">
                        Fleet &amp; Logistics Management System
                    </div>
                </div>

                {/* ── Mode Tabs ─────────────────────────────── */}
                <div className="login-tabs" role="tablist">
                    {MODE_TABS.map(m => (
                        <button
                            key={m.key}
                            type="button"
                            role="tab"
                            aria-selected={mode === m.key}
                            className={`login-tab-btn ${mode === m.key ? 'active' : ''}`}
                            onClick={() => switchMode(m.key)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* ── Form ──────────────────────────────────── */}
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="login-form"
                    style={{ animation: 'fadeIn 0.25s ease' }}
                >
                    {/* Error banner */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', marginBottom: 16,
                            background: 'var(--red-bg)',
                            border: '1px solid var(--red)',
                            borderRadius: 9, fontSize: 13, color: 'var(--red-t)',
                            animation: 'fadeInScale 0.2s ease',
                        }}
                            role="alert"
                        >
                            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Name — register only */}
                    {!isLogin && (
                        <Field label="Full Name">
                            <input
                                id="full-name"
                                className="form-control"
                                type="text"
                                placeholder="e.g. Rajan Sharma"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(''); }}
                                autoComplete="name"
                                autoFocus
                            />
                        </Field>
                    )}

                    {/* Email */}
                    <Field label="Email Address">
                        <input
                            id="email"
                            className="form-control"
                            type="email"
                            placeholder="you@fleetflow.com"
                            value={email}
                            onChange={e => {
                                setEmail(e.target.value);
                                setError('');
                                setFilledDemo(null);
                            }}
                            autoComplete="email"
                            /* FIX: autoFocus on email when in login mode */
                            autoFocus={isLogin}
                        />
                    </Field>

                    {/* Password */}
                    <Field
                        label="Password"
                        hint={!isLogin ? 'Min. 6 characters' : undefined}
                    >
                        <PasswordInput
                            id="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                        />
                        {!isLogin && <StrengthBar password={password} />}
                    </Field>

                    {/* Confirm password — register only */}
                    {!isLogin && (
                        <Field label="Confirm Password">
                            <PasswordInput
                                id="confirm"
                                value={confirm}
                                onChange={e => { setConfirm(e.target.value); setError(''); }}
                                autoComplete="new-password"
                                placeholder="Re-enter password"
                            />
                            {pwMismatch && (
                                <div style={{
                                    fontSize: 11, color: 'var(--red-t)',
                                    marginTop: 5, fontWeight: 600,
                                }}>
                                    <X size={12} style={{ marginRight: 4 }} /> Passwords do not match
                                </div>
                            )}
                            {pwMatch && (
                                <div style={{
                                    fontSize: 11, color: 'var(--green-t)',
                                    marginTop: 5, fontWeight: 600,
                                }}>
                                    <Check size={12} style={{ marginRight: 4 }} /> Passwords match
                                </div>
                            )}
                        </Field>
                    )}

                    {/* Role selector — register only */}
                    {!isLogin && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.7px',
                                marginBottom: 10,
                            }}>
                                Select Your Role
                            </div>
                            <div
                                className="login-demo-grid stagger-grid"
                                role="radiogroup"
                                aria-label="Select role"
                            >
                                {ROLES.map(r => {
                                    const isActive = role === r.value;
                                    return (
                                        <button
                                            key={r.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={isActive}
                                            onClick={() => setRole(r.value)}
                                            className={`login-demo-card ${isActive ? 'active' : ''}`}
                                            style={isActive ? {
                                                '--active-bg': `${r.color}18`,
                                                '--active-border': `${r.color}50`,
                                                '--active-shadow': `${r.color}20`,
                                            } : {}}
                                        >
                                            <div style={{ marginBottom: 4 }}>
                                                <r.Icon size={18} color={isActive ? r.color : 'var(--text-muted)'} />
                                            </div>
                                            <div style={{
                                                fontSize: 12, fontWeight: 700, marginBottom: 2,
                                                color: isActive ? r.color : 'var(--text-primary)',
                                            }}>
                                                {r.label}
                                            </div>
                                            <div style={{
                                                fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3,
                                            }}>
                                                {r.desc}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        className="login-btn"
                        type="submit"
                        disabled={loading || pwMismatch}
                        style={!isLogin && selectedRole ? {
                            background: `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)`,
                            boxShadow: `0 4px 16px ${selectedRole.color}40`,
                        } : {}}
                    >
                        {loading ? (
                            <>
                                <span className="ff-spin-icon" style={{
                                    width: 16, height: 16,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff', borderRadius: '50%',
                                    display: 'inline-block',
                                }} />
                                {isLogin ? 'Signing in…' : 'Creating account…'}
                            </>
                        ) : (
                            <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} style={{ marginLeft: 6 }} /></>
                        )}
                    </button>
                </form>

                {/* ── Demo Accounts (login only) ───────────── */}
                {isLogin && (
                    <div className="login-demo-section">
                        <div style={{
                            fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
                            marginBottom: 10, textTransform: 'uppercase',
                            letterSpacing: '0.9px', fontWeight: 600,
                        }}>
                            ⚡ Quick Demo Access
                        </div>

                        <div className="login-demo-grid stagger-grid">
                            {DEMO_ACCOUNTS.map(a => {
                                const isActive = filledDemo === a.role;
                                return (
                                    <button
                                        key={a.email}
                                        type="button"
                                        onClick={() => fillDemo(a)}
                                        className={`login-demo-card ${isActive ? 'active' : ''}`}
                                        style={isActive ? {
                                            '--active-bg': `${a.color}18`,
                                            '--active-border': `${a.color}50`,
                                        } : {}}
                                    >
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            gap: 7, marginBottom: 2,
                                        }}>
                                            <a.Icon size={14} color={isActive ? a.color : 'var(--text-muted)'} />
                                            <span style={{
                                                fontSize: 12, fontWeight: 700,
                                                color: isActive ? a.color : 'var(--text-primary)',
                                            }}>
                                                {a.label}
                                            </span>
                                            {isActive && (
                                                <div style={{
                                                    width: 6, height: 6, borderRadius: '50%',
                                                    background: a.color, marginLeft: 'auto',
                                                    boxShadow: `0 0 6px ${a.color}`,
                                                }} />
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: 10, color: 'var(--text-muted)',
                                            fontFamily: 'var(--font-mono)', opacity: 0.8
                                        }}>
                                            {a.email}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{
                            fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
                            marginTop: 10, padding: '8px 12px',
                            background: 'var(--bg-input)',
                            borderRadius: 8, border: '1px solid var(--border)',
                        }}>
                            All demo accounts use password:{' '}
                            <strong style={{
                                color: 'var(--text-secondary)',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                password123
                            </strong>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
