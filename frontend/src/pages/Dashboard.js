import React, { useState, useEffect } from 'react';
import UploadPanel     from '../components/UploadPanel';
import DetectionResult from '../components/DetectionResult';
import { getStats }    from '../services/api';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || 'text-gray-800'}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [result, setResult]   = useState(null);
  const [stats,  setStats]    = useState(null);
  const [statsError, setStatsError] = useState(null);

  // Load stats on mount
  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data?.data || res.data))
      .catch((err) => setStatsError(err.message));
  }, []);

  // Refresh stats after a new detection
  const handleResult = (data) => {
    setResult(data);
    getStats()
      .then((res) => setStats(res.data?.data || res.data))
      .catch(() => {});
  };

  const avgConf = stats?.avgConfidence
    ? `${(stats.avgConfidence * 100).toFixed(1)}%`
    : '—';

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Upload street images to detect and analyze unauthorized advertisements.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Analyzed"
          value={stats?.totalDetections ?? '—'}
          sub="all time"
        />
        <StatCard
          label="Unauthorized"
          value={stats?.unauthorizedCount ?? '—'}
          sub="flagged images"
          accent="text-red-600"
        />
        <StatCard
          label="Avg Confidence"
          value={avgConf}
          sub="across all detections"
          accent="text-indigo-600"
        />
        <StatCard
          label="Recent (7 days)"
          value={stats?.recentCount ?? '—'}
          sub="new detections"
        />
      </div>

      {statsError && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
          Could not load stats: {statsError}
        </div>
      )}

      {/* Main content — upload + result */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Upload panel */}
        <div className="xl:col-span-2">
          <UploadPanel onResult={handleResult} />
        </div>

        {/* Detection result */}
        <div className="xl:col-span-3">
          {result ? (
            <DetectionResult result={result} />
          ) : (
            <div className="card h-full min-h-[300px] flex flex-col items-center justify-center text-center text-gray-400">
              <svg
                className="w-16 h-16 mb-4 text-gray-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                     -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="font-medium text-gray-500">Awaiting analysis</p>
              <p className="text-sm mt-1">Upload an image to see detection results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
