import { useMemo, useRef, useState, useEffect } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useOap } from '../../context/useOap';
import type { Dormer, RoomAssignment, Bed, Room, Building, PassSlip } from '../../types/oap';

const MSU_COURSES = [
  'BS Fisheries',
  'BS Marine Science',
  'DFT - Aquaculture',
  'DFT - Fish Processing',
  'BS Agriculture - Agronomy',
  'BS Agriculture - Animal Science',
  'BS Forestry',
  'BS Environmental Science',
  'BS Nursing',
  'BEEd',
  'BSEd - English',
  'BSEd - Mathematics',
  'BSEd - Sciences',
  'BSBA - HRM',
  'BSBA - Marketing',
  'BSHM',
  'BSIT',
];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const DORM_OPTIONS = ['All', 'Dorm A', 'Dorm B', 'Dorm C'];
const YEAR_OPTIONS = ['All', ...YEAR_LEVELS];
const STATUS_OPTIONS = ['All', 'Active Resident', 'On Leave', 'Pending Assignment'];

const ITEMS_PER_PAGE = 6;

// Helper to determine dormer status
function getDormerStatus(
  dormer: Dormer,
  roomAssignments: RoomAssignment[],
  passSlips: PassSlip[]
): 'Active Resident' | 'On Leave' | 'Pending Assignment' {
  if (dormer.status) {
    return dormer.status as 'Active Resident' | 'On Leave' | 'Pending Assignment';
  }
  const activeAssignment = roomAssignments.find(
    (r) => r.dormer_id === dormer.dormer_id && r.assignment_status === 'active'
  );
  if (!activeAssignment) return 'Pending Assignment';
  const hasApprovedPass = passSlips.some(
    (p) =>
      p.dormer_id === dormer.dormer_id &&
      (p.request_status === 'approved' || p.request_status === 'overdue')
  );
  if (hasApprovedPass) return 'On Leave';
  return 'Active Resident';
}

// Helper to get assignment details for a dormer
function getDormerLocation(
  dormerId: number,
  roomAssignments: RoomAssignment[],
  beds: Bed[],
  rooms: Room[],
  buildings: Building[]
) {
  const assignment = roomAssignments.find(
    (ra) => ra.dormer_id === dormerId && ra.assignment_status === 'active'
  );
  if (!assignment) {
    return {
      buildingName: '',
      roomNumber: 'Unassigned',
      bedNumber: '—',
      fullLocation: 'Unassigned',
      isAssigned: false,
    };
  }
  const bed = beds.find((b) => b.bed_id === assignment.bed_id);
  const room = rooms.find((r) => r.room_id === bed?.room_id);
  const building = buildings.find((b) => b.building_id === room?.building_id);

  const bldgShort = building?.building_name.replace('Dormitory', 'Dorm') || 'Dorm';
  const roomFormatted = room?.room_number.replace(/^[A-Z]-/, 'Room ') || 'Room';
  const bedFormatted = bed?.bed_number || 'Bed';

  return {
    buildingName: bldgShort,
    roomNumber: roomFormatted,
    bedNumber: bedFormatted,
    fullLocation: `${bldgShort} - ${roomFormatted}`,
    isAssigned: true,
  };
}

