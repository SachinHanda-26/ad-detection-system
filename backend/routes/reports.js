'use strict';

const express          = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

// GET /api/reports
router.get('/', reportController.getAll);

// GET /api/reports/:id
router.get('/:id', reportController.getOne);

// DELETE /api/reports/:id
router.delete('/:id', reportController.deleteOne);

module.exports = router;
