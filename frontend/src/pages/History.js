import React, { useEffect, useState, useCallback } from 'react';
import HistoryTable from '../components/HistoryTable';
import { getHistory, getStats } from '../services/api';

const PAGE_SIZE = 20;

function ClassStatCard({ name, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colours = {
    poster:      { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-400' },
    banner:      { bg: 'bg-blue-50',   text: 'text-blue-700',   bar: 'bg-blue-400' },
    sticker:     { bg: 'bg-teal-50',   text: 'text-teal-700',   bar: 'bg-teal-400' },
    graffiti_ad: { bg: 'bg-pink-50',   text: 'text-pink-700',   bar: 'bg-pink-400' },
  };
  const style = colours[name] || { bg: 'bg-gray-50', text: 'text-gray-700', bar: 'bg-gray-400' };

  return (
    <div className={`rounded-2xl p-4 ${style.bg} border border-white`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>{name.replace('_', ' ')}</p>
      <p className={`text-2xl font-bold mt-1 ${style.text}`}>{count}</p>
      <div className="mt-2 bg-white/70 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{pct}% of total</p>
    </div>
  );
}

export default function History() {
  const [records, setRecords]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [stats, setStats]         = useState(null);

  const fetchRecords = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (p - 1) * PAGE_SIZE;
      const res  = await getHistory(PAGE_SIZE, skip);
      const data = res.data?.data || res.data;
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res  = await getStats();
      setStats(res.data?.data || res.data);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchRecords(page);
    fetchStats();
  }, [fetchRecords, fetchStats, page]);

  const handlePageChange = (p) => {
    setPage(p);
    fetchRecords(p);
  };

  const handleDeleted = (id) => {
    setRecords((prev) => prev.filter((r) => r._id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    fetchStats();
  };

  const byClass = stats?.byClass || {};
  const classNames = ['poster', 'banner', 'sticker', 'graffiti_ad'];
  const totalBoxes = classNames.reduce((sum, c) => sum + (byClass[c] || 0), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Detection History</h1>
        <p className="text-gray-500 mt-1 text-sm">
          All previously analyzed images and their detection summaries.
        </p>
      </div>

      {/* Stats cards by class */}
      {totalBoxes > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {classNames.map((cls) => (
            <ClassStatCard
              key={cls}
              name={cls}
              count={byClass[cls] || 0}
              total={totalBoxes}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
          <button onClick={() => fetchRecords(page)} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <HistoryTable
        records={records}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        onPageChange={handlePageChange}
        onDeleted={handleDeleted}
        loading={loading}
      />
    </div>
  );
}
