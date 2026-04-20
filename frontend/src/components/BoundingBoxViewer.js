import React, { useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:3001';

/**
 * Returns stroke colour based on confidence value.
 */
function getBoxColor(confidence) {
  if (confidence >= 0.8) return '#ef4444'; // red
  if (confidence >= 0.5) return '#eab308'; // yellow
  return '#ffffff';                         // white
}

/**
 * BoundingBoxViewer
 *
 * Props:
 *   imageUrl   {string}  — relative URL (e.g. /uploads/...)
 *   detections {Array}   — array of { className, confidence, bbox: [x1,y1,x2,y2] }
 *   imageWidth {number}  — original image width in pixels (from model space)
 *   imageHeight{number}  — original image height in pixels
 */
export default function BoundingBoxViewer({ imageUrl, detections = [], imageWidth, imageHeight }) {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  const fullUrl = imageUrl?.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;

  const drawBoxes = useCallback(() => {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !detections.length) return;

    const { offsetWidth: renderedW, offsetHeight: renderedH } = img;
    if (renderedW === 0 || renderedH === 0) return;

    // Natural image size (fallback to props)
    const naturalW = img.naturalWidth  || imageWidth  || renderedW;
    const naturalH = img.naturalHeight || imageHeight || renderedH;

    // Scale factors to map model-space coordinates → rendered-image coordinates
    const scaleX = renderedW / naturalW;
    const scaleY = renderedH / naturalH;

    canvas.width  = renderedW;
    canvas.height = renderedH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, renderedW, renderedH);

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox || [0, 0, 0, 0];

      const rx1 = x1 * scaleX;
      const ry1 = y1 * scaleY;
      const rx2 = x2 * scaleX;
      const ry2 = y2 * scaleY;
      const bw  = rx2 - rx1;
      const bh  = ry2 - ry1;

      const color = getBoxColor(det.confidence);

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(rx1, ry1, bw, bh);

      // Label text
      const label     = `${det.className || 'unknown'} ${(det.confidence * 100).toFixed(0)}%`;
      const fontSize  = Math.max(11, Math.min(14, renderedW / 40));
      ctx.font        = `600 ${fontSize}px Inter, sans-serif`;

      const textMetrics = ctx.measureText(label);
      const textW       = textMetrics.width + 8;
      const textH       = fontSize + 6;
      const labelY      = ry1 > textH + 4 ? ry1 - textH - 2 : ry1 + 2;

      // Label background
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(rx1, labelY, textW, textH, 3);
      ctx.fill();

      // Label text
      ctx.fillStyle = color;
      ctx.fillText(label, rx1 + 4, labelY + textH - 4);
    });
  }, [detections, imageWidth, imageHeight]);

  // Draw on image load and on window resize
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const onLoad = () => drawBoxes();
    img.addEventListener('load', onLoad);
    if (img.complete) drawBoxes(); // already loaded

    const onResize = () => drawBoxes();
    window.addEventListener('resize', onResize);

    return () => {
      img.removeEventListener('load', onLoad);
      window.removeEventListener('resize', onResize);
    };
  }, [drawBoxes]);

  // Redraw when detections change
  useEffect(() => {
    drawBoxes();
  }, [drawBoxes]);

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-2xl text-gray-400 text-sm">
        No image available
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-900">
      <img
        ref={imgRef}
        src={fullUrl}
        alt="Detection result"
        className="w-full block"
        style={{ display: 'block' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