export default function StudentManagement() {
  const {
    dormers,
    roomAssignments,
    beds,
    rooms,
    buildings,
    passSlips,
    attendanceRecords,
    addDormer,
    updateDormer,
  } = useOap();

  // Toolbar & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPopover, setShowSearchPopover] = useState(false);
  const [dormFilter, setDormFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dormDropdownOpen, setDormDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingDormer, setViewingDormer] = useState<Dormer | null>(null);
  const [editingDormer, setEditingDormer] = useState<Dormer | null>(null);

  // Add Student form state
  const [addForm, setAddForm] = useState({
    student_number: '',
    full_name: '',
    email: '',
    contact_number: '',
    course: '',
    year_level: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
  });
  const [addFormError, setAddFormError] = useState('');

  // Edit Student form state
  const [editForm, setEditForm] = useState({
    student_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    course: '',
    year_level: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: '',
    status: 'Active Resident',
  });
  const [editFormError, setEditFormError] = useState('');

  // Refs for closing popovers on outside click
  const searchRef = useRef<HTMLDivElement>(null);
  const dormRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchPopover(false);
      }
      if (dormRef.current && !dormRef.current.contains(e.target as Node)) {
        setDormDropdownOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute status & location for each dormer
  const dormersWithMeta = useMemo(() => {
    return dormers.map((d) => {
      const status = getDormerStatus(d, roomAssignments, passSlips);
      const loc = getDormerLocation(d.dormer_id, roomAssignments, beds, rooms, buildings);
      const fullName = `${d.first_name} ${d.middle_name ? d.middle_name + ' ' : ''}${d.last_name}`.trim();
      const initials = `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase();
      return {
        ...d,
        computedStatus: status,
        location: loc,
        fullName,
        initials,
      };
    });
  }, [dormers, roomAssignments, beds, rooms, buildings, passSlips]);

  // Suggested searches derived from actual dormers
  const suggestedSearches = useMemo(() => {
    const firstAssigned = dormersWithMeta.find((d) => d.location.isAssigned);
    return [
      {
        type: 'Student Name',
        value: dormersWithMeta[0]?.fullName || 'Juan Dela Cruz',
      },
      {
        type: 'Student ID',
        value: dormersWithMeta[1]?.student_number || '2024-0321',
      },
      {
        type: 'Room Number',
        value: firstAssigned ? firstAssigned.location.roomNumber : 'Room 104',
      },
    ];
  }, [dormersWithMeta]);

  // Quick statistics calculation
  const quickStats = useMemo(() => {
    const totalEnrolled = dormersWithMeta.length;
    const activeCount = dormersWithMeta.filter((d) => d.computedStatus === 'Active Resident').length;
    const onLeaveCount = dormersWithMeta.filter((d) => d.computedStatus === 'On Leave').length;
    const pendingAssignmentCount = dormersWithMeta.filter(
      (d) => d.computedStatus === 'Pending Assignment'
    ).length;

    // Assigned by building (Dorm A, Dorm B, Dorm C)
    const countDormA = dormersWithMeta.filter((d) => d.location.buildingName === 'Dorm A').length;
    const countDormB = dormersWithMeta.filter((d) => d.location.buildingName === 'Dorm B').length;
    const countDormC = dormersWithMeta.filter((d) => d.location.buildingName === 'Dorm C').length;

    return {
      totalEnrolled,
      activeCount,
      onLeaveCount,
      pendingAssignmentCount,
      countDormA,
      countDormB,
      countDormC,
    };
  }, [dormersWithMeta]);

  // Filtered dormers list
  const filteredDormers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return dormersWithMeta.filter((student) => {
      // Search matching
      if (query) {
        const matchesName = student.fullName.toLowerCase().includes(query);
        const matchesId = student.student_number.toLowerCase().includes(query);
        const matchesRoom =
          student.location.roomNumber.toLowerCase().includes(query) ||
          student.location.fullLocation.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesRoom) return false;
      }
      // Dormitory filter
      if (dormFilter !== 'All') {
        if (student.location.buildingName !== dormFilter) return false;
      }
      // Year level filter
      if (yearFilter !== 'All') {
        if (student.year_level !== yearFilter) return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        if (student.computedStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [dormersWithMeta, searchQuery, dormFilter, yearFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDormers.length / ITEMS_PER_PAGE));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const startIndex = (currentPageClamped - 1) * ITEMS_PER_PAGE;
  const paginatedDormers = filteredDormers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Open Edit Modal with prefilled values
  const handleOpenEdit = (student: typeof dormersWithMeta[0]) => {
    setEditForm({
      student_number: student.student_number,
      first_name: student.first_name,
      middle_name: student.middle_name || '',
      last_name: student.last_name,
      email: student.email,
      contact_number: student.contact_number,
      course: student.course,
      year_level: student.year_level,
      address: student.address || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_relationship: student.emergency_contact_relationship || '',
      emergency_contact_number: student.emergency_contact_number || '',
      status: student.computedStatus,
    });
    setEditFormError('');
    setEditingDormer(student);
  };

  // Handle Add Student submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError('');

    if (
      !addForm.student_number.trim() ||
      !addForm.full_name.trim() ||
      !addForm.email.trim() ||
      !addForm.contact_number.trim() ||
      !addForm.course ||
      !addForm.year_level ||
      !addForm.emergency_contact_name.trim() ||
      !addForm.emergency_contact_number.trim()
    ) {
      setAddFormError('Please fill in all required fields marked with *.');
      return;
    }

    // Split full name
    const parts = addForm.full_name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

    const result = addDormer({
      student_number: addForm.student_number.trim(),
      first_name: firstName,
      middle_name: '',
      last_name: lastName,
      email: addForm.email.trim(),
      course: addForm.course,
      year_level: addForm.year_level,
      contact_number: addForm.contact_number.trim(),
      emergency_contact_name: addForm.emergency_contact_name.trim(),
      emergency_contact_number: addForm.emergency_contact_number.trim(),
      status: 'Pending Assignment',
    });

    if (!result.ok) {
      setAddFormError(result.error || 'Failed to add student.');
      return;
    }

    // Reset and close
    setAddForm({
      student_number: '',
      full_name: '',
      email: '',
      contact_number: '',
      course: '',
      year_level: '',
      emergency_contact_name: '',
      emergency_contact_number: '',
    });
    setIsAddModalOpen(false);
  };

  // Handle Edit Student submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDormer) return;
    setEditFormError('');

    if (
      !editForm.student_number.trim() ||
      !editForm.first_name.trim() ||
      !editForm.last_name.trim() ||
      !editForm.email.trim() ||
      !editForm.contact_number.trim() ||
      !editForm.course ||
      !editForm.year_level ||
      !editForm.emergency_contact_name.trim() ||
      !editForm.emergency_contact_number.trim()
    ) {
      setEditFormError('Please fill in all required fields.');
      return;
    }

    const result = updateDormer(editingDormer.dormer_id, {
      student_number: editForm.student_number.trim(),
      first_name: editForm.first_name.trim(),
      middle_name: editForm.middle_name.trim(),
      last_name: editForm.last_name.trim(),
      email: editForm.email.trim(),
      contact_number: editForm.contact_number.trim(),
      course: editForm.course,
      year_level: editForm.year_level,
      address: editForm.address.trim(),
      emergency_contact_name: editForm.emergency_contact_name.trim(),
      emergency_contact_relationship: editForm.emergency_contact_relationship.trim() || 'Parent/Guardian',
      emergency_contact_number: editForm.emergency_contact_number.trim(),
      status: editForm.status,
    });

    if (!result.ok) {
      setEditFormError(result.error || 'Failed to update student.');
      return;
    }

    setEditingDormer(null);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDormFilter('All');
    setYearFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  const isAddFormValid =
    addForm.student_number.trim() !== '' &&
    addForm.full_name.trim() !== '' &&
    addForm.email.trim() !== '' &&
    addForm.contact_number.trim() !== '' &&
    addForm.course !== '' &&
    addForm.year_level !== '' &&
    addForm.emergency_contact_name.trim() !== '' &&
    addForm.emergency_contact_number.trim() !== '';

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Filter Toolbar */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#0F2447]">Student Management</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input with floating suggested searches popover */}
            <div ref={searchRef} className="relative w-72 sm:w-80">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  onFocus={() => setShowSearchPopover(true)}
                  placeholder="Search student by name, ID or room..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9.5 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Floating Popover Card */}
              {showSearchPopover && (
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-88 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl z-30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Find a Student
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Search by name, student ID or room number.
                  </p>

                  <div className="mt-3.5 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Suggested Searches
                    </p>
                    <div className="space-y-1">
                      {suggestedSearches.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(item.value);
                            setCurrentPage(1);
                            setShowSearchPopover(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition hover:bg-[#F4F7FC]"
                        >
                          <span className="font-semibold text-slate-800">{item.value}</span>
                          <span className="text-[11px] text-slate-400">{item.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dormitory Dropdown */}
            <div ref={dormRef} className="relative flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Dormitory:</span>
              <button
                type="button"
                onClick={() => {
                  setDormDropdownOpen((prev) => !prev);
                  setYearDropdownOpen(false);
                  setStatusDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <span>{dormFilter}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {dormDropdownOpen && (
                <div className="absolute left-16 top-full mt-1.5 w-40 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg z-30">
                  {DORM_OPTIONS.map((opt) => {
                    const isSelected = dormFilter === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setDormFilter(opt);
                          setCurrentPage(1);
                          setDormDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition ${
                          isSelected
                            ? 'bg-blue-50 font-semibold text-[#2563EB]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Year Level Dropdown */}
            <div ref={yearRef} className="relative flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Year Level:</span>
              <button
                type="button"
                onClick={() => {
                  setYearDropdownOpen((prev) => !prev);
                  setDormDropdownOpen(false);
                  setStatusDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <span>{yearFilter}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {yearDropdownOpen && (
                <div className="absolute left-18 top-full mt-1.5 w-36 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg z-30">
                  {YEAR_OPTIONS.map((opt) => {
                    const isSelected = yearFilter === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setYearFilter(opt);
                          setCurrentPage(1);
                          setYearDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition ${
                          isSelected
                            ? 'bg-blue-50 font-semibold text-[#2563EB]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status Dropdown */}
            <div ref={statusRef} className="relative flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <button
                type="button"
                onClick={() => {
                  setStatusDropdownOpen((prev) => !prev);
                  setDormDropdownOpen(false);
                  setYearDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <span>{statusFilter}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute left-14 top-full mt-1.5 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg z-30">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = statusFilter === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setStatusFilter(opt);
                          setCurrentPage(1);
                          setStatusDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition ${
                          isSelected
                            ? 'bg-blue-50 font-semibold text-[#2563EB]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              setAddFormError('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* 2. Two-Column Layout (Table Left, Quick Statistics Right) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left Card — DORMERS DIRECTORY */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-9">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-xs font-bold tracking-wider text-[#0F2447] uppercase">
              Dormers Directory
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {filteredDormers.length} {filteredDormers.length === 1 ? 'student' : 'students'} found
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#EEF3FC] text-slate-700">
                  <th className="px-3.5 py-2.5 font-bold">ID Number</th>
                  <th className="px-3.5 py-2.5 font-bold">Student Name</th>
                  <th className="px-3.5 py-2.5 font-bold">Course & Year</th>
                  <th className="px-3.5 py-2.5 font-bold">Bldg / Room</th>
                  <th className="px-3.5 py-2.5 font-bold">Bed No.</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDormers.length > 0 ? (
                  paginatedDormers.map((student) => {
                    return (
                      <tr key={student.dormer_id} className="transition hover:bg-slate-50/70">
                        {/* ID Number */}
                        <td className="whitespace-nowrap px-3.5 py-3 font-mono font-medium text-slate-700">
                          {student.student_number}
                        </td>

                        {/* Student Name */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#2563EB]">
                              {student.initials}
                            </span>
                            <span className="font-bold text-slate-900">{student.fullName}</span>
                          </div>
                        </td>

                        {/* Course & Year */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-slate-600">
                          {student.course} - {student.year_level}
                        </td>

                        {/* Bldg / Room */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-slate-700">
                          {student.location.isAssigned ? (
                            <span>{student.location.fullLocation}</span>
                          ) : (
                            <span className="italic text-slate-400">Unassigned</span>
                          )}
                        </td>

                        {/* Bed No. */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-slate-700">
                          {student.location.bedNumber}
                        </td>

                        {/* Status Badge */}
                        <td className="whitespace-nowrap px-3.5 py-3">
                          {student.computedStatus === 'Active Resident' && (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Active Resident
                            </span>
                          )}
                          {student.computedStatus === 'On Leave' && (
                            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                              On Leave
                            </span>
                          )}
                          {student.computedStatus === 'Pending Assignment' && (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              Pending Assignment
                            </span>
                          )}
                        </td>

                        {/* Action Links */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-right">
                          <div className="inline-flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingDormer(student)}
                              className="text-xs font-semibold text-[#2563EB] hover:underline"
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(student)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <Users className="h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-800">No students found</p>
                        <p className="mt-1 text-xs text-slate-500">
                          No student records match the active search or filter criteria.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2563EB] shadow-2xs hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Working Pagination Footer (6 entries per page) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <span className="text-xs text-slate-500">
              Showing {filteredDormers.length > 0 ? startIndex + 1 : 0} to{' '}
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredDormers.length)} of{' '}
              {filteredDormers.length} entries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPageClamped <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                &lt; Previous
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === currentPageClamped;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#2563EB] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPageClamped >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next &gt;
              </button>
            </div>
          </div>
        </section>

        {/* Right Card — Quick Statistics */}
        <section className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-bold text-slate-900">Quick Statistics</h2>

          {/* Counts */}
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Total Enrolled Dormers:</span>
              <span className="font-bold text-slate-900">{quickStats.totalEnrolled}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Active:</span>
              <span className="font-bold text-emerald-600">{quickStats.activeCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">On Leave:</span>
              <span className="font-bold text-blue-600">{quickStats.onLeaveCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Pending Assignment:</span>
              <span className="font-bold text-amber-600">{quickStats.pendingAssignmentCount}</span>
            </div>
          </div>

          <div className="my-4 border-t border-slate-100" />

          {/* Assigned by Building */}
          <div>
            <p className="text-xs font-bold text-slate-800">Assigned by Building</p>
            <div className="mt-3 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-xs bg-[#1E3A8A]" />
                  <span>Dorm A</span>
                </div>
                <span className="font-semibold text-slate-600">({quickStats.countDormA})</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-xs bg-[#3B82F6]" />
                  <span>Dorm B</span>
                </div>
                <span className="font-semibold text-slate-600">({quickStats.countDormB})</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-xs border border-blue-200 bg-[#BFDBFE]" />
                  <span>Dorm C</span>
                </div>
                <span className="font-semibold text-slate-600">({quickStats.countDormC})</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Interactive Modals */}

      {/* --- ADD STUDENT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div>
              <h3 className="text-xl font-bold text-[#0F2447]">Add Student</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Create a student record. Fields marked * are required.
              </p>
            </div>

            {addFormError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{addFormError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              {/* Section 1: Student Information */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Student Information
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Student ID *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-0186"
                      value={addForm.student_number}
                      onChange={(e) =>
                        setAddForm({ ...addForm, student_number: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={addForm.full_name}
                      onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="Enter student email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      placeholder="09XX XXX XXXX"
                      value={addForm.contact_number}
                      onChange={(e) =>
                        setAddForm({ ...addForm, contact_number: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Course *</label>
                    <select
                      value={addForm.course}
                      onChange={(e) => setAddForm({ ...addForm, course: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value="" disabled>
                        Select course
                      </option>
                      {MSU_COURSES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Year Level *
                    </label>
                    <select
                      value={addForm.year_level}
                      onChange={(e) => setAddForm({ ...addForm, year_level: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value="" disabled>
                        Select year level
                      </option>
                      {YEAR_LEVELS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Emergency Contact */}
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Emergency Contact
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Parent or guardian name"
                      value={addForm.emergency_contact_name}
                      onChange={(e) =>
                        setAddForm({ ...addForm, emergency_contact_name: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Contact Number *
                    </label>
                    <input
                      type="text"
                      placeholder="09XX XXX XXXX"
                      value={addForm.emergency_contact_number}
                      onChange={(e) =>
                        setAddForm({ ...addForm, emergency_contact_number: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Soft blue-gray info box */}
              <div className="rounded-xl border border-blue-100/60 bg-[#F4F7FC] p-3.5">
                <p className="text-xs font-bold text-slate-800">Room Assignment</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Assign a dormitory, room and available bed after creating the record.
                </p>
              </div>

              {/* Footer */}
              <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  New records start with Pending assignment status.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isAddFormValid}
                    className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add Student
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW PROFILE MODAL --- */}
      {viewingDormer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setViewingDormer(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#2563EB]">
                {viewingDormer.first_name?.[0]}
                {viewingDormer.last_name?.[0]}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {viewingDormer.first_name}{' '}
                    {viewingDormer.middle_name ? viewingDormer.middle_name + ' ' : ''}
                    {viewingDormer.last_name}
                  </h3>
                  {/* Status Badge */}
                  {(() => {
                    const status = getDormerStatus(viewingDormer, roomAssignments, passSlips);
                    if (status === 'Active Resident') {
                      return (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Active Resident
                        </span>
                      );
                    }
                    if (status === 'On Leave') {
                      return (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                          On Leave
                        </span>
                      );
                    }
                    return (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                        Pending Assignment
                      </span>
                    );
                  })()}
                </div>
                <p className="font-mono text-xs text-slate-500">
                  Student ID: {viewingDormer.student_number}
                </p>
              </div>
            </div>

            {/* Student Details Grid */}
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Academic Info</p>
                <p className="mt-1 font-bold text-slate-900">
                  {viewingDormer.course} &bull; {viewingDormer.year_level}
                </p>
              </div>

              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Contact</p>
                <div className="mt-1 space-y-0.5 font-medium text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{viewingDormer.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{viewingDormer.contact_number}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Room & Bed Assignment</p>
                {(() => {
                  const loc = getDormerLocation(
                    viewingDormer.dormer_id,
                    roomAssignments,
                    beds,
                    rooms,
                    buildings
                  );
                  return (
                    <div className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {loc.isAssigned ? (
                        <span>
                          {loc.fullLocation}, {loc.bedNumber}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Pending Bed Assignment</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Emergency Contact</p>
                <p className="mt-1 font-bold text-slate-900">
                  {viewingDormer.emergency_contact_name || 'N/A'}{' '}
                  {viewingDormer.emergency_contact_relationship && (
                    <span className="font-normal text-slate-500">
                      ({viewingDormer.emergency_contact_relationship})
                    </span>
                  )}
                </p>
                <p className="text-slate-600">{viewingDormer.emergency_contact_number || 'N/A'}</p>
              </div>
            </div>

            {/* Recent Attendance Records */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
                <Clock className="h-4 w-4 text-[#2563EB]" />
                <span>Recent Attendance Records</span>
              </div>
              {(() => {
                const logs = attendanceRecords
                  .filter((r) => r.dormer_id === viewingDormer.dormer_id)
                  .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
                  .slice(0, 4);

                if (logs.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 italic">No attendance records found.</p>
                  );
                }

                return (
                  <div className="space-y-1.5">
                    {logs.map((log) => (
                      <div
                        key={log.attendance_id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-xs"
                      >
                        <span className="font-medium text-slate-700">
                          {log.attendance_date} &bull; {log.time_recorded}
                          {log.attendance_status === 'present' && log.recording_method
                            ? ` (${log.recording_method})`
                            : ''}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            log.attendance_status === 'present'
                              ? 'bg-emerald-100 text-emerald-700'
                              : log.attendance_status === 'excused'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {log.attendance_status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Recent Pass Slips */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
                <FileText className="h-4 w-4 text-[#2563EB]" />
                <span>Recent Pass Slips</span>
              </div>
              {(() => {
                const slips = passSlips
                  .filter((p) => p.dormer_id === viewingDormer.dormer_id)
                  .slice(0, 3);

                if (slips.length === 0) {
                  return <p className="text-xs text-slate-400 italic">No pass slip requests.</p>;
                }

                return (
                  <div className="space-y-1.5">
                    {slips.map((slip) => (
                      <div
                        key={slip.pass_slip_id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{slip.destination}</p>
                          <p className="text-[10px] text-slate-500">
                            {slip.departure_datetime.replace('T', ' ')} &rarr;{' '}
                            {slip.expected_return_datetime.replace('T', ' ')}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {slip.request_status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setViewingDormer(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {editingDormer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setEditingDormer(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div>
              <h3 className="text-xl font-bold text-[#0F2447]">Edit Student</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Update student profile, emergency contact, or status.
              </p>
            </div>

            {editFormError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              {/* Profile Details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Student ID *</label>
                  <input
                    type="text"
                    value={editForm.student_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, student_number: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">First Name *</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Middle Name</label>
                  <input
                    type="text"
                    value={editForm.middle_name}
                    onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Last Name *</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Email Address *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Mobile Number *</label>
                  <input
                    type="text"
                    value={editForm.contact_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, contact_number: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Course *</label>
                  <select
                    value={editForm.course}
                    onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    {MSU_COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Year Level *</label>
                  <select
                    value={editForm.year_level}
                    onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    {YEAR_LEVELS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600">Home Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">
                    Emergency Contact Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.emergency_contact_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, emergency_contact_name: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">
                    Emergency Contact Number *
                  </label>
                  <input
                    type="text"
                    value={editForm.emergency_contact_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, emergency_contact_number: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="Active Resident">Active Resident</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Pending Assignment">Pending Assignment</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDormer(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
