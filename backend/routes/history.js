'use strict';

const express           = require('express');
const historyController = require('../controllers/historyController');

const router = express.Router();

// NOTE: /stats must be defined BEFORE /:id style routes to avoid being caught as an ID
// GET /api/history/stats
router.get('/stats', historyController.getStats);

// GET /api/history
router.get('/', historyController.getHistory);

module.exports = router;
