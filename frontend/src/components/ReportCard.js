import React from 'react';

const STATUS_CONFIG = {
  unauthorized: {
    label: 'Unauthorized',
    classes: 'badge-unauthorized',
    dot: 'bg-red-500',
  },
  likely_unauthorized: {
    label: 'Likely Unauthorized',
    classes: 'badge-likely_unauthorized',
    dot: 'bg-orange-500',
  },
  needs_review: {
    label: 'Needs Review',
    classes: 'badge-needs_review',
    dot: 'bg-yellow-500',
  },
  authorized: {
    label: 'Authorized',
    classes: 'badge-authorized',
    dot: 'bg-green-500',
  },
  unknown: {
    label: 'Unknown',
    classes: 'badge-unknown',
    dot: 'bg-gray-400',
  },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  return (
    <span className={cfg.classes}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function ReportCard({ report }) {
  if (!report) return null;

  const {
    summary,
    legalStatus,
    recommendation,
    rawText,
    details,
  } = report;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Enforcement Report</h3>
        <StatusBadge status={legalStatus} />
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Summary</p>
          <p className="text-gray-700 text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">
            Recommended Action
          </p>
          <p className="text-indigo-700 text-sm leading-relaxed">{recommendation}</p>
        </div>
      )}

      {/* Details (from LLM) */}
      {(details || rawText) && (
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase
                              tracking-wide hover:text-gray-600 transition-colors select-none">
            Full Details
            <span className="ml-1 group-open:rotate-90 inline-block transition-transform">▶</span>
          </summary>
          <p className="mt-2 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            {details || rawText}
          </p>
        </details>
      )}

      {/* Download */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <button
          id="downloadReportBtn"
          onClick={handleDownload}
          className="btn-secondary text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Report (JSON)
        </button>
      </div>
    </div>
  );
}
