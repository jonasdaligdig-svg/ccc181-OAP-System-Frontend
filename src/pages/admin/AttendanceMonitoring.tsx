import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useOap } from '../../context/useOap';
import type { Dormer, AttendanceRecord, RoomAssignment, Room, Bed } from '../../types/oap';

const DORMITORY_OPTIONS = ['All', 'Dorm A', 'Dorm B', 'Dorm C'];
const STATUS_OPTIONS = ['All', 'Present', 'Absent'];
const ITEMS_PER_PAGE = 6;

function getDormName(buildingId: number): string {
  switch (buildingId) {
    case 1:
      return 'Dorm A';
    case 2:
      return 'Dorm B';
    case 3:
      return 'Dorm C';
    default:
      return `Dormitory ${buildingId}`;
  }
}

function formatTime(timeStr?: string): string {
  if (!timeStr || timeStr === '—') return '—';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return timeStr;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMethod(method?: string, status?: string): string {
  if (status === 'absent' || !method) return '—';
  switch (method) {
    case 'fingerprint':
    case 'biometric':
      return 'Fingerprint';
    case 'numeric_id_pin':
    case 'pin':
      return 'PIN';
    case 'manual':
      return 'Manual';
    default:
      return method;
  }
}

function getInitials(first: string, last: string): string {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
}

interface AssignedResidentAttendance {
  dormer: Dormer;
  assignment: RoomAssignment;
  bed: Bed | undefined;
  room: Room | undefined;
  dormName: string;
  roomDisplay: string;
  record: AttendanceRecord | undefined;
  status: 'present' | 'absent';
  statusDisplay: 'Present' | 'Absent';
  checkInTime: string;
  method: string;
}

export default function AttendanceMonitoring() {
  const navigate = useNavigate();
  const {
    dormers,
    rooms,
    beds,
    roomAssignments,
    attendanceRecords,
    absenceAlerts,
    recordAttendance,
  } = useOap();

  // All unique dates from attendanceRecords + today
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    attendanceRecords.forEach((r) => datesSet.add(r.attendance_date));
    const today = new Date().toISOString().slice(0, 10);
    datesSet.add(today);
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [attendanceRecords]);

  // Selected date defaults to latest date in attendance records
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const latest = attendanceRecords.reduce(
      (max, r) => (r.attendance_date > max ? r.attendance_date : max),
      ''
    );
    return latest || new Date().toISOString().slice(0, 10);
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDorm, setSelectedDorm] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown states
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dormDropdownOpen, setDormDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const dateRef = useRef<HTMLDivElement>(null);
  const dormRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [historyModalResident, setHistoryModalResident] = useState<Dormer | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Popover menu state for table rows
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const activeMenuRef = useRef<HTMLDivElement>(null);

  // Form states for Record Attendance Modal
  const [formDormerId, setFormDormerId] = useState<number>(0);
  const [formDate, setFormDate] = useState(selectedDate);
  const [formTime, setFormTime] = useState('20:30');
  const [formStatus, setFormStatus] = useState<'present' | 'absent'>('present');
  const [formRemarks, setFormRemarks] = useState('Verified at the dormitory entrance');

  // Auto-dismiss toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
      if (dormRef.current && !dormRef.current.contains(e.target as Node)) {
        setDormDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (activeMenuRef.current && !activeMenuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setRecordModalOpen(false);
        setHistoryModalResident(null);
        setExportModalOpen(false);
        setActiveMenuId(null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // All active assigned residents with their attendance status for selectedDate
  const allAssignedAttendance: AssignedResidentAttendance[] = useMemo(() => {
    const activeAssignments = roomAssignments.filter((a) => a.assignment_status === 'active');
    const list: AssignedResidentAttendance[] = [];

    for (const assignment of activeAssignments) {
      const dormer = dormers.find((d) => d.dormer_id === assignment.dormer_id);
      if (!dormer) continue;

      const bed = beds.find((b) => b.bed_id === assignment.bed_id);
      const room = bed ? rooms.find((r) => r.room_id === bed.room_id) : undefined;
      const dormName = room ? getDormName(room.building_id) : 'Unassigned';
      const roomNum = room ? room.room_number.replace(/^[A-C]-/, '') : '—';
      const roomDisplay = `${dormName} / ${roomNum}`;

      const record = attendanceRecords.find(
        (r) => r.dormer_id === dormer.dormer_id && r.attendance_date === selectedDate
      );

      const isPresent =
        Boolean(record && (record.attendance_status === 'present' || record.attendance_status === 'excused'));
      const status: 'present' | 'absent' = isPresent ? 'present' : 'absent';
      const statusDisplay: 'Present' | 'Absent' = isPresent ? 'Present' : 'Absent';
      const checkInTime = isPresent && record ? formatTime(record.time_recorded) : '—';
      const method = isPresent && record ? formatMethod(record.recording_method, 'present') : '—';

      list.push({
        dormer,
        assignment,
        bed,
        room,
        dormName,
        roomDisplay,
        record,
        status,
        statusDisplay,
        checkInTime,
        method,
      });
    }

    return list.sort((a, b) => a.dormer.last_name.localeCompare(b.dormer.last_name));
  }, [roomAssignments, dormers, beds, rooms, attendanceRecords, selectedDate]);

  // Filtered residents for Table
  const filteredResidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allAssignedAttendance.filter((item) => {
      // Search
      if (q) {
        const fullName = `${item.dormer.first_name} ${item.dormer.middle_name || ''} ${item.dormer.last_name}`.toLowerCase();
        const studentId = item.dormer.student_number.toLowerCase();
        const roomText = item.roomDisplay.toLowerCase();
        if (!fullName.includes(q) && !studentId.includes(q) && !roomText.includes(q)) {
          return false;
        }
      }

      // Dormitory
      if (selectedDorm !== 'All' && item.dormName !== selectedDorm) {
        return false;
      }

      // Status
      if (selectedStatus !== 'All' && item.statusDisplay !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [allAssignedAttendance, searchQuery, selectedDorm, selectedStatus]);

  // Pagination calculations
  const totalResidentsCount = filteredResidents.length;
  const totalPages = Math.max(1, Math.ceil(totalResidentsCount / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // KPIs for selectedDate across all assigned residents
  const totalResidents = allAssignedAttendance.length;
  const presentCount = allAssignedAttendance.filter((r) => r.status === 'present').length;
  const absentCount = allAssignedAttendance.filter((r) => r.status === 'absent').length;
  const notRecordedCount = 0;
  const attendanceRate = totalResidents > 0 ? Math.round((presentCount / totalResidents) * 100) : 0;

  // Attendance by Building (Right Column Card 1)
  const attendanceByBuilding = useMemo(() => {
    const bldgNames = ['Dormitory A', 'Dormitory B', 'Dormitory C'];
    const shortNames = ['Dorm A', 'Dorm B', 'Dorm C'];

    return bldgNames.map((fullName, idx) => {
      const shortName = shortNames[idx];
      const dormResidents = allAssignedAttendance.filter((r) => r.dormName === shortName);
      const bTotal = dormResidents.length;
      const bPresent = dormResidents.filter((r) => r.status === 'present').length;
      const bRate = bTotal > 0 ? Math.round((bPresent / bTotal) * 100) : 0;
      return {
        buildingName: fullName,
        shortName,
        total: bTotal,
        present: bPresent,
        rate: bRate,
      };
    });
  }, [allAssignedAttendance]);

  // Needs Follow-up (Right Column Card 2)
  // Computed dynamically from consecutive absences in attendanceRecords for assigned residents
  const flaggedResidents = useMemo(() => {
    return absenceAlerts.map((alert) => {
      const activeAssign = allAssignedAttendance.find((a) => a.dormer.dormer_id === alert.dormer.dormer_id);
      return {
        dormer: alert.dormer,
        consecutiveAbsences: alert.consecutiveAbsences,
        roomDisplay: activeAssign ? activeAssign.roomDisplay : 'Resident',
      };
    });
  }, [absenceAlerts, allAssignedAttendance]);

  // History logs for a given dormer (sorted newest first)
  const selectedDormerLogs = useMemo(() => {
    if (!historyModalResident) return [];
    return attendanceRecords
      .filter((r) => r.dormer_id === historyModalResident.dormer_id)
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [attendanceRecords, historyModalResident]);

  // Handlers for Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDorm('All');
    setSelectedStatus('All');
    setCurrentPage(1);
    setActiveMenuId(null);
  };

  // Open Record Attendance Modal pre-selected for a specific resident
  const handleOpenRecordForResident = (dormerId: number) => {
    setFormDormerId(dormerId);
    setFormDate(selectedDate);
    const existingRecord = attendanceRecords.find(
      (r) => r.dormer_id === dormerId && r.attendance_date === selectedDate
    );
    if (existingRecord) {
      setFormStatus(existingRecord.attendance_status === 'present' ? 'present' : 'absent');
      setFormTime(existingRecord.time_recorded ? existingRecord.time_recorded.slice(0, 5) : '20:30');
    } else {
      setFormStatus('present');
      setFormTime('20:30');
    }
    setFormRemarks('Verified at the dormitory entrance');
    setRecordModalOpen(true);
    setActiveMenuId(null);
  };

  // Open Record Attendance Modal
  const handleOpenRecordModal = () => {
    if (allAssignedAttendance.length > 0) {
      setFormDormerId(allAssignedAttendance[0].dormer.dormer_id);
    }
    setFormDate(selectedDate);
    setFormTime('20:30');
    setFormStatus('present');
    setFormRemarks('Verified at the dormitory entrance');
    setRecordModalOpen(true);
  };

  // Save Record Attendance Modal
  const handleSaveRecord = () => {
    if (!formDormerId) return;

    recordAttendance({
      dormer_id: formDormerId,
      date: formDate,
      time_recorded: formStatus === 'present' ? formTime : '21:00:00',
      status: formStatus,
      method: formStatus === 'present' ? 'manual' : null,
      remarks: formRemarks,
    });

    setRecordModalOpen(false);
    showToast(`Attendance recorded for ${formDate}.`);
  };

  // Export report
  const handlePrepareReport = () => {
    if (exportFormat === 'csv') {
      const headers = [
        'Resident Name',
        'Student ID',
        'Dormitory',
        'Room',
        'Date',
        'Check-in Time',
        'Method',
        'Status',
      ];
      const rows = filteredResidents.map((r) => [
        `"${r.dormer.first_name} ${r.dormer.middle_name || ''} ${r.dormer.last_name}"`,
        `"${r.dormer.student_number}"`,
        `"${r.dormName}"`,
        `"${r.roomDisplay.replace(/.*\/ /, '')}"`,
        `"${selectedDate}"`,
        `"${r.checkInTime}"`,
        `"${r.method}"`,
        `"${r.statusDisplay}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `oap_attendance_report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportModalOpen(false);
      showToast('Attendance report exported to CSV successfully.');
    } else {
      setExportModalOpen(false);
      showToast('Opening print dialog for attendance report PDF...');
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F2447]">
            Attendance Monitoring
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Daily roll call • Check-in window: 8:00 – 10:00 PM
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Selector Dropdown */}
          <div ref={dateRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setDateDropdownOpen((v) => !v);
                setDormDropdownOpen(false);
                setStatusDropdownOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>{formatDate(selectedDate)}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Select Roll Call Date
                </div>
                {availableDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setDateDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                      selectedDate === d
                        ? 'bg-blue-50 font-semibold text-[#2563EB]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{formatDate(d)}</span>
                    {selectedDate === d && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Report Button */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export report</span>
          </button>

          {/* + Record Attendance Primary Button */}
          <button
            type="button"
            onClick={handleOpenRecordModal}
            className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Record attendance</span>
          </button>
        </div>
      </div>

      {/* 2. 4 KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Residents */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Residents</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{totalResidents}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Across all dormitories</p>
        </div>

        {/* Present Today */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{presentCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{attendanceRate}% attendance rate</p>
        </div>

        {/* Absent Today */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Absent Today</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{absentCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Requires attendance follow-up</p>
        </div>

        {/* Not Yet Recorded */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Not Yet Recorded</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{notRecordedCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {notRecordedCount === 0 ? 'All residents accounted for' : 'Pending nightly check-in'}
          </p>
        </div>
      </div>

      {/* 3. Two-Column Workspace (Left ~72%, Right ~28%) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Card — DAILY ATTENDANCE LOG */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-xs lg:col-span-8 flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h2 className="text-xs font-bold tracking-wider text-[#0F2447] uppercase">
                DAILY ATTENDANCE LOG
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Last synced 9:00 PM</span>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-5 border-b border-slate-100 bg-slate-50/40">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search resident by name, ID or room..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              {/* Dormitory Dropdown */}
              <div ref={dormRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setDormDropdownOpen((v) => !v);
                    setStatusDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <span className="text-slate-400">Dormitory:</span>
                  <span className="font-semibold text-slate-900">{selectedDorm}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {dormDropdownOpen && (
                  <div className="absolute left-0 top-11 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                    {DORMITORY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedDorm(opt);
                          setDormDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                          selectedDorm === opt
                            ? 'bg-blue-50 font-semibold text-[#2563EB]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedDorm === opt && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Dropdown */}
              <div ref={statusRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setStatusDropdownOpen((v) => !v);
                    setDormDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-slate-900">{selectedStatus}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute right-0 sm:left-0 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(opt);
                          setStatusDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                          selectedStatus === opt
                            ? 'bg-blue-50 font-semibold text-[#2563EB]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedStatus === opt && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset filters link */}
              {(searchQuery || selectedDorm !== 'All' || selectedStatus !== 'All') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EEF3FC] text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Resident</th>
                    <th className="py-3 px-4">Dorm / Room</th>
                    <th className="py-3 px-4">Check-in time</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((item) => (
                      <tr key={item.dormer.dormer_id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Resident */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-xs text-[#2563EB]">
                              {getInitials(item.dormer.first_name, item.dormer.last_name)}
                            </span>
                            <div>
                              <p className="font-bold text-[#0F2447]">
                                {item.dormer.first_name} {item.dormer.middle_name || ''}{' '}
                                {item.dormer.last_name}
                              </p>
                              <p className="text-[11px] text-slate-400">{item.dormer.student_number}</p>
                            </div>
                          </div>
                        </td>

                        {/* Dorm / Room */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">{item.roomDisplay}</td>

                        {/* Check-in time */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{item.checkInTime}</td>

                        {/* Method */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{item.method}</td>

                        {/* Status pill */}
                        <td className="py-3.5 px-4">
                          {item.status === 'present' ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                              Absent
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="relative inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setHistoryModalResident(item.dormer);
                              }}
                              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#2563EB] shadow-2xs hover:bg-blue-50 cursor-pointer"
                            >
                              View log
                            </button>

                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId((prev) =>
                                    prev === item.dormer.dormer_id ? null : item.dormer.dormer_id
                                  );
                                }}
                                title="More actions"
                                className={`rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer ${
                                  activeMenuId === item.dormer.dormer_id ? 'bg-slate-100 text-slate-600' : ''
                                }`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {activeMenuId === item.dormer.dormer_id && (
                                <div
                                  ref={activeMenuRef}
                                  className={`absolute right-0 z-40 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-left ${
                                    paginatedResidents.indexOf(item) >= paginatedResidents.length - 2 &&
                                    paginatedResidents.length > 2
                                      ? 'bottom-8'
                                      : 'top-8'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecordForResident(item.dormer.dormer_id)}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                                    <span>Record / Update attendance</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      navigate('/admin/students');
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  >
                                    <Users className="h-3.5 w-3.5 text-slate-500" />
                                    <span>View in Student Directory</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Filter className="h-6 w-6 text-slate-400 mb-2" />
                          <p className="text-xs font-semibold text-slate-800">
                            No residents match the active filters
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Try adjusting your search query, dormitory, or status.
                          </p>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 p-4 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{totalResidentsCount === 0 ? 0 : startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(startIndex + ITEMS_PER_PAGE, totalResidentsCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{totalResidentsCount}</span> residents
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setActiveMenuId(null);
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ‹ Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    setCurrentPage(page);
                  }}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#2563EB] text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setActiveMenuId(null);
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Cards 1 & 2) */}
        <div className="space-y-5 lg:col-span-4">
          {/* Card 1: Attendance by Building */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-[#0F2447]">Attendance by Building</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {presentCount} of {totalResidents} residents present
            </p>

            <div className="mt-5 space-y-4">
              {attendanceByBuilding.map((item) => (
                <div key={item.buildingName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.buildingName}</span>
                    <span className="font-bold text-[#2563EB]">
                      {item.present} / {item.total}
                    </span>
                  </div>
                  {/* Slim royal blue progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, item.rate))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Needs Follow-up */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F2447]">Needs Follow-up</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {flaggedResidents.length} {flaggedResidents.length === 1 ? 'resident' : 'residents'} absent 3+ nights
                </p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {flaggedResidents.length > 0 ? (
                flaggedResidents.map((item) => (
                  <button
                    key={item.dormer.dormer_id}
                    type="button"
                    onClick={() => setHistoryModalResident(item.dormer)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {item.dormer.first_name} {item.dormer.middle_name || ''}{' '}
                        {item.dormer.last_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.dormer.student_number} • {item.roomDisplay}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      {item.consecutiveAbsences} nights
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-center">
                  <ShieldCheck className="mx-auto h-6 w-6 text-emerald-600 mb-1" />
                  <p className="text-xs font-semibold text-emerald-800">
                    No residents flagged
                  </p>
                  <p className="text-[11px] text-emerald-600">
                    All residents are currently in good attendance standing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: Record Attendance Modal
      ───────────────────────────────────────────────────────────── */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-[#0F2447]">Record attendance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the details below before continuing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Resident select */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Resident <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDormerId}
                  onChange={(e) => setFormDormerId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
                >
                  {allAssignedAttendance.map((item) => (
                    <option key={item.dormer.dormer_id} value={item.dormer.dormer_id}>
                      {item.dormer.first_name} {item.dormer.middle_name || ''}{' '}
                      {item.dormer.last_name} · {item.dormer.student_number} ({item.roomDisplay})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    disabled={formStatus === 'absent'}
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              {/* Attendance Status */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Attendance status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('present')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      formStatus === 'present'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('absent')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      formStatus === 'absent'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Absent</span>
                  </button>
                </div>
              </div>

              {/* Method (locked to Manual when Present; hidden when Absent) */}
              {formStatus === 'present' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Method
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Manual - Dormitory personnel"
                    className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs font-medium text-slate-700 cursor-not-allowed select-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Manual entry is used only when the biometric terminal is unavailable or under maintenance.
                  </p>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Verified at the dormitory entrance"
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecord}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Save attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: Attendance History Modal
      ───────────────────────────────────────────────────────────── */}
      {historyModalResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-[#0F2447]">Attendance history</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the details below before continuing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalResident(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Resident header info */}
              <div className="rounded-xl bg-[#F4F7FC] p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Resident Details
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {historyModalResident.first_name} {historyModalResident.middle_name || ''}{' '}
                  {historyModalResident.last_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {historyModalResident.student_number} • {historyModalResident.course} (
                  {historyModalResident.year_level})
                </p>
              </div>

              {/* Past logs list */}
              <div>
                <p className="text-xs font-bold text-[#0F2447] mb-2.5">Recorded Roll Calls</p>
                <div className="space-y-2">
                  {selectedDormerLogs.length > 0 ? (
                    selectedDormerLogs.map((log) => {
                      const isPresent = log.attendance_status === 'present';
                      const isAbsent = log.attendance_status === 'absent';
                      const isExcused = log.attendance_status === 'excused';

                      let badgeClasses = 'bg-rose-50 text-rose-700 border border-rose-200/70';
                      let statusText = 'Absent';

                      if (isPresent) {
                        badgeClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-200/70';
                        statusText = `Present · ${formatTime(log.time_recorded)} (${formatMethod(
                          log.recording_method,
                          'present'
                        )})`;
                      } else if (isAbsent) {
                        badgeClasses = 'bg-rose-50 text-rose-700 border border-rose-200/70';
                        // Strictly no manual label on Absent
                        statusText = 'Absent';
                      } else if (isExcused) {
                        badgeClasses = 'bg-blue-50 text-[#2563EB] border border-blue-200/70';
                        statusText = `Excused · ${formatTime(log.time_recorded)}`;
                      }

                      return (
                        <div
                          key={log.attendance_id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {formatDate(log.attendance_date)}
                            </p>
                            <p className="text-[11px] text-slate-400">Nightly Roll Call Check-in</p>
                          </div>
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${badgeClasses}`}>
                            {statusText}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      No attendance records found for this student.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setHistoryModalResident(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setHistoryModalResident(null)}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Back to attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: Export Attendance Report Modal
      ───────────────────────────────────────────────────────────── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-[#0F2447]">Export attendance report</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the details below before continuing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Date */}
              <div className="rounded-xl bg-[#F4F7FC] p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Roll Call Date
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {formatDate(selectedDate)}
                </p>
              </div>

              {/* Dormitory scope */}
              <div className="rounded-xl bg-[#F4F7FC] p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Dormitory Scope
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {selectedDorm === 'All' ? 'All Dormitories' : selectedDorm} •{' '}
                  {filteredResidents.length} residents included
                </p>
              </div>

              {/* Include fields */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Included Data Fields
                </span>
                <p className="text-xs font-bold text-[#0F2447] mt-0.5">
                  Resident, check-in time, method, status
                </p>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Format</label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-[#2563EB] bg-blue-50/50 ring-1 ring-[#2563EB]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <FileText
                      className={`h-4 w-4 mt-0.5 ${
                        exportFormat === 'csv' ? 'text-[#2563EB]' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        CSV (Excel-compatible)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Download tabular spreadsheet
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      exportFormat === 'pdf'
                        ? 'border-[#2563EB] bg-blue-50/50 ring-1 ring-[#2563EB]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Printer
                      className={`h-4 w-4 mt-0.5 ${
                        exportFormat === 'pdf' ? 'text-[#2563EB]' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">PDF (Print)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Printable formal attendance log
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrepareReport}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Prepare report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
