import { useState, useMemo, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Bed,
  BedDouble,
  Building2,
  Check,
  ChevronDown,
  DoorClosed,
  Edit2,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useOap } from '../../context/useOap';
import type { Room, Bed as BedType, Dormer } from '../../types/oap';

const DORMITORY_OPTIONS = ['All dormitories', 'Dorm A', 'Dorm B', 'Dorm C'];
const FLOOR_OPTIONS = ['All floors', '1st floor', '2nd floor', '3rd floor'];
const STATUS_OPTIONS = ['All statuses', 'Available', 'Full', 'Maintenance'];
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

function getBuildingIdFromName(dormName: string): number {
  if (dormName === 'Dorm A') return 1;
  if (dormName === 'Dorm B') return 2;
  if (dormName === 'Dorm C') return 3;
  return 1;
}

export default function RoomBedManagement() {
  const {
    rooms,
    beds,
    dormers,
    roomAssignments,
    buildings,
    addRoom,
    updateRoom,
    assignResidentToBed,
    unassignBed,
  } = useOap();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDorm, setSelectedDorm] = useState('All dormitories');
  const [selectedFloor, setSelectedFloor] = useState('All floors');
  const [selectedStatus, setSelectedStatus] = useState('All statuses');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown open states
  const [dormDropdownOpen, setDormDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const dormRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dormRef.current && !dormRef.current.contains(e.target as Node)) {
        setDormDropdownOpen(false);
      }
      if (floorRef.current && !floorRef.current.contains(e.target as Node)) {
        setFloorDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected room for right column
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // Selected bed in right column
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);

  // Modal open states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);

  // Form states for Add Room
  const [addDorm, setAddDorm] = useState('Dorm A');
  const [addRoomNum, setAddRoomNum] = useState('');
  const [addFloor, setAddFloor] = useState('1st floor');
  const [addCapacity, setAddCapacity] = useState(4);
  const [addStatus, setAddStatus] = useState<'available' | 'maintenance'>('available');
  const [addError, setAddError] = useState('');

  // Form states for Edit Room
  const [editDorm, setEditDorm] = useState('Dorm A');
  const [editRoomNum, setEditRoomNum] = useState('');
  const [editFloor, setEditFloor] = useState('1st floor');
  const [editCapacity, setEditCapacity] = useState(4);
  const [editStatus, setEditStatus] = useState<'available' | 'full' | 'maintenance'>('available');
  const [editError, setEditError] = useState('');

  // Form states for Assign Resident
  const [assignDormerId, setAssignDormerId] = useState<number | ''>('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignNotes, setAssignNotes] = useState('Approved dormitory assignment');
  const [assignError, setAssignError] = useState('');

  // KPI Computations
  const totalRooms = rooms.length;
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.bed_status === 'occupied').length;
  const availableBeds = beds.filter((b) => b.bed_status === 'available').length;

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Search room number
      if (
        searchQuery.trim() &&
        !room.room_number.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }

      // Dormitory
      if (selectedDorm !== 'All dormitories') {
        const bldgId = getBuildingIdFromName(selectedDorm);
        if (room.building_id !== bldgId) return false;
      }

      // Floor
      if (selectedFloor !== 'All floors') {
        if (room.floor.toLowerCase() !== selectedFloor.toLowerCase()) return false;
      }

      // Status
      if (selectedStatus !== 'All statuses') {
        const roomBeds = beds.filter((b) => b.room_id === room.room_id);
        const occupied = roomBeds.filter((b) => b.bed_status === 'occupied').length;

        if (selectedStatus === 'Maintenance') {
          if (room.status !== 'maintenance') return false;
        } else if (selectedStatus === 'Full') {
          if (room.status === 'maintenance' || occupied < room.capacity) return false;
        } else if (selectedStatus === 'Available') {
          if (room.status === 'maintenance' || occupied >= room.capacity) return false;
        }
      }

      return true;
    });
  }, [rooms, beds, searchQuery, selectedDorm, selectedFloor, selectedStatus]);

  // Keep selected room valid
  const effectiveSelectedRoom = useMemo(() => {
    if (selectedRoomId) {
      const found = rooms.find((r) => r.room_id === selectedRoomId);
      if (found) return found;
    }
    return filteredRooms[0] || rooms[0] || null;
  }, [rooms, selectedRoomId, filteredRooms]);

  // Beds in effective selected room
  const selectedRoomBeds = useMemo(() => {
    if (!effectiveSelectedRoom) return [];
    return beds.filter((b) => b.room_id === effectiveSelectedRoom.room_id);
  }, [beds, effectiveSelectedRoom]);

  // Keep selected bed valid
  const effectiveSelectedBed = useMemo(() => {
    if (selectedBedId) {
      const found = selectedRoomBeds.find((b) => b.bed_id === selectedBedId);
      if (found) return found;
    }
    return selectedRoomBeds[0] || null;
  }, [selectedRoomBeds, selectedBedId]);

  // Occupancy for selected room
  const selectedRoomOccupiedCount = useMemo(() => {
    return selectedRoomBeds.filter((b) => b.bed_status === 'occupied').length;
  }, [selectedRoomBeds]);

  // Map dormers to beds
  const bedOccupantMap = useMemo(() => {
    const map = new Map<number, Dormer>();
    roomAssignments.forEach((ra) => {
      if (ra.assignment_status === 'active') {
        const dormer = dormers.find((d) => d.dormer_id === ra.dormer_id);
        if (dormer) {
          map.set(ra.bed_id, dormer);
        }
      }
    });
    return map;
  }, [roomAssignments, dormers]);

  // Available dormers for assignment (Pending Assignment or unassigned)
  const availableDormers = useMemo(() => {
    const activeDormerIds = new Set(
      roomAssignments
        .filter((ra) => ra.assignment_status === 'active')
        .map((ra) => ra.dormer_id)
    );
    return dormers.filter((d) => !activeDormerIds.has(d.dormer_id));
  }, [dormers, roomAssignments]);

  // Pagination
  const totalPages = Math.ceil(filteredRooms.length / ITEMS_PER_PAGE) || 1;
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRooms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRooms, currentPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDorm('All dormitories');
    setSelectedFloor('All floors');
    setSelectedStatus('All statuses');
    setCurrentPage(1);
  };

  // Handlers for Add Room
  const handleOpenAddModal = () => {
    setAddDorm('Dorm A');
    setAddRoomNum('');
    setAddFloor('1st floor');
    setAddCapacity(4);
    setAddStatus('available');
    setAddError('');
    setAddModalOpen(true);
  };

  const handleSaveAddRoom = () => {
    if (!addRoomNum.trim()) {
      setAddError('Please enter a room number.');
      return;
    }
    const bldgId = getBuildingIdFromName(addDorm);
    const res = addRoom({
      building_id: bldgId,
      room_number: addRoomNum.trim(),
      floor: addFloor,
      capacity: Number(addCapacity),
      status: addStatus,
    });
    if (!res.ok) {
      setAddError(res.error || 'Failed to add room.');
      return;
    }
    if (res.room) {
      setSelectedRoomId(res.room.room_id);
      setSelectedBedId(null);
    }
    setAddModalOpen(false);
  };

  // Handlers for Edit Room
  const handleOpenEditModal = () => {
    if (!effectiveSelectedRoom) return;
    setEditDorm(getDormName(effectiveSelectedRoom.building_id));
    setEditRoomNum(effectiveSelectedRoom.room_number);
    setEditFloor(effectiveSelectedRoom.floor);
    setEditCapacity(effectiveSelectedRoom.capacity);
    setEditStatus(effectiveSelectedRoom.status);
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveEditRoom = () => {
    if (!effectiveSelectedRoom) return;
    if (!editRoomNum.trim()) {
      setEditError('Please enter a room number.');
      return;
    }
    const bldgId = getBuildingIdFromName(editDorm);
    const res = updateRoom(effectiveSelectedRoom.room_id, {
      building_id: bldgId,
      room_number: editRoomNum.trim(),
      floor: editFloor,
      capacity: Number(editCapacity),
      status: editStatus,
    });
    if (!res.ok) {
      setEditError(res.error || 'Failed to update room.');
      return;
    }
    setEditModalOpen(false);
  };

  // Handlers for Assign Resident
  const handleOpenAssignModal = () => {
    if (!effectiveSelectedBed || effectiveSelectedBed.bed_status !== 'available') return;
    setAssignDormerId(availableDormers[0]?.dormer_id || '');
    setAssignDate(new Date().toISOString().slice(0, 10));
    setAssignNotes('Approved dormitory assignment');
    setAssignError('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!effectiveSelectedBed) return;
    if (!assignDormerId) {
      setAssignError('Please select a resident to assign.');
      return;
    }
    const res = assignResidentToBed(
      effectiveSelectedBed.bed_id,
      Number(assignDormerId),
      assignDate,
      assignNotes
    );
    if (!res.ok) {
      setAssignError(res.error || 'Failed to assign resident.');
      return;
    }
    setAssignModalOpen(false);
  };

  // Handlers for Unassign Resident
  const handleConfirmUnassign = () => {
    if (!effectiveSelectedBed) return;
    const res = unassignBed(effectiveSelectedBed.bed_id);
    if (res.ok) {
      setUnassignConfirmOpen(false);
    }
  };

  // Open Room Details View modal
  const handleViewRoomDetails = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomId(room.room_id);
    setViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2447]">Room and Bed Management</h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage dormitory rooms, bed availability, and resident assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add room</span>
        </button>
      </div>

      {/* 2. 4 KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[#2563EB]">
              <DoorClosed className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-500">Total Rooms</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{totalRooms}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Across {buildings.length} dormitories</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <BedDouble className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-500">Total Beds</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{totalBeds}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Standard 4-bed layout</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Users className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-500">Occupied Beds</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{occupiedBeds}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0}% occupancy rate
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-[#5B4B9E]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-500">Available Beds</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{availableBeds}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Ready for assignment</p>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search room number..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        {/* Dormitory Dropdown */}
        <div ref={dormRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setDormDropdownOpen((v) => !v);
              setFloorDropdownOpen(false);
              setStatusDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">Dormitory:</span>
            <span className="font-semibold text-slate-900">{selectedDorm}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {dormDropdownOpen && (
            <div className="absolute left-0 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
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

        {/* Floor Dropdown */}
        <div ref={floorRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setFloorDropdownOpen((v) => !v);
              setDormDropdownOpen(false);
              setStatusDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">Floor:</span>
            <span className="font-semibold text-slate-900">{selectedFloor}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {floorDropdownOpen && (
            <div className="absolute left-0 top-11 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
              {FLOOR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedFloor(opt);
                    setFloorDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                    selectedFloor === opt
                      ? 'bg-blue-50 font-semibold text-[#2563EB]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt}</span>
                  {selectedFloor === opt && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
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
              setFloorDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">Status:</span>
            <span className="font-semibold text-slate-900">{selectedStatus}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {statusDropdownOpen && (
            <div className="absolute right-0 top-11 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
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
      </div>

      {/* 4. Two-Column Main Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column: Room Directory */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold tracking-wider text-[#0F2447] uppercase">
                Room Directory
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {filteredRooms.length} rooms across {buildings.length} dormitories
              </span>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="rounded-xl bg-[#EEF3FC] text-slate-600">
                    <th className="py-2.5 pl-3.5 pr-2 font-semibold">Room</th>
                    <th className="px-2 py-2.5 font-semibold">Dormitory</th>
                    <th className="px-2 py-2.5 font-semibold">Floor</th>
                    <th className="px-2 py-2.5 font-semibold">Beds</th>
                    <th className="px-2 py-2.5 font-semibold">Occupancy</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 pl-2 pr-3.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRooms.map((room) => {
                    const isSelected = effectiveSelectedRoom?.room_id === room.room_id;
                    const roomBeds = beds.filter((b) => b.room_id === room.room_id);
                    const occupied = roomBeds.filter((b) => b.bed_status === 'occupied').length;
                    const percent = room.capacity ? Math.round((occupied / room.capacity) * 100) : 0;

                    const isMaintenance = room.status === 'maintenance';
                    const isFull = !isMaintenance && occupied >= room.capacity;
                    const isAvailable = !isMaintenance && !isFull;

                    return (
                      <tr
                        key={room.room_id}
                        onClick={() => {
                          setSelectedRoomId(room.room_id);
                          setSelectedBedId(null);
                        }}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-l-4 border-l-[#2563EB]'
                            : 'border-l-4 border-l-transparent hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 pl-3.5 pr-2 font-bold text-slate-900">
                          Room {room.room_number}
                        </td>
                        <td className="px-2 py-3 font-medium text-slate-700">
                          {getDormName(room.building_id)}
                        </td>
                        <td className="px-2 py-3 text-slate-600">{room.floor}</td>
                        <td className="px-2 py-3 font-medium text-slate-700">
                          {room.capacity} beds
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">
                              {occupied} / {room.capacity} occupied
                            </span>
                            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFull
                                    ? 'bg-slate-500'
                                    : isMaintenance
                                    ? 'bg-amber-500'
                                    : 'bg-[#2563EB]'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {isMaintenance && (
                            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              Maintenance
                            </span>
                          )}
                          {isFull && (
                            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              Full
                            </span>
                          )}
                          {isAvailable && (
                            <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-2 pr-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => handleViewRoomDetails(room, e)}
                            className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRooms.length === 0 && (
                <div className="py-12 text-center">
                  <DoorClosed className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-900">No rooms found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    No rooms match your active search and filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2563EB] shadow-2xs hover:bg-slate-50 cursor-pointer"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* Pagination footer */}
            {filteredRooms.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <span>
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredRooms.length)}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredRooms.length)} of{' '}
                  {filteredRooms.length} rooms
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`h-7 w-7 rounded-lg font-medium transition cursor-pointer ${
                        currentPage === pg
                          ? 'bg-[#2563EB] text-white'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Room Bed Panel */}
        <div className="lg:col-span-5 xl:col-span-4">
          {effectiveSelectedRoom ? (
            <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0F2447]">
                    Room {effectiveSelectedRoom.room_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {getDormName(effectiveSelectedRoom.building_id)} &bull;{' '}
                    {effectiveSelectedRoom.floor}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit room</span>
                </button>
              </div>

              {/* Subheader */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold tracking-wider text-slate-500 uppercase">
                  Bed assignments
                </span>
                <span className="font-semibold text-slate-700">
                  {selectedRoomOccupiedCount} of {effectiveSelectedRoom.capacity} occupied
                </span>
              </div>

              {/* Maintenance Notice if applicable */}
              {effectiveSelectedRoom.status === 'maintenance' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Room is currently flagged for maintenance.</span>
                </div>
              )}

              {/* 2x2 Grid of Bed Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedRoomBeds.map((bed: BedType) => {
                  const isBedSelected = effectiveSelectedBed?.bed_id === bed.bed_id;
                  const occupant = bedOccupantMap.get(bed.bed_id);
                  const isOccupied = bed.bed_status === 'occupied';

                  if (isOccupied) {
                    return (
                      <div
                        key={bed.bed_id}
                        onClick={() => setSelectedBedId(bed.bed_id)}
                        className={`rounded-xl border p-3.5 cursor-pointer transition ${
                          isBedSelected
                            ? 'border-transparent ring-2 ring-[#2563EB] shadow-md bg-white'
                            : 'border-slate-200/80 bg-[#F4F7FC] hover:bg-blue-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Bed className="h-4 w-4 text-[#2563EB]" />
                            <span className="text-xs font-bold text-slate-900">{bed.bed_number}</span>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                            Occupied
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#2563EB]">
                              {occupant
                                ? `${occupant.first_name[0] || ''}${occupant.last_name[0] || ''}`
                                : 'RES'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-900">
                                {occupant
                                  ? `${occupant.first_name} ${occupant.last_name}`
                                  : 'Assigned Resident'}
                              </p>
                              <p className="truncate text-[10px] font-mono text-slate-500">
                                {occupant?.student_number || '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Available bed card
                  return (
                    <div
                      key={bed.bed_id}
                      onClick={() => setSelectedBedId(bed.bed_id)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition ${
                        isBedSelected
                          ? 'border-transparent ring-2 ring-[#2563EB] shadow-md bg-white'
                          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Bed className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-900">{bed.bed_number}</span>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Available
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <p className="text-xs font-semibold text-emerald-700">Ready to assign</p>
                        <p className="text-[10px] text-slate-400">No resident assigned</p>
                      </div>
                    </div>
                  );
                })}

                {selectedRoomBeds.length === 0 && (
                  <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                    No beds configured for this room yet.
                  </div>
                )}
              </div>

              {/* Bottom Action CTA */}
              <div className="pt-2">
                {effectiveSelectedBed?.bed_status === 'available' && (
                  <button
                    type="button"
                    onClick={handleOpenAssignModal}
                    className="w-full rounded-xl bg-[#2563EB] py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 cursor-pointer"
                  >
                    Assign Resident to {effectiveSelectedBed.bed_number}
                  </button>
                )}

                {effectiveSelectedBed?.bed_status === 'occupied' && (
                  <button
                    type="button"
                    onClick={() => setUnassignConfirmOpen(true)}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                  >
                    Unassign Resident from {effectiveSelectedBed.bed_number}
                  </button>
                )}

                {!effectiveSelectedBed && (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-medium text-slate-400 cursor-not-allowed"
                  >
                    Select a bed to manage assignment
                  </button>
                )}

                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Select a bed to manage its assignment.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <Building2 className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-700">No room selected</p>
              <p className="text-[11px] text-slate-400">Select a room to view its beds.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. FOUR MODALS */}

      {/* MODAL 1: ADD ROOM */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#0F2447]">Add room</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure a new dormitory room and auto-generate its bed records.
            </p>

            {addError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Dormitory</label>
                <select
                  value={addDorm}
                  onChange={(e) => setAddDorm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value="Dorm A">Dorm A (Dormitory A)</option>
                  <option value="Dorm B">Dorm B (Dormitory B)</option>
                  <option value="Dorm C">Dorm C (Dormitory C)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Room number</label>
                <input
                  type="text"
                  value={addRoomNum}
                  onChange={(e) => {
                    setAddRoomNum(e.target.value);
                    if (e.target.value.trim()) setAddError('');
                  }}
                  placeholder="e.g. A-105"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Floor</label>
                <select
                  value={addFloor}
                  onChange={(e) => setAddFloor(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value="1st floor">1st floor</option>
                  <option value="2nd floor">2nd floor</option>
                  <option value="3rd floor">3rd floor</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Bed capacity (max 4)</label>
                <select
                  value={addCapacity}
                  onChange={(e) => setAddCapacity(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value={1}>1 Bed</option>
                  <option value={2}>2 Beds</option>
                  <option value={3}>3 Beds</option>
                  <option value={4}>4 Beds (Standard)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Room status</label>
                <select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value as 'available' | 'maintenance')}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddRoom}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Save room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ROOM */}
      {editModalOpen && effectiveSelectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#0F2447]">
              Edit Room {effectiveSelectedRoom.room_number}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Update room configuration, capacity, or maintenance status.
            </p>

            {editError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Dormitory</label>
                <select
                  value={editDorm}
                  onChange={(e) => setEditDorm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value="Dorm A">Dorm A (Dormitory A)</option>
                  <option value="Dorm B">Dorm B (Dormitory B)</option>
                  <option value="Dorm C">Dorm C (Dormitory C)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Room number</label>
                <input
                  type="text"
                  value={editRoomNum}
                  onChange={(e) => {
                    setEditRoomNum(e.target.value);
                    if (e.target.value.trim()) setEditError('');
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Floor</label>
                <select
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value="1st floor">1st floor</option>
                  <option value="2nd floor">2nd floor</option>
                  <option value="3rd floor">3rd floor</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Bed capacity (max 4)</label>
                <select
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value={1}>1 Bed</option>
                  <option value={2}>2 Beds</option>
                  <option value={3}>3 Beds</option>
                  <option value={4}>4 Beds (Standard)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Currently {selectedRoomOccupiedCount} bed(s) occupied.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Room status</label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'available' | 'full' | 'maintenance')
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  <option value="available">Available</option>
                  <option value="full">Full</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditRoom}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN RESIDENT */}
      {assignModalOpen && effectiveSelectedRoom && effectiveSelectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#0F2447]">
              Assign Resident to {effectiveSelectedBed.bed_number}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Select an unassigned dormer to place into this bed.
            </p>

            {/* Read-only Assignment Summary Banner */}
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 space-y-1">
              <p className="font-semibold text-blue-800">Target Location:</p>
              <p className="font-bold">
                {getDormName(effectiveSelectedRoom.building_id)} &bull; Room{' '}
                {effectiveSelectedRoom.room_number} &bull; {effectiveSelectedBed.bed_number}
              </p>
            </div>

            {assignError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Resident</label>
                <select
                  value={assignDormerId}
                  onChange={(e) => {
                    setAssignDormerId(Number(e.target.value));
                    setAssignError('');
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                >
                  {availableDormers.length === 0 ? (
                    <option value="">No unassigned residents available</option>
                  ) : (
                    availableDormers.map((d) => (
                      <option key={d.dormer_id} value={d.dormer_id}>
                        {d.first_name} {d.last_name} &bull; {d.student_number} ({d.course})
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  {availableDormers.length} resident(s) pending bed assignment.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Effective date</label>
                <input
                  type="date"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Approved dormitory assignment"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignDormerId}
                onClick={handleConfirmAssign}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
              >
                Confirm assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW ROOM BED ASSIGNMENTS SUMMARY */}
      {viewModalOpen && effectiveSelectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setViewModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#0F2447]">
              Room {effectiveSelectedRoom.room_number} &bull; Bed Assignments
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Overview of room capacity, current residents, and slot availability.
            </p>

            {/* Read-only summary tiles */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Location</p>
                <p className="mt-1 font-bold text-slate-900">
                  {getDormName(effectiveSelectedRoom.building_id)} &bull;{' '}
                  {effectiveSelectedRoom.floor}
                </p>
              </div>

              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Bed Occupancy</p>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedRoomOccupiedCount} of {effectiveSelectedRoom.capacity} occupied (
                  {effectiveSelectedRoom.capacity
                    ? Math.round(
                        (selectedRoomOccupiedCount / effectiveSelectedRoom.capacity) * 100
                      )
                    : 0}
                  %)
                </p>
              </div>

              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Available Beds</p>
                <p className="mt-1 font-bold text-emerald-700">
                  {selectedRoomBeds
                    .filter((b) => b.bed_status === 'available')
                    .map((b) => b.bed_number)
                    .join(', ') || 'None (Room is full)'}
                </p>
              </div>

              <div className="rounded-xl bg-[#F4F7FC] p-3">
                <p className="font-semibold text-slate-500">Assignment History</p>
                <p className="mt-1 font-medium text-slate-800">
                  Last reviewed {effectiveSelectedRoom.last_reviewed || 'Nov 20, 2026'}
                </p>
              </div>
            </div>

            {/* Occupants list */}
            <div className="mt-4">
              <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                Beds in this Room
              </h4>
              <div className="mt-2 space-y-2">
                {selectedRoomBeds.map((bed: BedType) => {
                  const occupant = bedOccupantMap.get(bed.bed_id);
                  const isOccupied = bed.bed_status === 'occupied';

                  return (
                    <div
                      key={bed.bed_id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#F4F7FC] p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-[10px] ${
                            isOccupied
                              ? 'bg-blue-100 text-[#2563EB]'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <Bed className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{bed.bed_number}</p>
                          <p className="text-[11px] text-slate-500">
                            {isOccupied && occupant
                              ? `${occupant.first_name} ${occupant.last_name} (${occupant.student_number})`
                              : 'Ready for assignment'}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isOccupied ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                            Occupied
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Back to rooms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: UNASSIGN RESIDENT */}
      {unassignConfirmOpen && effectiveSelectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setUnassignConfirmOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#0F2447]">
              Unassign Resident from {effectiveSelectedBed.bed_number}?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              This will vacate the bed and set the resident&apos;s status back to{' '}
              <span className="font-semibold text-amber-700">Pending Assignment</span>.
            </p>

            {bedOccupantMap.get(effectiveSelectedBed.bed_id) && (
              <div className="mt-4 rounded-xl border border-slate-200/80 bg-[#F4F7FC] p-3 text-xs">
                <p className="font-semibold text-slate-500">Current Resident:</p>
                <p className="mt-1 font-bold text-slate-900">
                  {bedOccupantMap.get(effectiveSelectedBed.bed_id)?.first_name}{' '}
                  {bedOccupantMap.get(effectiveSelectedBed.bed_id)?.last_name} &bull;{' '}
                  {bedOccupantMap.get(effectiveSelectedBed.bed_id)?.student_number}
                </p>
                <p className="text-[11px] text-slate-500">
                  {bedOccupantMap.get(effectiveSelectedBed.bed_id)?.course} &bull;{' '}
                  {bedOccupantMap.get(effectiveSelectedBed.bed_id)?.year_level}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setUnassignConfirmOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 cursor-pointer"
              >
                Confirm unassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
