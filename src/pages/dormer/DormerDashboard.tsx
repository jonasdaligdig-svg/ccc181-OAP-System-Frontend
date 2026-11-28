import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useOap } from '../../context/useOap';

export default function DormerDashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    dormers,
    roomAssignments,
    beds,
    rooms,
    buildings,
    passSlips,
    renewalRequests,
    notifications,
    logout,
  } = useOap();

  const dormer = useMemo(() => {
    if (!currentUser) return undefined;
    return dormers.find(
      (d) =>
        d.user_id === currentUser.user_id ||
        d.email.toLowerCase() === currentUser.username.toLowerCase()
    );
  }, [currentUser, dormers]);

  const assignmentInfo = useMemo(() => {
    if (!dormer) return null;
    const activeAssignment = roomAssignments.find(
      (r) => r.dormer_id === dormer.dormer_id && r.assignment_status === 'active'
    );
    if (!activeAssignment) return null;

    const bed = beds.find((b) => b.bed_id === activeAssignment.bed_id);
    const room = bed ? rooms.find((r) => r.room_id === bed.room_id) : undefined;
    const building = room ? buildings.find((b) => b.building_id === room.building_id) : undefined;

    return {
      assignment: activeAssignment,
      bedNumber: bed?.bed_number || '—',
      roomNumber: room?.room_number || '—',
      floor: room?.floor || '1st floor',
      buildingName: building?.building_name || 'Dormitory',
    };
  }, [dormer, roomAssignments, beds, rooms, buildings]);

  const stats = useMemo(() => {
    if (!dormer) {
      return {
        pendingPassSlips: 0,
        latestRenewalStatus: 'None filed',
        unreadNotifications: 0,
      };
    }
    const myPassSlips = passSlips.filter((p) => p.dormer_id === dormer.dormer_id);
    const pendingPassSlips = myPassSlips.filter((p) => p.request_status === 'pending').length;

    const myRenewals = renewalRequests.filter((r) => r.dormer_id === dormer.dormer_id);
    const latestRenewal = myRenewals[0];
    const latestRenewalStatus = latestRenewal
      ? latestRenewal.renewal_status.charAt(0).toUpperCase() + latestRenewal.renewal_status.slice(1)
      : 'None filed';

    const unreadNotifications = notifications.filter(
      (n) => currentUser && n.user_id === currentUser.user_id && !n.read_status
    ).length;

    return {
      pendingPassSlips,
      latestRenewalStatus,
      unreadNotifications,
    };
  }, [dormer, passSlips, renewalRequests, notifications, currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser || currentUser.role !== 'dormer') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FC] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-[#0F2447]">Dormer Session Required</h1>
          <p className="mt-2 text-xs text-slate-500">
            Please sign in with your dormer credentials to access your resident dashboard.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const fullName = dormer
    ? `${dormer.first_name} ${dormer.middle_name ? dormer.middle_name + ' ' : ''}${dormer.last_name}`.trim()
    : currentUser.username;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FC] text-slate-800">
      {/* Top Navbar */}
      <header className="bg-[#0F2447] text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/MSUN Logo.png"
              alt="MSUN Girls Dormitory OAP"
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-xs font-bold tracking-wider uppercase text-white">
                Dormer Portal
              </p>
              <p className="text-[11px] text-slate-300">MSU at Naawan Girls Dormitory</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{fullName}</p>
              <p className="text-[11px] font-mono text-slate-300">
                {dormer?.student_number || currentUser.student_number || 'Resident'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <section className="rounded-2xl bg-[#0F2447] p-7 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Active Dormer Account</span>
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome, {dormer?.first_name || fullName}
              </h1>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                {dormer
                  ? `${dormer.course} • ${dormer.year_level} • Student ID ${dormer.student_number}`
                  : currentUser.username}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 px-4 py-3 text-xs">
              <p className="text-slate-300">Resident Status</p>
              <p className="mt-0.5 font-bold text-white">
                {dormer?.status || (assignmentInfo ? 'Active Resident' : 'Pending Assignment')}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Status Summary Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Room Assignment</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold text-[#0F2447]">
              {assignmentInfo ? assignmentInfo.roomNumber : 'Unassigned'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {assignmentInfo
                ? `${assignmentInfo.buildingName} • ${assignmentInfo.bedNumber}`
                : 'Awaiting room allocation'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pass Slips</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold text-[#0F2447]">{stats.pendingPassSlips}</p>
            <p className="mt-1 text-xs text-slate-500">Pending permission request(s)</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Semester Renewal</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <RefreshCw className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold text-[#0F2447]">{stats.latestRenewalStatus}</p>
            <p className="mt-1 text-xs text-slate-500">Latest renewal request status</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Notifications</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Bell className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold text-[#0F2447]">{stats.unreadNotifications}</p>
            <p className="mt-1 text-xs text-slate-500">Unread dormitory alerts</p>
          </div>
        </section>

        {/* Room Details Card */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <BedDouble className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F2447]">My Room &amp; Bed Information</h2>
          </div>

          {assignmentInfo ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4 text-xs">
              <div className="rounded-xl bg-[#F4F7FC] p-4">
                <p className="font-semibold text-slate-500">Building</p>
                <p className="mt-1 font-bold text-[#0F2447]">{assignmentInfo.buildingName}</p>
              </div>
              <div className="rounded-xl bg-[#F4F7FC] p-4">
                <p className="font-semibold text-slate-500">Room &amp; Floor</p>
                <p className="mt-1 font-bold text-[#0F2447]">
                  {assignmentInfo.roomNumber} ({assignmentInfo.floor})
                </p>
              </div>
              <div className="rounded-xl bg-[#F4F7FC] p-4">
                <p className="font-semibold text-slate-500">Assigned Bed</p>
                <p className="mt-1 font-bold text-[#0F2447]">{assignmentInfo.bedNumber}</p>
              </div>
              <div className="rounded-xl bg-[#F4F7FC] p-4">
                <p className="font-semibold text-slate-500">Move-in Date</p>
                <p className="mt-1 font-bold text-[#0F2447]">
                  {assignmentInfo.assignment.start_date}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#F4F7FC] p-4 text-xs text-slate-600">
              <Clock className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <span>No active bed assignment found yet. Contact Dormitory Personnel for updates.</span>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200/70 px-6 py-4 text-center text-[11px] text-slate-500">
        OAP &mdash; Occupancy Analytics Platform | MSU at Naawan Dormer Portal
      </footer>
    </div>
  );
}
