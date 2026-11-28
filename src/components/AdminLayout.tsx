import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BedDouble,
  Bell,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useOap } from '../context/useOap';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Student Management', icon: Users },
  { to: '/admin/applicants', label: 'Applicant Management', icon: UserCheck },
  { to: '/admin/rooms', label: 'Room and Bed Management', icon: BedDouble },
  { to: '/admin/occupancy', label: 'Occupancy Monitoring', icon: PieChart },
  { to: '/admin/attendance', label: 'Attendance Monitoring', icon: Clock },
  { to: '/admin/pass-slips', label: 'Pass Slip Management', icon: FileText },
  { to: '/admin/monitoring', label: 'Resident Monitoring', icon: ShieldCheck },
  { to: '/admin/renewals', label: 'Renewal Management', icon: RefreshCw },
  { to: '/admin/analytics', label: 'Analytics and Reports', icon: BarChart3 },
  { to: '/admin/users', label: 'User Management', icon: UserCog },
];

interface SearchResult {
  title: string;
  subtitle: string;
  to: string;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dormers, rooms, passSlips, renewalRequests, absenceAlerts, logout } = useOap();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);

  const pendingPassSlips = passSlips.filter((p) => p.request_status === 'pending').length;
  const pendingRenewals = renewalRequests.filter((r) => r.renewal_status === 'pending').length;
  const unreadCount =
    (pendingPassSlips > 0 ? 1 : 0) +
    (pendingRenewals > 0 ? 1 : 0) +
    (absenceAlerts.length > 0 ? 1 : 0);

  // Close popovers on Esc or outside click
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const searchResults: SearchResult[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matchedDormers = dormers
      .filter((d) =>
        `${d.first_name} ${d.last_name} ${d.student_number}`.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((d) => ({
        title: `${d.first_name} ${d.last_name}`,
        subtitle: `Student Management · ${d.student_number}`,
        to: '/admin/students',
      }));
    const matchedRooms = rooms
      .filter((r) => r.room_number.toLowerCase().includes(q))
      .slice(0, 2)
      .map((r) => ({
        title: `Room ${r.room_number}`,
        subtitle: 'Room and Bed Management',
        to: '/admin/rooms',
      }));
    return [...matchedDormers, ...matchedRooms];
  }, [searchQuery, dormers, rooms]);

  const handleGo = (path: string) => {
    setSearchOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-[#0F2447] text-slate-200">
      {/* University & OAP Branding */}
      <div className="flex items-center justify-center px-5 py-5 text-center border-b border-white/10">
        <img
          src="/oap-logo.png"
          alt="MSUN Girls Dormitory — Occupancy Analytics Platform"
          className="w-44 mx-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => {
                const isMatch = isActive || location.pathname.startsWith(item.to);
                return `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  isMatch
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`;
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F7FC] text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">{SidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 shrink-0 shadow-xl">{SidebarContent}</div>
          <div
            className="flex-1 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
            onKeyDown={() => {/* handled by Escape listener */}}
            role="presentation"
          />
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          ref={headerRef}
          className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-[#F4F7FC]/95 px-4 backdrop-blur lg:px-8"
        >
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search Input + Popover */}
            <div className="relative w-full max-w-md">
              <div
                className={`flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2 shadow-2xs transition ${
                  searchOpen
                    ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15'
                    : 'border-slate-200'
                }`}
              >
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    setSearchOpen(true);
                    setNotifOpen(false);
                    setProfileOpen(false);
                  }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students, rooms, requests..."
                  className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                />
                {searchOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-200"
                  >
                    Esc
                  </button>
                )}
              </div>

              {searchOpen && (
                <div className="absolute left-0 top-12 z-40 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:w-[440px]">
                  <p className="text-sm font-semibold text-slate-900">Search the platform</p>
                  <p className="text-xs text-slate-500">
                    Find a student, room, or management page.
                  </p>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      {searchQuery.trim() ? 'Matching Results' : 'Recent Searches'}
                    </p>
                    <div className="space-y-1">
                      {(searchQuery.trim()
                        ? searchResults
                        : [
                            { title: 'Juana Dela Cruz', subtitle: 'Student Management', to: '/admin/students' },
                            { title: 'Room A-104', subtitle: 'Room and Bed Management', to: '/admin/rooms' },
                            { title: 'Maria Santos', subtitle: 'Student Management', to: '/admin/students' },
                          ]
                      ).map((item) => (
                        <button
                          key={`${item.title}-${item.subtitle}`}
                          type="button"
                          onClick={() => handleGo(item.to)}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock className="h-4 w-4 text-[#2563EB]" />
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                              <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-[#2563EB]" />
                        </button>
                      ))}
                      {searchQuery.trim() && searchResults.length === 0 && (
                        <p className="py-3 text-center text-xs text-slate-400">
                          No matching students or rooms found.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Quick Links
                    </p>
                    {[
                      { title: 'Student Management', desc: 'View residents and student records', to: '/admin/students' },
                      { title: 'Room and Bed Management', desc: 'Check rooms, beds, and availability', to: '/admin/rooms' },
                      { title: 'Pass Slip Management', desc: 'Review resident pass slip requests', to: '/admin/pass-slips' },
                    ].map((link) => (
                      <button
                        key={link.to}
                        type="button"
                        onClick={() => handleGo(link.to)}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <Search className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{link.title}</p>
                            <p className="text-[11px] text-slate-500">{link.desc}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[#2563EB]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Notifications & Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Bell + Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                  setSearchOpen(false);
                }}
                aria-label="Notifications"
                className="relative rounded-xl p-2 text-slate-600 hover:bg-white"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:w-96">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#2563EB]">
                        {unreadCount} unread
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      Close
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Stay on top of dormitory requests and alerts.
                  </p>

                  <p className="mt-4 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Needs Your Attention
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleGo('/admin/pass-slips')}
                      className="flex w-full items-start gap-3 rounded-xl bg-blue-50/60 p-3 text-left hover:bg-blue-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#2563EB]">
                        <Send className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-900">
                          {pendingPassSlips} pass slip request(s) pending
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Residents are waiting for permission to leave.
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-3.5 w-3.5 text-[#2563EB]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGo('/admin/renewals')}
                      className="flex w-full items-start gap-3 rounded-xl bg-emerald-50/60 p-3 text-left hover:bg-emerald-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <RefreshCw className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-900">
                          {pendingRenewals} renewal request(s) pending
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Review resident applications for the next term.
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-3.5 w-3.5 text-[#2563EB]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGo('/admin/monitoring')}
                      className="flex w-full items-start gap-3 rounded-xl bg-red-50/60 p-3 text-left hover:bg-red-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-900">
                          Resident attendance needs attention
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {absenceAlerts.length} resident(s) flagged for consecutive absences.
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-3.5 w-3.5 text-[#2563EB]" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                  setSearchOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F2447] text-xs font-bold text-white">
                  DP
                </span>
                <span className="hidden text-xs font-semibold text-slate-700 sm:inline">
                  Dormitory Personnel
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F2447] text-sm font-bold text-white">
                      DP
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Dormitory Personnel</p>
                      <p className="text-[11px] text-slate-500">MSU at Naawan</p>
                      <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                        Staff account
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleGo('/admin/users')}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-800">My profile</p>
                        <p className="text-[11px] text-slate-500">View personnel information</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[#2563EB]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-2 flex w-full items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      <span>Logout</span>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    OAP · Staff account
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 px-4 py-3 text-[11px] text-slate-500 lg:px-8">
          <span>OAP — Occupancy Analytics Platform | MSU at Naawan</span>
          <span>Version 1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
