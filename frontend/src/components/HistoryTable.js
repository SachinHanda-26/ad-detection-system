import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteReport } from '../services/api';
import { StatusBadge } from './ReportCard';

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * HistoryTable
 *
 * Props:
 *   records    {Array}    — array of Detection documents
 *   total      {number}   — total count for pagination
 *   page       {number}   — current page (1-indexed)
 *   limit      {number}   — items per page
 *   onPageChange(page)    — callback
 *   onDeleted  (id)       — callback when a record is deleted
 *   loading    {boolean}
 */
export default function HistoryTable({
  records = [],
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  onDeleted,
  loading = false,
}) {
  const navigate            = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this detection record? This cannot be undone.')) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteReport(id);
      if (onDeleted) onDeleted(id);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card overflow-hidden p-0">
      {/* Error */}
      {deleteError && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {deleteError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Filename</th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide"># Detections</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Legal Status</th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="skeleton h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  No detection records yet. Upload an image to get started.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const isDeleting = deletingId === record._id;
                return (
                  <tr key={record._id} className={`hover:bg-gray-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <span className="text-gray-700 font-medium truncate block" title={record.originalFilename}>
                        {record.originalFilename || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                        ${(record.count || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {record.count ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={record.report?.legalStatus || 'unknown'} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/reports?id=${record._id}`)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold
                                     px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(record._id)}
                          disabled={isDeleting}
                          className="btn-danger py-1.5 px-3 text-xs"
                        >
                          {isDeleting ? <Spinner /> : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600
                         hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                    ${page === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600
                         hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
