'use strict';

/**
 * historyController.js
 *
 * GET /api/history        — paginated detection list (most recent first)
 * GET /api/history/stats  — aggregate statistics
 */

const Detection = require('../models/Detection');

// ── GET /api/history ──────────────────────────────────────────────────────────
async function getHistory(req, res, next) {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip  = Math.max(0, parseInt(req.query.skip,  10) || 0);

    const [records, total] = await Promise.all([
      Detection.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('imageUrl originalFilename count report.legalStatus createdAt metadata.processingTimeMs')
        .lean(),
      Detection.countDocuments({}),
    ]);

    return res.json({
      success: true,
      data: {
        records,
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/history/stats ────────────────────────────────────────────────────
async function getStats(req, res, next) {
  try {
    // Total detections (documents)
    const totalDetections = await Detection.countDocuments({});

    // Detections in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount  = await Detection.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Aggregate: count per class and average confidence
    const classAgg = await Detection.aggregate([
      { $unwind: '$detections' },
      {
        $group: {
          _id:           '$detections.className',
          count:         { $sum: 1 },
          totalConf:     { $sum: '$detections.confidence' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const byClass      = {};
    let totalConfSum   = 0;
    let totalDetBoxes  = 0;

    for (const entry of classAgg) {
      byClass[entry._id] = entry.count;
      totalConfSum  += entry.totalConf;
      totalDetBoxes += entry.count;
    }

    const avgConfidence = totalDetBoxes > 0
      ? parseFloat((totalConfSum / totalDetBoxes).toFixed(4))
      : 0;

    // Count unauthorized
    const unauthorizedCount = await Detection.countDocuments({
      'report.legalStatus': { $in: ['unauthorized', 'likely_unauthorized'] },
    });

    return res.json({
      success: true,
      data: {
        totalDetections,
        unauthorizedCount,
        recentCount,
        byClass,
        avgConfidence,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHistory, getStats };
