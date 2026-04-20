import React, { useState, useRef, useCallback } from 'react';
import { detectImage } from '../services/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="w-12 h-12 text-gray-300 mx-auto mb-3">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function UploadPanel({ onResult }) {
  const [selectedFile, setSelectedFile]         = useState(null);
  const [preview, setPreview]                   = useState(null);
  const [dragging, setDragging]                 = useState(false);
  const [location, setLocation]                 = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState(null);
  const [processingTime, setProcessingTime]     = useState(null);
  const fileInputRef                            = useRef(null);

  // ── File helpers ──────────────────────────────────────────────────────────
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are supported.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File exceeds 10 MB limit.';
    }
    return null;
  };

  const applyFile = useCallback((file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setProcessingTime(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  }, []);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (location) formData.append('locationDescription', location);

    try {
      const res = await detectImage(formData);
      const data = res.data?.data || res.data;
      setProcessingTime(data.processingTimeMs);
      if (onResult) onResult(data);
    } catch (err) {
      setError(err.message || 'Detection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setProcessingTime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="card animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Street Image</h2>

      {/* Drop zone */}
      {!preview ? (
        <div
          className={`upload-zone${dragging ? ' dragging' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload image drop zone"
        >
          <UploadIcon />
          <p className="text-gray-500 font-medium">Drag & drop an image here</p>
          <p className="text-gray-400 text-sm mt-1">or <span className="text-indigo-600 font-medium">click to browse</span></p>
          <p className="text-gray-400 text-xs mt-3">JPEG, PNG, WebP · max 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={onChange}
            className="hidden"
            id="imageFileInput"
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 mb-4">
          <img
            src={preview}
            alt="Selected preview"
            className="w-full max-h-72 object-contain bg-gray-900"
          />
          <button
            onClick={clearFile}
            className="absolute top-3 right-3 w-8 h-8 bg-gray-900/70 hover:bg-gray-900
                       text-white rounded-full flex items-center justify-center text-sm
                       backdrop-blur-sm transition-colors"
            aria-label="Remove image"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-3 bg-gray-900/70 text-white text-xs
                          px-3 py-1 rounded-full backdrop-blur-sm">
            {selectedFile?.name}
          </div>
        </div>
      )}

      {/* Location input */}
      <div className="mt-4">
        <label htmlFor="locationInput" className="block text-sm font-medium text-gray-600 mb-1.5">
          Location Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="locationInput"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Main Street near City Hall, 40.7128,-74.0060"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                     transition-all placeholder-gray-400"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-fade-in">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Processing time */}
      {processingTime != null && !loading && (
        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Analysis completed in {(processingTime / 1000).toFixed(2)}s
        </div>
      )}

      {/* Analyze button */}
      <div className="mt-5">
        <button
          id="analyzeButton"
          onClick={handleSubmit}
          disabled={!selectedFile || loading}
          className="btn-primary w-full justify-center text-base py-3"
        >
          {loading ? (
            <>
              <Spinner />
              <span>Analyzing image…</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              Analyze Image
            </>
          )}
        </button>
      </div>
    </div>
  );
}
