import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OapProvider } from './context/OapContext';
import PublicLayout from './components/PublicLayout';
import PublicHome from './pages/public/PublicHome';
import PublicAbout from './pages/public/PublicAbout';
import PublicApply from './pages/public/PublicApply';
import PublicConfirmation from './pages/public/PublicConfirmation';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import StudentManagement from './pages/admin/StudentManagement';
import ApplicantManagement from './pages/admin/ApplicantManagement';
import ReviewApplication from './pages/admin/ReviewApplication';
import RoomBedManagement from './pages/admin/RoomBedManagement';
import OccupancyMonitoring from './pages/admin/OccupancyMonitoring';
import AttendanceMonitoring from './pages/admin/AttendanceMonitoring';

function ComingSoon({ title }: { title: string }) {
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
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicHome />} />
            <Route path="/about" element={<PublicAbout />} />
            <Route path="/apply" element={<PublicApply />} />
            <Route path="/apply/confirmation" element={<PublicConfirmation />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="applicants" element={<ApplicantManagement />} />
            <Route path="applicants/:id" element={<ReviewApplication />} />
            <Route path="rooms" element={<RoomBedManagement />} />
            <Route path="occupancy" element={<OccupancyMonitoring />} />
            <Route path="attendance" element={<AttendanceMonitoring />} />
            <Route path="pass-slips" element={<ComingSoon title="Pass Slip Management" />} />
            <Route path="monitoring" element={<ComingSoon title="Resident Monitoring" />} />
            <Route path="renewals" element={<ComingSoon title="Renewal Management" />} />
            <Route path="analytics" element={<ComingSoon title="Analytics and Reports" />} />
            <Route path="users" element={<ComingSoon title="User Management" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </OapProvider>
  );
}
