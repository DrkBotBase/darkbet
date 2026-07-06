const moment = require('moment-timezone');
// Load Spanish locale for moment
require('moment/locale/es');
moment.locale('es');

const Prediccion = require('../models/Prediccion');
const { uploadFromBuffer, deleteImage } = require('../utils/cloudinary');
const { validationResult } = require('express-validator');

// Helper to get Colombia time range (UTC-5)
const getColombiaRange = (dateString) => {
  // Crear el momento en la zona horaria de Colombia
  const m = dateString 
    ? moment.tz(dateString, 'YYYY-MM-DD', 'America/Bogota') 
    : moment().tz('America/Bogota');
  
  // Obtener el inicio y fin del día en Colombia, convertir a UTC Date
  const start = m.clone().startOf('day').utc().toDate();
  const end = m.clone().endOf('day').utc().toDate();
  
  return { start, end };
};

// Helper para formatear fecha en Colombia
const formatColombiaDate = (dateString) => {
  const m = dateString 
    ? moment.tz(dateString, 'YYYY-MM-DD', 'America/Bogota')
    : moment().tz('America/Bogota');
  return {
    display: m.format('dddd, D [de] MMMM [de] YYYY'),
    iso: m.format('YYYY-MM-DD')
  };
};

/**
 * Public Controller Methods
 */

