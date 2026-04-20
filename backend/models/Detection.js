'use strict';

const mongoose = require('mongoose');

// ── Sub-schema: single detection box ─────────────────────────────────────────
const DetectionBoxSchema = new mongoose.Schema(
  {
    className:  { type: String, required: true, trim: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    bbox:       { type: [Number], validate: { validator: (v) => v.length === 4, message: 'bbox must have exactly 4 values [x1,y1,x2,y2]' } },
    label:      { type: String, trim: true, default: '' }, // human-readable label from LLM
  },
  { _id: false }
);

// ── Sub-schema: LLM-generated report ─────────────────────────────────────────
const ReportSchema = new mongoose.Schema(
  {
    summary:     { type: String, default: '' },
    legalStatus: {
      type:    String,
      enum:    ['unauthorized', 'likely_unauthorized', 'needs_review', 'authorized', 'unknown'],
      default: 'unknown',
    },
    recommendation: { type: String, default: '' },
    rawText:        { type: String, default: '' },
  },
  { _id: false }
);

// ── Sub-schema: location ──────────────────────────────────────────────────────
const LocationSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    gps: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
);

// ── Sub-schema: image metadata ────────────────────────────────────────────────
const MetadataSchema = new mongoose.Schema(
  {
    imageWidth:       { type: Number, default: 0 },
    imageHeight:      { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 },
  },
  { _id: false }
);

// ── Main Detection schema ─────────────────────────────────────────────────────
const DetectionSchema = new mongoose.Schema(
  {
    imageUrl:         { type: String, required: true },
    originalFilename: { type: String, required: true },
    detections:       { type: [DetectionBoxSchema], default: [] },
    count:            { type: Number, default: 0 },
    report:           { type: ReportSchema, default: () => ({}) },
    location:         { type: LocationSchema, default: () => ({}) },
    metadata:         { type: MetadataSchema, default: () => ({}) },
    createdAt:        { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    versionKey: false,
  }
);

// Index for fast recent-first queries
DetectionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Detection', DetectionSchema);
