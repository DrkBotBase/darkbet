const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');

const { requireAuth, redirectIfLoggedIn, adminLimiter } = require('../middleware/auth');
const {
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
} = require('../controllers/prediccionController');

// Multer setup for memory buffer uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagen no permitido. Solo se aceptan .jpg, .jpeg, .png, .webp'), false);
    }
  }
});

// Middleware to gracefully handle multer errors (such as file too large or incorrect formats)
const handleUpload = (fieldName) => {
  const uploadMiddleware = upload.single(fieldName);
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        req.session.flash = { error: err.message };
        return res.redirect('back');
      }
      next();
    });
  };
};

// Validation rules for Predictions
const validatePrediccion = [
  body('encuentro')
    .trim()
    .notEmpty().withMessage('El encuentro es requerido (Ej: Brasil vs Noruega).'),
  body('fecha')
    .notEmpty().withMessage('La fecha es requerida.')
    .isDate().withMessage('La fecha debe ser válida.'),
  body('hora')
    .notEmpty().withMessage('La hora es requerida.')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('La hora debe estar en formato válido HH:MM.'),
  body('prediccion')
    .trim()
    .notEmpty().withMessage('El detalle de la predicción es requerido.'),
  body('cuota')
    .trim()
    .notEmpty().withMessage('La cuota es requerida.')
    .isFloat({ min: 0.01 }).withMessage('La cuota debe ser un número decimal positivo (Ej: 1.60).'),
  body('estado')
    .isIn(['pendiente', 'ganada', 'perdida']).withMessage('El estado no es válido.'),
  body('notas')
    .optional({ checkFalsy: true })
    .trim()
];

// --- AUTHENTICATION ---
router.get('/login', redirectIfLoggedIn, getLogin);
router.post('/login', redirectIfLoggedIn, adminLimiter, postLogin);
router.get('/logout', getLogout);

// --- DASHBOARD & CRUD ---
router.get('/dashboard', requireAuth, getDashboard);
router.get('/crear', requireAuth, getCrear);
router.post('/crear', requireAuth, handleUpload('imagen'), validatePrediccion, postCrear);

router.get('/editar/:id', requireAuth, getEditar);
router.put('/editar/:id', requireAuth, handleUpload('imagen'), validatePrediccion, postEditar);

router.delete('/eliminar/:id', requireAuth, postEliminar);
router.delete('/eliminar-imagen/:id', requireAuth, postEliminarImagen);

module.exports = router;
