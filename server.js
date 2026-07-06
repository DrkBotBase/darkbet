require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');

// Route Imports
const publicRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ Error de conexión a MongoDB Atlas:', err.message);
    process.exit(1);
  });

// Set Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Configure Express Session (12-hour expiration)
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta_para_sesiones',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    secure: false, // Set to true in production if HTTPS is available
    httpOnly: true
  }
}));

// Global Context Middleware (Flash messages, Admin user state, Project Name)
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  res.locals.adminUser = req.session.adminUser || null;
  res.locals.projectName = process.env.NAME_PROYECT || 'Live Bets';
  next();
});

// Register Routes
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);
app.get('/ping', (req, res) => {
  res.send('Pong');
});

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Página no encontrada');
  err.status = 404;
  next(err);
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[Error] ${status} - ${err.message}`);
  
  res.status(status).render('index', {
    predictions: [],
    formattedDate: 'Ocurrió un error',
    moment: require('moment'),
    title: 'Error',
    // Inject a custom inline error flash
    flash: { error: err.message || 'Ocurrió un error en el servidor.' }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  console.log(`📊 Aplicación cargada: ${process.env.NAME_PROYECT || 'Live Bets'}`);
});
