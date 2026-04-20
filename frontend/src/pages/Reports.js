import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReports, getReport, deleteReport } from '../services/api';
import { StatusBadge } from '../components/ReportCard';
import ReportCard from '../components/ReportCard';
import BoundingBoxViewer from '../components/BoundingBoxViewer';

const API_BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:3001';

const PAGE_SIZE = 12;

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ReportDetailModal({ id, onClose }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    getReport(id)
      .then((res) => setData(res.data?.data || res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100
                        flex items-center justify-between px-6 py-4 rounded-t-3xl">
          <h2 className="font-bold text-gray-800 text-lg">Detection Report</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-6 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6">
              {/* Meta */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-gray-700">{data.originalFilename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(data.createdAt)}</p>
                </div>
                <StatusBadge status={data.report?.legalStatus} />
              </div>

              {/* Image */}
              {data.imageUrl && (
                <BoundingBoxViewer
                  imageUrl={data.imageUrl}
                  detections={data.detections || []}
                  imageWidth={data.metadata?.imageWidth}
                  imageHeight={data.metadata?.imageHeight}
                />
              )}

              {/* Report card */}
              {data.report && <ReportCard report={data.report} />}

              {/* Detection list */}
              {data.detections?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3">Detection Details</h3>
                  <div className="space-y-2">
                    {data.detections.map((det, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm font-medium text-gray-700">{det.className}</span>
                        <span className="text-xs text-gray-400">{Math.round(det.confidence * 100)}% conf</span>
                        <span className="text-xs font-mono text-gray-400">
                          [{det.bbox?.map(Math.round).join(', ')}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [selectedId, setSelectedId]     = useState(searchParams.get('id') || null);

  const fetchReports = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await getReports(p, PAGE_SIZE);
      const data = res.data?.data || res.data;
      setRecords(data.records || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(page);
  }, [fetchReports, page]);

  // Open modal from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setSelectedId(id);
  }, [searchParams]);

  const openModal = (id) => {
    setSelectedId(id);
    setSearchParams({ id });
  };

  const closeModal = () => {
    setSelectedId(null);
    setSearchParams({});
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await deleteReport(id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1 text-sm">
          All enforcement reports generated from CV analysis. Click any card to view full details.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
          {error}
          <button onClick={() => fetchReports(page)} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && !error && (
        <div className="card text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-medium text-gray-600">No reports found</p>
          <p className="text-sm mt-1">Analyze images on the Dashboard to generate reports.</p>
        </div>
      )}

      {/* Report cards grid */}
      {!loading && records.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {records.map((record) => (
              <div
                key={record._id}
                className="card-hover cursor-pointer group"
                onClick={() => openModal(record._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openModal(record._id)}
              >
                {/* Thumbnail */}
                {record.imageUrl && (
                  <div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-gray-900">
                    <img
                      src={`${API_BASE}${record.imageUrl}`}
                      alt={record.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-700 truncate">
                    {record.originalFilename || 'Untitled'}
                  </p>
                  <StatusBadge status={record.report?.legalStatus || 'unknown'} />
                </div>

                <p className="text-xs text-gray-400 mt-1">{formatDate(record.createdAt)}</p>

                {record.report?.summary && (
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
                    {record.report.summary}
                  </p>
                )}

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${(record.count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {record.count || 0} detection{record.count !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, record._id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border
                           border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border
                           border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedId && (
        <ReportDetailModal id={selectedId} onClose={closeModal} />
      )}
    </div>
  );
}
