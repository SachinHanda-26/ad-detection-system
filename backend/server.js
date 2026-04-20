'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const mongoose   = require('mongoose');
const path       = require('path');

const detectRoutes  = require('./routes/detect');
const reportRoutes  = require('./routes/reports');
const historyRoutes = require('./routes/history');

// ── App Setup ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Static file serving (uploaded images) ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/detect',  detectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/history', historyRoutes);

// ── Root health probe ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'ad-detection-backend' },
    error: null,
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Global Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    data: null,
    error: err.message || 'Internal server error',
  });
});

// ── MongoDB connection with automatic retry ───────────────────────────────────
const MONGO_URI      = process.env.MONGODB_URI || 'mongodb://localhost:27017/ad_detection';
const RETRY_INTERVAL = 5000; // ms

function connectMongo() {
  console.log(`[MongoDB] Connecting to: ${MONGO_URI}`);
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
      console.log('[MongoDB] ✅ Connected successfully');
    })
    .catch((err) => {
      console.error(`[MongoDB] ❌ Connection failed: ${err.message}`);
      console.log(`[MongoDB] Retrying in ${RETRY_INTERVAL / 1000}s …`);
      setTimeout(connectMongo, RETRY_INTERVAL);
    });
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected. Attempting to reconnect …');
  setTimeout(connectMongo, RETRY_INTERVAL);
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  AdDetect backend running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   ML service  : ${process.env.ML_SERVICE_URL || 'http://localhost:8001'}\n`);
  connectMongo();
});

module.exports = app; // for testing
