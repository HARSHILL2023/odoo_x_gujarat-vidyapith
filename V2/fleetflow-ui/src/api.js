/**
 * api.js — Centralized fetch wrapper for FleetFlow API
 *
 * Automatically attaches the JWT token from localStorage and
 * throws with a human-readable error message on non-2xx responses.
 */
// In dev, Vite proxies /api/* → http://localhost:4000 (see vite.config.js)
// In production, set VITE_API_URL to your deployed backend URL (e.g. https://fleetflow-api.vercel.app)
const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
    return localStorage.getItem('ff-token');
}

export function saveToken(token) {
    localStorage.setItem('ff-token', token);
}

export function clearToken() {
    localStorage.removeItem('ff-token');
}

export async function api(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        // Try to parse error message from API
        let message = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            message = body.error || message;
        } catch (err) {
            console.error('Failed to parse error response:', err);
        }
        throw new Error(message);
    }

    // Handle 204 No Content
    if (res.status === 204) return null;

    return res.json();
}

// Convenience helpers
export const get = (path) => api(path, { method: 'GET' });
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path) => api(path, { method: 'DELETE' });
