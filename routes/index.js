const express = require('express');
const router = express.Router();
const { getPublicIndex, getPublicApi } = require('../controllers/prediccionController');

// Public views
router.get('/', getPublicIndex);

// Public API
router.get('/api/predicciones', getPublicApi);

module.exports = router;
