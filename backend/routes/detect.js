'use strict';

const express          = require('express');
const upload           = require('../middleware/upload');
const detectController = require('../controllers/detectController');

const router = express.Router();

// Multer error handler specific to this route
function handleMulterError(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      data:    null,
      error:   'File too large. Maximum allowed size is 10 MB.',
    });
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      data:    null,
      error:   'Unexpected file field. Use field name "image".',
    });
  }
  if (err) {
    return res.status(err.status || 400).json({
      success: false,
      data:    null,
      error:   err.message,
    });
  }
  next();
}

// POST /api/detect
router.post('/', upload.single('image'), handleMulterError, detectController.detect);

module.exports = router;
