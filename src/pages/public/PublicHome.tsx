import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2 } from 'lucide-react';
import { useOap } from '../../context/useOap';

function formatBuildingLabel(buildingName: string, buildingId: number): string {
  const normalized = buildingName.trim().toLowerCase();
  if (normalized.includes('dormitory a') || normalized === 'dorm a') return 'BUILDING A';
  if (normalized.includes('dormitory b') || normalized === 'dorm b') return 'BUILDING B';
  if (normalized.includes('dormitory c') || normalized === 'dorm c') return 'BUILDING C';
  return `BUILDING ${String.fromCharCode(64 + buildingId)}`;
}

export default function PublicHome() {
  const { buildings, rooms, beds } = useOap();

  const availabilityStats = useMemo(() => {
    const activeRooms = rooms.filter((r) => r.status !== 'maintenance');
    const availableRoomsList = activeRooms.filter((room) =>
      beds.some((b) => b.room_id === room.room_id && b.bed_status === 'available')
    );

    const activeRoomIds = new Set(activeRooms.map((r) => r.room_id));
    const totalAvailableBeds = beds.filter(
      (b) => activeRoomIds.has(b.room_id) && b.bed_status === 'available'
    ).length;

    const byBuilding = buildings.map((bldg) => {
      const bldgActiveRooms = activeRooms.filter((r) => r.building_id === bldg.building_id);
      const bldgRoomIds = new Set(bldgActiveRooms.map((r) => r.room_id));
      const bldgAvailableRooms = bldgActiveRooms.filter((room) =>
        beds.some((b) => b.room_id === room.room_id && b.bed_status === 'available')
      ).length;
      const bldgAvailableBeds = beds.filter(
        (b) => bldgRoomIds.has(b.room_id) && b.bed_status === 'available'
      ).length;

      return {
        buildingId: bldg.building_id,
        label: formatBuildingLabel(bldg.building_name, bldg.building_id),
        buildingName: bldg.building_name,
        availableRooms: bldgAvailableRooms,
        availableBeds: bldgAvailableBeds,
      };
    });

    return {
      availableRooms: availableRoomsList.length,
      availableBeds: totalAvailableBeds,
      byBuilding,
    };
  }, [buildings, rooms, beds]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#152852] p-8 text-white shadow-md md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D4A537]/10 blur-2xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="inline-block rounded-full border border-[#D4A537]/50 bg-white/10 px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#D4A537] uppercase">
              MSU AT NAAWAN
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your Home Away From Home
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm text-slate-200 sm:text-base">
              Explore dormitory room availability and occupancy information.
            </p>
          </div>
          <Link
            to="/apply"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D4A537] px-6 py-3 text-xs font-bold tracking-wider text-[#152852] uppercase shadow-sm transition hover:bg-[#c2942c]"
          >
            <span>Apply Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Section: Dormitory Availability */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#152852] sm:text-2xl">
            Dormitory Availability
          </h2>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Live room and bed openings across MSUN Girls Dormitory buildings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Dark Navy Card */}
          <div className="flex items-center justify-between rounded-2xl bg-[#152852] p-7 text-white shadow-md">
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {availabilityStats.availableRooms}
              </p>
              <p className="mt-2 text-sm font-semibold tracking-wide text-slate-200">
                Available Rooms
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#D4A537]/30 bg-white/10 text-[#D4A537]">
              <Building2 className="h-8 w-8" />
            </div>
          </div>

          {/* Right White Card */}
          <div className="flex items-center justify-between rounded-2xl border border-[#D4A537]/25 bg-white p-7 shadow-sm">
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-[#152852] sm:text-5xl">
                {availabilityStats.availableBeds}
              </p>
              <p className="mt-2 text-sm font-semibold tracking-wide text-slate-600">
                Available Beds
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8EB] text-[#152852] border border-[#D4A537]/30">
              <BedDouble className="h-8 w-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Section: Availability by Building */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#152852] sm:text-2xl">
            Availability by Building
          </h2>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Current room and bed availability per dormitory building.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {availabilityStats.byBuilding.map((bldg) => (
            <div
              key={bldg.buildingId}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:border-[#D4A537]/60"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-extrabold tracking-wider text-[#152852] uppercase">
                  {bldg.label}
                </h3>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#FFF8EB] p-4">
                  <p className="text-2xl font-extrabold text-[#152852]">
                    {bldg.availableRooms}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    Available Rooms
                  </p>
                </div>
                <div className="rounded-xl bg-[#FFF8EB] p-4">
                  <p className="text-2xl font-extrabold text-[#152852]">
                    {bldg.availableBeds}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    Available Beds
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
