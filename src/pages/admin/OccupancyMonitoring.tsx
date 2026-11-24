import { useState, useMemo, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Bed,
  BedDouble,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  PieChart,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useOap } from '../../context/useOap';
import type { Room, Bed as BedType, Dormer } from '../../types/oap';

const DORMITORY_OPTIONS = ['All dormitories', 'Dorm A', 'Dorm B', 'Dorm C'];
const FLOOR_OPTIONS = ['All floors', '1st floor', '2nd floor', '3rd floor'];
const OCCUPANCY_STATE_OPTIONS = ['All occupancy states', 'Full', 'Partially occupied', 'Vacant'];

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

function getCleanRoomNumber(roomNum: string): string {
  if (roomNum.includes('-')) {
    return roomNum.split('-')[1];
  }
  return roomNum;
}

interface RoomWithStats {
  room: Room;
  dormName: string;
  cleanNumber: string;
  bedsInRoom: BedType[];
  occupiedCount: number;
  availableCount: number;
  capacity: number;
  occupancyRate: number;
  occupancyState: 'Full' | 'Partially occupied' | 'Vacant';
  residents: Array<{
    bed: BedType;
    dormer?: Dormer;
  }>;
}

export default function OccupancyMonitoring() {
  const { buildings, rooms, beds, roomAssignments, dormers } = useOap();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDorm, setSelectedDorm] = useState('All dormitories');
  const [selectedFloor, setSelectedFloor] = useState('All floors');
  const [selectedState, setSelectedState] = useState('All occupancy states');

  // Dropdown open states
  const [dormDropdownOpen, setDormDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);

  const dormRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [selectedRoomModal, setSelectedRoomModal] = useState<RoomWithStats | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dormRef.current && !dormRef.current.contains(e.target as Node)) {
        setDormDropdownOpen(false);
      }
      if (floorRef.current && !floorRef.current.contains(e.target as Node)) {
        setFloorDropdownOpen(false);
      }
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedRoomModal(null);
        setExportModalOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show auto-dismiss toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Compute stats for all rooms live from context
  const allRoomsWithStats: RoomWithStats[] = useMemo(() => {
    return rooms.map((r) => {
      const dormName = getDormName(r.building_id);
      const cleanNumber = getCleanRoomNumber(r.room_number);
      const bedsInRoom = beds.filter((b) => b.room_id === r.room_id);
      const capacity = Math.max(r.capacity || 4, bedsInRoom.length);
      const occupiedBeds = bedsInRoom.filter((b) => b.bed_status === 'occupied');
      const occupiedCount = occupiedBeds.length;
      const availableCount = Math.max(0, capacity - occupiedCount);
      const occupancyRate = capacity > 0 ? Math.round((occupiedCount / capacity) * 100) : 0;

      let occupancyState: 'Full' | 'Partially occupied' | 'Vacant' = 'Vacant';
      if (occupiedCount >= capacity) {
        occupancyState = 'Full';
      } else if (occupiedCount > 0) {
        occupancyState = 'Partially occupied';
      }

      const residents = bedsInRoom.map((b) => {
        if (b.bed_status === 'occupied') {
          const activeAssignment = roomAssignments.find(
            (a) => a.bed_id === b.bed_id && a.assignment_status === 'active'
          );
          const dormer = activeAssignment
            ? dormers.find((d) => d.dormer_id === activeAssignment.dormer_id)
            : undefined;
          return { bed: b, dormer };
        }
        return { bed: b };
      });

      return {
        room: r,
        dormName,
        cleanNumber,
        bedsInRoom,
        occupiedCount,
        availableCount,
        capacity,
        occupancyRate,
        occupancyState,
        residents,
      };
    });
  }, [rooms, beds, roomAssignments, dormers]);

  // Filtered rooms based on search & dropdowns
  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRoomsWithStats.filter((r) => {
      // Search matches room number or dormitory name
      if (q) {
        const matchesRoom =
          r.room.room_number.toLowerCase().includes(q) ||
          r.cleanNumber.toLowerCase().includes(q);
        const matchesDorm = r.dormName.toLowerCase().includes(q);
        if (!matchesRoom && !matchesDorm) return false;
      }

      // Dormitory filter
      if (selectedDorm !== 'All dormitories' && r.dormName !== selectedDorm) {
        return false;
      }

      // Floor filter
      if (selectedFloor !== 'All floors' && r.room.floor.toLowerCase() !== selectedFloor.toLowerCase()) {
        return false;
      }

      // Occupancy state filter
      if (selectedState !== 'All occupancy states' && r.occupancyState !== selectedState) {
        return false;
      }

      return true;
    });
  }, [allRoomsWithStats, searchQuery, selectedDorm, selectedFloor, selectedState]);

  // Overall & Filtered KPI calculations
  const totalBeds = useMemo(() => {
    return filteredRooms.reduce((acc, r) => acc + r.capacity, 0);
  }, [filteredRooms]);

  const occupiedBeds = useMemo(() => {
    return filteredRooms.reduce((acc, r) => acc + r.occupiedCount, 0);
  }, [filteredRooms]);

  const availableBeds = useMemo(() => {
    return Math.max(0, totalBeds - occupiedBeds);
  }, [totalBeds, occupiedBeds]);

  const occupancyRate = useMemo(() => {
    return totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  }, [totalBeds, occupiedBeds]);

  // Overall un-filtered statistics for capacity overview
  const globalTotalBeds = useMemo(() => {
    return allRoomsWithStats.reduce((acc, r) => acc + r.capacity, 0);
  }, [allRoomsWithStats]);

  const globalOccupiedBeds = useMemo(() => {
    return allRoomsWithStats.reduce((acc, r) => acc + r.occupiedCount, 0);
  }, [allRoomsWithStats]);

  const globalAvailableBeds = useMemo(() => {
    return Math.max(0, globalTotalBeds - globalOccupiedBeds);
  }, [globalTotalBeds, globalOccupiedBeds]);

  const globalOccupancyRate = useMemo(() => {
    return globalTotalBeds > 0
      ? Math.round((globalOccupiedBeds / globalTotalBeds) * 100)
      : 0;
  }, [globalTotalBeds, globalOccupiedBeds]);

  // Occupancy by dormitory (for middle left card)
  const dormitoryBreakdown = useMemo(() => {
    const dormList = ['Dorm A', 'Dorm B', 'Dorm C'];
    return dormList
      .filter((d) => selectedDorm === 'All dormitories' || selectedDorm === d)
      .map((dName) => {
        const dormRooms = allRoomsWithStats.filter((r) => r.dormName === dName);
        const dormCap = dormRooms.reduce((acc, r) => acc + r.capacity, 0);
        const dormOcc = dormRooms.reduce((acc, r) => acc + r.occupiedCount, 0);
        const dormRate = dormCap > 0 ? Math.round((dormOcc / dormCap) * 100) : 0;
        const dormAvail = Math.max(0, dormCap - dormOcc);
        return {
          dormName: dName,
          capacity: dormCap,
          occupied: dormOcc,
          available: dormAvail,
          rate: dormRate,
          roomsCount: dormRooms.length,
        };
      });
  }, [allRoomsWithStats, selectedDorm]);

  // High capacity warning check (any dorm >= 80% occupied)
  const highCapacityDorm = useMemo(() => {
    const list = ['Dorm A', 'Dorm B', 'Dorm C'].map((dName) => {
      const dormRooms = allRoomsWithStats.filter((r) => r.dormName === dName);
      const dormCap = dormRooms.reduce((acc, r) => acc + r.capacity, 0);
      const dormOcc = dormRooms.reduce((acc, r) => acc + r.occupiedCount, 0);
      const dormRate = dormCap > 0 ? Math.round((dormOcc / dormCap) * 100) : 0;
      const dormAvail = Math.max(0, dormCap - dormOcc);
      return { dormName: dName, rate: dormRate, available: dormAvail };
    });
    return list.find((d) => d.rate >= 80);
  }, [allRoomsWithStats]);

  // Room status summary counts
  const roomStatusSummary = useMemo(() => {
    const full = allRoomsWithStats.filter((r) => r.occupancyState === 'Full').length;
    const partial = allRoomsWithStats.filter((r) => r.occupancyState === 'Partially occupied').length;
    const vacant = allRoomsWithStats.filter((r) => r.occupancyState === 'Vacant').length;
    return { full, partial, vacant };
  }, [allRoomsWithStats]);

  // Grouped filtered rooms by dormitory for the map
  const roomsGroupedByDorm = useMemo(() => {
    const groups: { [key: string]: RoomWithStats[] } = {};
    const dormOrder = ['Dorm A', 'Dorm B', 'Dorm C'];

    dormOrder.forEach((d) => {
      groups[d] = [];
    });

    filteredRooms.forEach((r) => {
      if (!groups[r.dormName]) {
        groups[r.dormName] = [];
      }
      groups[r.dormName].push(r);
    });

    return dormOrder
      .filter((d) => groups[d] && groups[d].length > 0)
      .map((d) => {
        const dormRooms = groups[d];
        const dormCap = dormRooms.reduce((acc, r) => acc + r.capacity, 0);
        const dormOcc = dormRooms.reduce((acc, r) => acc + r.occupiedCount, 0);
        return {
          dormName: d,
          rooms: dormRooms,
          totalCapacity: dormCap,
          totalOccupied: dormOcc,
        };
      });
  }, [filteredRooms]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDorm('All dormitories');
    setSelectedFloor('All floors');
    setSelectedState('All occupancy states');
  };

  // CSV Report Generator
  const handleExportCSV = () => {
    const headers = [
      'Dormitory',
      'Room Number',
      'Floor',
      'Capacity',
      'Occupied Beds',
      'Available Beds',
      'Occupancy Rate (%)',
      'Occupancy State',
      'Room Status',
    ];

    const rows = filteredRooms.map((r) => [
      `"${r.dormName}"`,
      `"${r.room.room_number}"`,
      `"${r.room.floor}"`,
      r.capacity,
      r.occupiedCount,
      r.availableCount,
      `${r.occupancyRate}%`,
      `"${r.occupancyState}"`,
      `"${r.room.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oap_occupancy_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportModalOpen(false);
    showToast('Occupancy report exported to CSV successfully.');
  };

  // Prepare / Submit Report Action
  const handlePrepareReport = () => {
    if (exportFormat === 'csv') {
      handleExportCSV();
    } else {
      setExportModalOpen(false);
      showToast('Opening print dialog for occupancy report PDF...');
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  // Distinct dormitories count
  const dormsCount = buildings.length > 0 ? buildings.length : 3;

  return (
    <div className="space-y-6">
      {/* Toast alert */}
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

      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F2447]">
            Occupancy Monitoring
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Track dormitory capacity, room occupancy, and available beds at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* 2. 4 KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy Rate */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Occupancy Rate</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
              <PieChart className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{occupancyRate}%</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {occupiedBeds} of {totalBeds} total beds
          </p>
        </div>

        {/* Total Beds */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Beds</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BedDouble className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{totalBeds}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Total dormitory capacity</p>
        </div>

        {/* Occupied Beds */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Occupied Beds</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Bed className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{occupiedBeds}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Active residents assigned</p>
        </div>

        {/* Available Beds */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Available Beds</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="h-4 w-4" />
            </span>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dormitory or room..."
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
              setStateDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">Dormitory:</span>
            <span className="font-semibold text-slate-900">{selectedDorm}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {dormDropdownOpen && (
            <div className="absolute left-0 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Filter by Dorm
              </div>
              {DORMITORY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedDorm(opt);
                    setDormDropdownOpen(false);
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
              setStateDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">Floor:</span>
            <span className="font-semibold text-slate-900">{selectedFloor}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {floorDropdownOpen && (
            <div className="absolute left-0 top-11 z-30 w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Filter by Floor
              </div>
              {FLOOR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedFloor(opt);
                    setFloorDropdownOpen(false);
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

        {/* Occupancy State Dropdown */}
        <div ref={stateRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setStateDropdownOpen((v) => !v);
              setDormDropdownOpen(false);
              setFloorDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">State:</span>
            <span className="font-semibold text-slate-900">{selectedState}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {stateDropdownOpen && (
            <div className="absolute right-0 sm:left-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Occupancy State
              </div>
              {OCCUPANCY_STATE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedState(opt);
                    setStateDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                    selectedState === opt
                      ? 'bg-blue-50 font-semibold text-[#2563EB]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt}</span>
                  {selectedState === opt && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Middle Two-Column Row (Left ~68%, Right ~32%) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Card — Occupancy by dormitory */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#0F2447]">
                  Occupancy by dormitory
                </h2>
                <p className="text-xs text-slate-500">
                  {occupiedBeds} of {totalBeds} beds occupied
                </p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Occupied / Capacity
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {dormitoryBreakdown.map((item) => (
                <div key={item.dormName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0F2447]">{item.dormName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium">
                        {item.occupied} / {item.capacity} beds
                      </span>
                      <span className="font-bold text-slate-900 w-10 text-right">
                        {item.rate}%
                      </span>
                    </div>
                  </div>
                  {/* Rounded royal-blue progress bar */}
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, item.rate))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Official MSUN Girls Dormitory Facilities</span>
            <span>Max 4 beds per room (SRS FR-08/FR-09)</span>
          </div>
        </div>

        {/* Right Card — Capacity overview */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F2447]">Capacity overview</h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-[#0F2447]">
                {globalOccupancyRate}%
              </span>
              <span className="text-xs font-medium text-slate-500">overall occupancy</span>
            </div>

            {/* Segmented horizontal bar: royal blue for occupied + soft green for available */}
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div
                className="h-full bg-[#2563EB] transition-all duration-300"
                style={{
                  width: `${
                    globalTotalBeds > 0
                      ? (globalOccupiedBeds / globalTotalBeds) * 100
                      : 0
                  }%`,
                }}
              />
              <div
                className="h-full bg-emerald-200 transition-all duration-300"
                style={{
                  width: `${
                    globalTotalBeds > 0
                      ? (globalAvailableBeds / globalTotalBeds) * 100
                      : 100
                  }%`,
                }}
              />
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-5 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                <span className="text-slate-700">{globalOccupiedBeds} occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="text-slate-700">{globalAvailableBeds} available</span>
              </div>
            </div>
          </div>

          {/* Footer text */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-xs text-slate-400">
            {dormsCount} dormitories • {allRoomsWithStats.length} rooms • up to 4 beds per room
          </div>
        </div>
      </div>

      {/* 5. Bottom Two-Column Row (Left ~68%, Right ~32%) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Card — Room occupancy map */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <div>
            {/* Header with Color Legend */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#0F2447]">Room occupancy map</h2>
                <p className="text-xs text-slate-500">
                  {filteredRooms.length} rooms across {roomsGroupedByDorm.length} dormitories
                </p>
              </div>
              {/* Legend dots */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                  <span className="text-slate-600">Full</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-600">Partially occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Vacant</span>
                </div>
              </div>
            </div>

            {/* Room tiles grouped by dormitory */}
            <div className="mt-5 space-y-6">
              {roomsGroupedByDorm.length > 0 ? (
                roomsGroupedByDorm.map((group) => (
                  <div key={group.dormName} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0F2447]">
                          {group.dormName}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {group.totalOccupied} / {group.totalCapacity} beds
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {group.rooms.length} {group.rooms.length === 1 ? 'room' : 'rooms'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {group.rooms.map((roomStat) => {
                        const tileClasses =
                          roomStat.occupancyState === 'Full'
                            ? 'bg-[#EAF1FF] text-[#2563EB] border border-blue-200/80 hover:bg-blue-100/80 hover:border-blue-300'
                            : roomStat.occupancyState === 'Partially occupied'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/70 hover:bg-amber-100/70 hover:border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 hover:bg-emerald-100/70 hover:border-emerald-300';

                        return (
                          <button
                            key={roomStat.room.room_id}
                            type="button"
                            onClick={() => setSelectedRoomModal(roomStat)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all shadow-2xs cursor-pointer ${tileClasses}`}
                          >
                            <span className="text-sm font-bold tracking-tight">
                              {roomStat.cleanNumber}
                            </span>
                            <span className="text-[10px] font-semibold mt-0.5 opacity-90">
                              {roomStat.occupiedCount}/{roomStat.capacity} beds
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <Search className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-800">
                    No rooms match the selected filters
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Try adjusting your search query, dormitory, floor, or occupancy state.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-xs text-slate-400">
            Each tile shows occupied beds out of 4. Green rooms are ready for assignment.
          </div>
        </div>

        {/* Right Card — Room status summary */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F2447]">Room status summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current allocation across all dormitories
            </p>

            {/* 3 Status rows with left vertical colored accent bars */}
            <div className="mt-5 space-y-3">
              {/* Full rooms */}
              <div className="flex items-center justify-between rounded-r-xl border-l-4 border-[#2563EB] bg-slate-50/70 py-2.5 pl-3 pr-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">Full rooms</p>
                  <p className="text-[11px] text-slate-500">All 4 beds occupied</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#2563EB]">
                  {roomStatusSummary.full}
                </span>
              </div>

              {/* Partially occupied */}
              <div className="flex items-center justify-between rounded-r-xl border-l-4 border-amber-500 bg-slate-50/70 py-2.5 pl-3 pr-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">Partially occupied</p>
                  <p className="text-[11px] text-slate-500">1–3 beds occupied</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {roomStatusSummary.partial}
                </span>
              </div>

              {/* Vacant rooms */}
              <div className="flex items-center justify-between rounded-r-xl border-l-4 border-emerald-500 bg-slate-50/70 py-2.5 pl-3 pr-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">Vacant rooms</p>
                  <p className="text-[11px] text-slate-500">Ready for assignment</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {roomStatusSummary.vacant}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic capacity callout box at the bottom */}
          <div className="mt-6">
            {highCapacityDorm ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">
                      {highCapacityDorm.dormName} is nearing capacity
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {highCapacityDorm.rate}% occupied · Only {highCapacityDorm.available} beds
                      available
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-200/70 bg-blue-50/60 p-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#0F2447]">
                      All dormitories have available capacity
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {globalAvailableBeds} beds currently open across {dormsCount} dormitories
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: Room Occupancy Detail Modal
      ───────────────────────────────────────────────────────────── */}
      {selectedRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-[#0F2447]">
                  Room {selectedRoomModal.room.room_number} occupancy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the details below before continuing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Read-only #F4F7FC fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F4F7FC] p-3">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Dormitory
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedRoomModal.dormName}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F4F7FC] p-3">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Room
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    Room {selectedRoomModal.room.room_number}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F4F7FC] p-3">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Occupied Beds
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedRoomModal.occupiedCount} of {selectedRoomModal.capacity}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F4F7FC] p-3">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Capacity
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedRoomModal.capacity} beds total
                  </p>
                </div>
              </div>

              {/* Current residents list */}
              <div>
                <p className="text-xs font-bold text-[#0F2447] mb-2.5">Current residents</p>
                <div className="space-y-2">
                  {selectedRoomModal.residents.map((res, idx) => (
                    <div
                      key={res.bed.bed_id || idx}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs">
                          {res.bed.bed_number.replace('Bed ', '')}
                        </span>
                        <div>
                          {res.dormer ? (
                            <>
                              <p className="text-xs font-bold text-slate-900">
                                {res.dormer.first_name} {res.dormer.middle_name || ''}{' '}
                                {res.dormer.last_name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {res.dormer.student_number} • {res.dormer.course}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs italic text-slate-400">
                              Available · Ready for assignment
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          res.dormer
                            ? 'bg-blue-50 text-[#2563EB]'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {res.dormer ? 'Active' : 'Available'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedRoomModal(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoomModal(null)}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
              >
                Back to monitoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: Export Occupancy Report Modal
      ───────────────────────────────────────────────────────────── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-[#0F2447]">
                  Export occupancy report
                </h3>
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

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Scope */}
              <div className="rounded-xl bg-[#F4F7FC] p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Scope
                </span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedDorm === 'All dormitories' ? 'All dormitories' : selectedDorm} •{' '}
                  {filteredRooms.length} rooms • {totalBeds} beds
                </p>
              </div>

              {/* Reporting Date */}
              <div className="rounded-xl bg-[#F4F7FC] p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Reporting date
                </span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Format Selectable Options */}
              <div>
                <label className="block text-xs font-bold text-[#0F2447] mb-2">
                  Format
                </label>
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
                        CSV — Room occupancy report
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Structured spreadsheet with room allocations
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
                      <p className="text-xs font-bold text-slate-900">
                        PDF — Include occupancy map (Print)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Printable layout ready for presentation
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Summary
                </span>
                <p className="text-xs font-bold text-[#0F2447] mt-0.5">
                  {occupiedBeds} occupied beds / {availableBeds} available beds • {occupancyRate}%
                </p>
              </div>
            </div>

            {/* Modal Footer */}
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
