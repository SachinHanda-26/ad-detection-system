import React from 'react';
import BoundingBoxViewer from './BoundingBoxViewer';
import ReportCard from './ReportCard';

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100);
  let barClass = 'conf-bar-green';
  if (confidence >= 0.8) barClass = 'conf-bar-red';
  else if (confidence >= 0.5) barClass = 'conf-bar-yellow';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-10 text-right">{pct}%</span>
    </div>
  );
}

function ClassBadge({ className }) {
  const colours = {
    poster:      'bg-purple-100 text-purple-700',
    banner:      'bg-blue-100 text-blue-700',
    sticker:     'bg-teal-100 text-teal-700',
    graffiti_ad: 'bg-pink-100 text-pink-700',
  };
  const cls = colours[className] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {className}
    </span>
  );
}

export default function DetectionResult({ result }) {
  if (!result) return null;

  const {
    imageUrl,
    detections = [],
    count = 0,
    report,
    imageSize,
    processingTimeMs,
  } = result;

  const imageWidth  = imageSize?.width  || 0;
  const imageHeight = imageSize?.height || 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Count header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Detection Results
          {count > 0 ? (
            <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 text-sm rounded-full font-semibold">
              {count} found
            </span>
          ) : (
            <span className="ml-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-sm rounded-full font-semibold">
              Clean
            </span>
          )}
        </h2>
        {processingTimeMs != null && (
          <span className="text-xs text-gray-400">
            {(processingTimeMs / 1000).toFixed(2)}s processing
          </span>
        )}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left — Image with bounding boxes */}
        <div className="space-y-3">
          <BoundingBoxViewer
            imageUrl={imageUrl}
            detections={detections}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
          {imageWidth > 0 && (
            <p className="text-xs text-gray-400 text-center">
              {imageWidth} × {imageHeight} px
            </p>
          )}
        </div>

        {/* Right — Detection list */}
        <div className="space-y-3">
          {count === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-gray-600">No advertisements detected</p>
              <p className="text-sm mt-1">This image appears clean.</p>
            </div>
          ) : (
            detections.map((det, idx) => (
              <div key={idx} className="card-hover p-4">
                <div className="flex items-start justify-between mb-2">
                  <ClassBadge className={det.className} />
                  <span className="text-xs text-gray-400">Box #{idx + 1}</span>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1">Confidence</p>
                  <ConfidenceBar confidence={det.confidence} />
                </div>

                {det.bbox && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Bounding Box (px)</p>
                    <p className="text-xs font-mono text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                      x1={Math.round(det.bbox[0])} y1={Math.round(det.bbox[1])}&nbsp;
                      x2={Math.round(det.bbox[2])} y2={Math.round(det.bbox[3])}
                    </p>
                  </div>
                )}

                {det.label && (
                  <p className="mt-2 text-xs text-gray-500 italic">{det.label}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report card */}
      {report && <ReportCard report={report} />}
    </div>
  );
}
