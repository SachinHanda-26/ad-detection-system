import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar    from './components/Navbar';
import Dashboard from './pages/Dashboard';
import History   from './pages/History';
import Reports   from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      {/* Fixed sidebar */}
      <Navbar />

      {/* Main content area — offset by sidebar width (w-64 = 16rem) */}
      <main className="ml-64 min-h-screen bg-gray-50">
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports" element={<Reports />} />
          {/* Redirect unknown routes to dashboard */}
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
