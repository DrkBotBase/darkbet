const mongoose = require('mongoose');

const PrediccionSchema = new mongoose.Schema({
  // Información del partido
  encuentro: {
    type: String,
    required: true,
    trim: true
  },
  
  // Hora del partido
  hora: {
    type: String,
    required: true
  },
  
  // Fecha del partido
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Detalle de la predicción
  prediccion: {
    type: String,
    required: true,
    trim: true
  },
  
  // Cuota/odds
  cuota: {
    type: String,
    required: true
  },
  
  // Estado de la predicción
  estado: {
    type: String,
    enum: ['pendiente', 'ganada', 'perdida'],
    default: 'pendiente',
    required: true
  },
  
  // URL de la imagen en Cloudinary
  imagenUrl: {
    type: String,
    default: null
  },
  
  // Public ID de Cloudinary para eliminar después
  imagenPublicId: {
    type: String,
    default: null
  },
  
  // Fecha cuando se actualizó el estado
  fechaResultado: {
    type: Date,
    default: null
  },
  
  // Notas adicionales (opcional)
  notas: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LvPrediccion', PrediccionSchema, 'predicciones');
