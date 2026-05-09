'use strict';

/**
 * inferenceService.js
 *
 * Sends an uploaded image to the Python FastAPI inference microservice
 * (running on ML_SERVICE_URL / port 8001) and returns the detection results.
 */

const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const FormData = require('form-data');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const TIMEOUT_MS     = 100_000; // 100 s — inference can be slow on CPU (Render Free Tier)

/**
 * Run CV inference on the given image file.
 *
 * @param {string} imagePath  Absolute path to the image on disk.
 * @returns {Promise<{ detections: Array, imageSize: [number, number] }>}
 * @throws  Error with .status = 503 if the ML service is unreachable.
 */
async function runInference(imagePath) {
  if (!fs.existsSync(imagePath)) {
    const err = new Error(`Image not found on disk: ${imagePath}`);
    err.status = 500;
    throw err;
  }

  const form = new FormData();
  // Map extension to correct MIME type (FastAPI validates content-type)
  const extMimeMap = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
  };
  const ext = path.extname(imagePath).toLowerCase();
  const contentType = extMimeMap[ext] || 'image/jpeg';

  form.append('file', fs.createReadStream(imagePath), {
    filename:    path.basename(imagePath),
    contentType,
  });

  let response;
  try {
    response = await axios.post(`${ML_SERVICE_URL}/predict`, form, {
      headers:        { ...form.getHeaders() },
      timeout:        TIMEOUT_MS,
      maxContentLength: Infinity,
      maxBodyLength:  Infinity,
    });
  } catch (axiosError) {
    // Network error / service down
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND' || !axiosError.response) {
      const err = new Error(
        `ML inference service is unavailable at ${ML_SERVICE_URL}. ` +
        'Please start the FastAPI service: uvicorn inference_api:app --reload --port 8001'
      );
      err.status = 503;
      throw err;
    }

    // The ML service returned a non-2xx response
    const detail = axiosError.response?.data?.detail || axiosError.message;
    const err    = new Error(`ML service error: ${detail}`);
    err.status   = axiosError.response?.status || 502;
    throw err;
  }

  const { detections = [], count = 0, image_size = [0, 0] } = response.data;

  return {
    detections: detections.map((d) => ({
      className:  d.class_name,
      confidence: d.confidence,
      bbox:       d.bbox,
      label:      `${d.class_name} (${Math.round(d.confidence * 100)}% confidence)`,
    })),
    count,
    imageSize: image_size, // [width, height]
  };
}

/**
 * Ping the ML service health endpoint.
 * @returns {Promise<boolean>}
 */
async function checkMLHealth() {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
}

module.exports = { runInference, checkMLHealth };