// GET / - Public landing page
const getPublicIndex = async (req, res, next) => {
  try {
    const { start, end } = getColombiaRange(req.query.date);
    
    const predictions = await Prediccion.find({
      fecha: { $gte: start, $lte: end }
    }).sort({ hora: 1 });
    
    // Fecha para mostrar
    const fechaInfo = formatColombiaDate(req.query.date);
    
    res.render('index', {
      predictions,
      formattedDate: fechaInfo.display,
      selectedDate: fechaInfo.iso,
      moment,
      title: process.env.NAME_PROYECT || 'Dark Bets'
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/predicciones
const getPublicApi = async (req, res, next) => {
  try {
    const { start, end } = getColombiaRange(req.query.date);
    
    const predictions = await Prediccion.find({
      fecha: { $gte: start, $lte: end }
    }).sort({ hora: 1 });
    
    const fechaInfo = formatColombiaDate(req.query.date);
    
    res.json({
      success: true,
      fecha: fechaInfo.iso,
      predictions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin Controller Methods
 */

// GET /admin/login - Render login view
const getLogin = (req, res) => {
  res.render('admin/login', { error: null });
};

// POST /admin/login - Process login
const postLogin = (req, res) => {
  const { username, password } = req.body;
  
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (username === expectedUser && password === expectedPassword) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    req.session.flash = { success: '¡Bienvenido al panel de administración!' };
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', { error: 'Usuario o contraseña incorrectos.' });
};

// GET /admin/logout - Clear session and logout
const getLogout = (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
};

// GET /admin/dashboard - Render admin panel
const getDashboard = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    // Date filter usando Colombia
    const { start, end } = getColombiaRange(req.query.date);
    
    // Combined Filters
    const filter = {
      fecha: { $gte: start, $lte: end }
    };
    
    if (req.query.estado && ['pendiente', 'ganada', 'perdida'].includes(req.query.estado)) {
      filter.estado = req.query.estado;
    }
    
    const totalItems = await Prediccion.countDocuments(filter);
    const predictions = await Prediccion.find(filter)
      .sort({ fecha: -1, hora: -1 })
      .skip(skip)
      .limit(limit);
    
    // Fecha seleccionada en Colombia
    const fechaInfo = formatColombiaDate(req.query.date);
      
    res.render('admin/dashboard', {
      predictions,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      currentFilter: req.query.estado || '',
      selectedDate: fechaInfo.iso,
      moment
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/crear - Render creation form
const getCrear = (req, res) => {
  const defaultDate = moment().tz('America/Bogota').format('YYYY-MM-DD');
  res.render('admin/crear', {
    errors: [],
    oldInput: {
      fecha: defaultDate,
      estado: 'pendiente'
    }
  });
};

// POST /admin/crear - Handle creation of new prediction
const postCrear = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('admin/crear', {
      errors: errors.array(),
      oldInput: req.body
    });
  }
  
  try {
    const { encuentro, fecha, hora, prediccion, cuota, estado, notas } = req.body;
    
    // Parsear la fecha como Colombia (UTC-5) y convertir a Date
    const parsedFecha = moment.tz(fecha, 'YYYY-MM-DD', 'America/Bogota').toDate();
    
    let imagenUrl = null;
    let imagenPublicId = null;
    
    // Upload image to Cloudinary if supplied
    if (req.file) {
      const uploadResult = await uploadFromBuffer(req.file.buffer);
      imagenUrl = uploadResult.secure_url;
      imagenPublicId = uploadResult.public_id;
    }
    
    const newPrediction = new Prediccion({
      encuentro,
      fecha: parsedFecha,
      hora,
      prediccion,
      cuota,
      estado,
      notas: notas || null,
      imagenUrl,
      imagenPublicId,
      fechaResultado: estado !== 'pendiente' ? new Date() : null
    });
    
    await newPrediction.save();
    
    req.session.flash = { success: 'Predicción creada exitosamente.' };
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
};

// GET /admin/editar/:id - Render edit form
const getEditar = async (req, res, next) => {
  try {
    const prediction = await Prediccion.findById(req.params.id);
    if (!prediction) {
      req.session.flash = { error: 'Predicción no encontrada.' };
      return res.redirect('/admin/dashboard');
    }
    
    // Formatear fecha desde la BD (que está en UTC) a Colombia
    const formattedFecha = moment(prediction.fecha).tz('America/Bogota').format('YYYY-MM-DD');
    
    res.render('admin/editar', {
      prediction,
      errors: [],
      formattedFecha
    });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/editar/:id - Handle updating existing prediction
const postEditar = async (req, res, next) => {
  const errors = validationResult(req);
  
  try {
    const prediction = await Prediccion.findById(req.params.id);
    if (!prediction) {
      req.session.flash = { error: 'Predicción no encontrada.' };
      return res.redirect('/admin/dashboard');
    }
    
    if (!errors.isEmpty()) {
      const formattedFecha = moment(prediction.fecha).tz('America/Bogota').format('YYYY-MM-DD');
      return res.status(400).render('admin/editar', {
        prediction: { ...prediction.toObject(), ...req.body },
        errors: errors.array(),
        formattedFecha
      });
    }
    
    const { encuentro, fecha, hora, prediccion: descPrediccion, cuota, estado, notas } = req.body;
    
    // Validación: No permitir cambiar el estado a "ganada" o "perdida" sin imagen
    const hasImage = prediction.imagenUrl || req.file;
    if ((estado === 'ganada' || estado === 'perdida') && !hasImage) {
      const formattedFecha = moment(prediction.fecha).tz('America/Bogota').format('YYYY-MM-DD');
      return res.status(400).render('admin/editar', {
        prediction: { ...prediction.toObject(), ...req.body },
        errors: [{ msg: 'Debe subir una imagen de evidencia para marcar la predicción como Ganada o Perdida.' }],
        formattedFecha
      });
    }
    
    // Parsear fecha como Colombia (UTC-5)
    const parsedFecha = moment.tz(fecha, 'YYYY-MM-DD', 'America/Bogota').toDate();
    
    prediction.encuentro = encuentro;
    prediction.fecha = parsedFecha;
    prediction.hora = hora;
    prediction.prediccion = descPrediccion;
    prediction.cuota = cuota;
    prediction.notas = notas || null;
    
    // Update state & outcome date
    if (prediction.estado !== estado) {
      prediction.estado = estado;
      prediction.fechaResultado = estado !== 'pendiente' ? new Date() : null;
    }
    
    // If a new file is uploaded, replace existing
    if (req.file) {
      // Delete old if exists
      if (prediction.imagenPublicId) {
        await deleteImage(prediction.imagenPublicId);
      }
      
      const uploadResult = await uploadFromBuffer(req.file.buffer);
      prediction.imagenUrl = uploadResult.secure_url;
      prediction.imagenPublicId = uploadResult.public_id;
    }
    
    await prediction.save();
    
    req.session.flash = { success: 'Predicción actualizada exitosamente.' };
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/eliminar/:id - Delete prediction
const postEliminar = async (req, res, next) => {
  try {
    const prediction = await Prediccion.findById(req.params.id);
    if (!prediction) {
      req.session.flash = { error: 'Predicción no encontrada.' };
      return res.redirect('/admin/dashboard');
    }
    
    // Delete image from Cloudinary
    if (prediction.imagenPublicId) {
      await deleteImage(prediction.imagenPublicId);
    }
    
    await Prediccion.findByIdAndDelete(req.params.id);
    
    req.session.flash = { success: 'Predicción eliminada exitosamente.' };
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/eliminar-imagen/:id - Delete only the image
const postEliminarImagen = async (req, res, next) => {
  try {
    const prediction = await Prediccion.findById(req.params.id);
    if (!prediction) {
      req.session.flash = { error: 'Predicción no encontrada.' };
      return res.redirect('/admin/dashboard');
    }
    
    // Ensure we do not mark as won/lost without image
    if (prediction.estado === 'ganada' || prediction.estado === 'perdida') {
      req.session.flash = { error: 'No se puede eliminar la imagen de evidencia si la predicción está marcada como Ganada o Perdida.' };
      return res.redirect(`/admin/editar/${prediction._id}`);
    }
    
    if (prediction.imagenPublicId) {
      await deleteImage(prediction.imagenPublicId);
    }
    
    prediction.imagenUrl = null;
    prediction.imagenPublicId = null;
    await prediction.save();
    
    req.session.flash = { success: 'Imagen eliminada exitosamente.' };
    res.redirect(`/admin/editar/${prediction._id}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicIndex,
  getPublicApi,
  getLogin,
  postLogin,
  getLogout,
  getDashboard,
  getCrear,
  postCrear,
  getEditar,
  postEditar,
  postEliminar,
  postEliminarImagen
};