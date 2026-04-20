'use strict';

/**
 * detectController.js
 *
 * POST /api/detect
 * Orchestrates: file validation → ML inference → LLM report → DB save → response
 */

const path             = require('path');
const Detection        = require('../models/Detection');
const { runInference } = require('../services/inferenceService');
const { generateReport } = require('../services/llmService');

/**
 * POST /api/detect
 * Expects: multipart/form-data with field "image" (handled by multer upload middleware)
 * Optional body field: location (JSON string with { description, lat, lng })
 */
async function detect(req, res, next) {
  // ── 1. Validate file ───────────────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({
      success: false,
      data:    null,
      error:   'No image file uploaded. Send a multipart/form-data request with field "image".',
    });
  }

  const startTime   = Date.now();
  const { filename, path: imagePath, originalname } = req.file;

  // ── 2. Parse optional location ─────────────────────────────────────────────
  let locationData = { description: '', gps: { lat: null, lng: null } };
  if (req.body.location) {
    try {
      const parsed = typeof req.body.location === 'string'
        ? JSON.parse(req.body.location)
        : req.body.location;
      locationData = {
        description: parsed.description || '',
        gps: {
          lat: parseFloat(parsed.lat) || null,
          lng: parseFloat(parsed.lng) || null,
        },
      };
    } catch {
      // Location is optional — ignore parse errors
    }
  }
  // Also accept flat body fields
  if (req.body.locationDescription) {
    locationData.description = req.body.locationDescription;
  }

  // ── 3. Run ML inference ────────────────────────────────────────────────────
  let inferenceResult;
  try {
    inferenceResult = await runInference(imagePath);
  } catch (inferenceErr) {
    console.error('[detectController] Inference error:', inferenceErr.message);
    const statusCode = inferenceErr.status || 503;
    return res.status(statusCode).json({
      success: false,
      data:    null,
      error:   inferenceErr.message,
    });
  }

  const { detections, count, imageSize } = inferenceResult;
  const [imageWidth, imageHeight] = imageSize || [0, 0];
  const imageInfo = { width: imageWidth, height: imageHeight };

  // ── 4. Generate LLM report ─────────────────────────────────────────────────
  let report;
  try {
    report = await generateReport(detections, imageInfo);
  } catch (llmErr) {
    console.error('[detectController] LLM error:', llmErr.message);
    // Non-fatal — create a minimal report
    report = {
      summary:        'Report generation failed.',
      legalStatus:    count > 0 ? 'needs_review' : 'authorized',
      recommendation: 'Manual review required.',
      rawText:        `LLM error: ${llmErr.message}`,
    };
  }

  const processingTimeMs = Date.now() - startTime;

  // ── 5. Save to MongoDB ─────────────────────────────────────────────────────
  let savedDoc;
  try {
    savedDoc = await Detection.create({
      imageUrl:         `/uploads/${filename}`,
      originalFilename: originalname,
      detections,
      count,
      report: {
        summary:        report.summary,
        legalStatus:    report.legalStatus,
        recommendation: report.recommendation,
        rawText:        report.rawText || '',
      },
      location: locationData,
      metadata: {
        imageWidth,
        imageHeight,
        processingTimeMs,
      },
    });
  } catch (dbErr) {
    console.error('[detectController] DB save error:', dbErr.message);
    return res.status(500).json({
      success: false,
      data:    null,
      error:   'Detection processed but failed to save to database: ' + dbErr.message,
    });
  }

  // ── 6. Respond ─────────────────────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    data: {
      detectionId:     savedDoc._id,
      imageUrl:        `/uploads/${filename}`,
      detections,
      count,
      report,
      processingTimeMs,
      imageSize: { width: imageWidth, height: imageHeight },
    },
    error: null,
  });
}

module.exports = { detect };
