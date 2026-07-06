const rateLimit = require('express-rate-limit');

// Rate limiting for admin routes (100 requests per 15 minutes)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Demasiadas peticiones. Por favor, intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to ensure the user is logged in as admin
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  res.redirect('/admin/login');
};

// Middleware to prevent logged-in admins from seeing login page
const redirectIfLoggedIn = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

module.exports = {
  adminLimiter,
  requireAuth,
  redirectIfLoggedIn
};
