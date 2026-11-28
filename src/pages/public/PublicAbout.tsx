import { useState } from 'react';
import { Building2, ImageIcon, ShieldCheck } from 'lucide-react';

interface FacilityCard {
  src: string;
  alt: string;
  label: string;
  caption: string;
}

const FACILITIES: FacilityCard[] = [
  {
    src: '/images/facility-1.png',
    alt: 'MSUN Girls Dormitory outdoor courtyard and walkway seating',
    label: 'Courtyard & Seating Area',
    caption: 'Shaded outdoor benches and garden walkway for relaxing between classes.',
  },
  {
    src: '/images/facility-2.png',
    alt: 'MSUN Girls Dormitory building exterior and front lawn',
    label: 'Dormitory Grounds',
    caption: 'Well-kept campus dormitory building surrounded by trees and green space.',
  },
  {
    src: '/images/facility-3.png',
    alt: 'MSUN Girls Dormitory shared comfort room and shower area',
    label: 'Shared Comfort Room & Showers',
    caption: 'Clean tiled restrooms, shower stalls, and washbasins for residents.',
  },
];

function FacilityPhotoCard({ facility }: { facility: FacilityCard }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#152852] to-[#1e3a75] p-6 text-center text-white shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D4A537]/40 bg-white/10 text-[#D4A537]">
          <ImageIcon className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-bold text-white">{facility.label}</p>
        <p className="mt-1 text-xs text-slate-300">{facility.caption}</p>
      </div>
    );
  }

  return (
    <img
      src={facility.src}
      alt={facility.alt}
      onError={() => setImgError(true)}
      className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm"
    />
  );
}

export default function PublicAbout() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#152852] p-8 text-white shadow-md md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D4A537]/10 blur-2xl" />
        <div className="relative z-10">
          <span className="inline-block rounded-full border border-[#D4A537]/50 bg-white/10 px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#D4A537] uppercase">
            ABOUT US
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            About MSUN Girls Dormitory
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm text-slate-200 sm:text-base">
            Learn more about our dormitory, facilities, and purpose.
          </p>
        </div>
      </section>

      {/* Two-Column Text Section */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8EB] text-[#152852] border border-[#D4A537]/30">
              <Building2 className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-[#152852]">About the Dormitory</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            MSUN Girls Dormitory provides safe, comfortable, and convenient accommodation for
            female students of Mindanao State University at Naawan. Our dormitory is committed
            to supporting students&apos; academic journey in a secure and nurturing environment.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#152852] text-[#D4A537]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-[#152852]">Our Purpose</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The OAP is designed to make dormitory management more efficient and transparent. It
            helps students easily check room availability and provides dormitory personnel with an
            organized system for monitoring occupancy.
          </p>
        </div>
      </section>

      {/* Our Facilities Section */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#152852] sm:text-2xl">Our Facilities</h2>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            A glimpse inside MSUN Girls Dormitory living spaces and grounds.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FACILITIES.map((facility) => (
            <FacilityPhotoCard key={facility.src} facility={facility} />
          ))}
        </div>
      </section>
    </div>
  );
}
