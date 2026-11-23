import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Bed,
  BedDouble,
  Calendar,
  ClipboardList,
  Clock,
  Fingerprint,
  Footprints,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { useOap } from '../../context/useOap';

interface DonutRingProps {
  percent: number;
  color?: string;
  label: string;
  sublabel: string;
}

function DonutRing({ percent, color = '#2563EB', label, sublabel }: DonutRingProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-slate-900">{label}</span>
        <span className="text-[10px] leading-tight text-slate-500">{sublabel}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    roomAssignments,
    occupancyStats,
    passSlips,
    renewalRequests,
    attendanceRecords,
    absenceAlerts,
  } = useOap();

  const [selectedBuilding, setSelectedBuilding] = useState('all');

  const activeResidents = roomAssignments.filter((r) => r.assignment_status === 'active').length;
  const currentlyOut = passSlips.filter(
    (p) => p.request_status === 'approved' || p.request_status === 'overdue'
  ).length;
  const pendingPassSlips = passSlips.filter((p) => p.request_status === 'pending').length;
  const pendingRenewals = renewalRequests.filter((r) => r.renewal_status === 'pending').length;

  // Attendance stats for latest date in records
  const latestDate = attendanceRecords.reduce(
    (max, r) => (r.attendance_date > max ? r.attendance_date : max),
    ''
  );
  const todayLogs = attendanceRecords.filter((r) => r.attendance_date === latestDate);
  const presentCount = todayLogs.filter(
    (r) => r.attendance_status === 'present' || r.attendance_status === 'excused'
  ).length;
  const absentCount = todayLogs.filter((r) => r.attendance_status === 'absent').length;
  const notRecordedCount = Math.max(0, activeResidents - presentCount - absentCount);
  const presentRate = activeResidents ? Math.round((presentCount / activeResidents) * 100) : 0;

  const displayedBuildings =
    selectedBuilding === 'all'
      ? occupancyStats.byBuilding
      : occupancyStats.byBuilding.filter((b) => String(b.building_id) === selectedBuilding);

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, <span className="font-normal">Dormitory Personnel!</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Here&apos;s what&apos;s happening in the dormitory today.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-2xs">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>Sunday, November 22, 2026</span>
        </div>
      </div>

      {/* Top Row: 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          {
            label: 'Total Residents',
            value: activeResidents,
            delta: 'Active',
            deltaColor: 'text-emerald-600',
            icon: Users,
            iconBg: 'bg-blue-100 text-[#2563EB]',
          },
          {
            label: 'Occupied Beds',
            value: occupancyStats.occupiedBeds,
            delta: `${occupancyStats.overallRate}%`,
            deltaColor: 'text-emerald-600',
            icon: BedDouble,
            iconBg: 'bg-emerald-100 text-emerald-600',
          },
          {
            label: 'Available Beds',
            value: occupancyStats.availableBeds,
            delta: `of ${occupancyStats.totalBeds}`,
            deltaColor: 'text-amber-600',
            icon: Bed,
            iconBg: 'bg-amber-100 text-amber-600',
          },
          {
            label: 'Currently Out',
            value: currentlyOut,
            delta: 'On Pass',
            deltaColor: 'text-purple-600',
            icon: Footprints,
            iconBg: 'bg-purple-100 text-purple-600',
          },
        ] as const).map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${kpi.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                </div>
              </div>
              <span className={`text-[11px] font-semibold ${kpi.deltaColor}`}>{kpi.delta}</span>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Building Occupancy + Pending Requests */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Building Occupancy */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-slate-900">Building Occupancy</h2>
            </div>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="all">All Buildings</option>
              {occupancyStats.byBuilding.map((b) => (
                <option key={b.building_id} value={String(b.building_id)}>
                  {b.building_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <div className="w-full flex-1 space-y-4">
              {displayedBuildings.map((b) => (
                <div key={b.building_id} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-slate-700">
                    {b.building_name.replace('Dormitory', 'Dorm')}
                  </span>
                  <span className="w-10 text-xs font-bold text-slate-900">
                    {b.occupancyRate}%
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all"
                      style={{ width: `${b.occupancyRate}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs text-slate-500">
                    {b.occupiedBeds} / {b.totalBeds}
                  </span>
                </div>
              ))}
            </div>

            <DonutRing
              percent={occupancyStats.overallRate}
              color="#2563EB"
              label={`${occupancyStats.overallRate}%`}
              sublabel="Overall Occupancy"
            />
          </div>
        </section>

        {/* Pending Requests */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs xl:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-slate-900">Pending Requests</h2>
            </div>
            <Link
              to="/admin/pass-slips"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <Link
              to="/admin/pass-slips"
              className="flex items-center justify-between rounded-2xl bg-[#F4F7FC] p-4 transition hover:bg-blue-50/70"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-[#2563EB]">
                  <Send className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-slate-800">Pass Slip Requests</span>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {pendingPassSlips} Pending
              </span>
            </Link>

            <Link
              to="/admin/renewals"
              className="flex items-center justify-between rounded-2xl bg-[#F4F7FC] p-4 transition hover:bg-emerald-50/70"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <RefreshCw className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-slate-800">Renewal Requests</span>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {pendingRenewals} Pending
              </span>
            </Link>
          </div>
        </section>
      </div>

      {/* Bottom Row: Attendance Overview, Residents Needing Attention, Recent Activities */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Attendance Overview */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-slate-900">Attendance Overview</h2>
            </div>
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              View Details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-around gap-4">
            <DonutRing
              percent={presentRate}
              color="#10B981"
              label={`${presentRate}%`}
              sublabel="Present Today"
            />
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="font-bold text-slate-900">{presentCount}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Absent
                </span>
                <span className="font-bold text-slate-900">{absentCount}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Not Recorded
                </span>
                <span className="font-bold text-slate-900">{notRecordedCount}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Residents Needing Attention */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-bold text-slate-900">Residents Needing Attention</h2>
            </div>
            <Link
              to="/admin/monitoring"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {absenceAlerts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No residents currently meet the absence alert threshold.
              </p>
            ) : (
              absenceAlerts.map(({ dormer, consecutiveAbsences }) => {
                const isHigh = consecutiveAbsences >= 4;
                return (
                  <div
                    key={dormer.dormer_id}
                    className="flex items-center justify-between py-3 first:pt-1 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#0F2447]">
                        {dormer.first_name[0]}
                        {dormer.last_name[0]}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {dormer.first_name} {dormer.last_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Absent for {consecutiveAbsences} consecutive nights
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isHigh
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isHigh ? 'High' : 'Medium'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Recent Activities */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-slate-900">Recent Activities</h2>
            </div>
            <Link
              to="/admin/monitoring"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <ol className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4">
            {[
              { time: 'Nov 22, 2026 — 09:15 AM', text: 'Pass slip approved for Maria A. Santos' },
              { time: 'Nov 21, 2026 — 08:32 PM', text: 'Nightly biometric attendance synced (6 records)' },
              { time: 'Nov 17, 2026 — 08:20 AM', text: 'Renewal request submitted by Juan Dela Cruz' },
            ].map((act) => (
              <li key={act.time} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#2563EB] ring-4 ring-white" />
                <p className="text-[11px] font-medium text-slate-500">{act.time}</p>
                <p className="text-xs font-semibold text-slate-800">{act.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
