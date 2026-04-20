'use strict';

/**
 * reportController.js
 *
 * GET    /api/reports       — paginated list of all detection reports
 * GET    /api/reports/:id   — single report by ID
 * DELETE /api/reports/:id   — delete a report by ID
 */

const mongoose = require('mongoose');
const Detection = require('../models/Detection');

// ── GET /api/reports ──────────────────────────────────────────────────────────
async function getAll(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Detection.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Detection.countDocuments({}),
    ]);

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext:    page * limit < total,
          hasPrev:    page > 1,
        },
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        data:    null,
        error:   'Invalid detection ID format.',
      });
    }

    const record = await Detection.findById(id).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        data:    null,
        error:   `No detection found with ID: ${id}`,
      });
    }

    return res.json({ success: true, data: record, error: null });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/reports/:id ───────────────────────────────────────────────────
async function deleteOne(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        data:    null,
        error:   'Invalid detection ID format.',
      });
    }

    const deleted = await Detection.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        data:    null,
        error:   `No detection found with ID: ${id}`,
      });
    }

    // Optionally delete the uploaded image file
    const fs   = require('fs');
    const path = require('path');
    if (deleted.imageUrl) {
      const filePath = path.join(__dirname, '..', deleted.imageUrl.replace(/^\//, ''));
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn('[reportController] Could not delete image file:', unlinkErr.message);
        }
      });
    }

    return res.json({
      success: true,
      data:    { deleted: true, id },
      error:   null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getOne, deleteOne };
