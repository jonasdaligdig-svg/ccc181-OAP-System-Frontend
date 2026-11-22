import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OapProvider } from './context/OapContext';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';

function ComingSoon({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-xs text-slate-500">
        Ready to be built from your next Figma screen.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <OapProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students" element={<ComingSoon title="Student Management" />} />
            <Route path="applicants" element={<ComingSoon title="Applicant Management" />} />
            <Route path="rooms" element={<ComingSoon title="Room and Bed Management" />} />
            <Route path="occupancy" element={<ComingSoon title="Occupancy Monitoring" />} />
            <Route path="attendance" element={<ComingSoon title="Attendance Monitoring" />} />
            <Route path="pass-slips" element={<ComingSoon title="Pass Slip Management" />} />
            <Route path="monitoring" element={<ComingSoon title="Resident Monitoring" />} />
            <Route path="renewals" element={<ComingSoon title="Renewal Management" />} />
            <Route path="analytics" element={<ComingSoon title="Analytics and Reports" />} />
            <Route path="users" element={<ComingSoon title="User Management" />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </OapProvider>
  );
}