/**
 * Middleware factory: Restrict route to specific roles.
 * Usage: router.post('/...', verifyToken, requireRole('fleet_manager', 'dispatcher'), handler)
 *
 * Roles:
 *   fleet_manager     – full access
 *   dispatcher        – create/manage trips
 *   safety_officer    – read drivers, read maintenance
 *   financial_analyst – read fuel logs, analytics
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Requires one of: ${roles.join(', ')}. Your role: ${req.user.role}`,
            });
        }
        next();
    };
}

module.exports = { requireRole };
