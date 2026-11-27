import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Info } from 'lucide-react';

interface ConfirmationState {
  applicantName?: string;
  studentNumber?: string;
  applicationCode?: string;
}

export default function PublicConfirmation() {
  const location = useLocation();
  const state = (location.state as ConfirmationState | null) || {};

  const applicantName = state.applicantName || 'Applicant';
  const firstName = applicantName.trim().split(/\s+/)[0] || 'Applicant';
  const studentNumber = state.studentNumber || '—';
  const applicationCode = state.applicationCode || 'APP-PENDING';

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#152852] p-8 text-white shadow-md md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D4A537]/10 blur-2xl" />
        <div className="relative z-10">
          <p className="text-xs font-extrabold tracking-widest text-[#D4A537] uppercase">
            APPLICATION RECEIVED
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Thank you for applying, {firstName}.
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm text-slate-200 sm:text-base">
            Your details have been sent for review. Here is what happens next.
          </p>
        </div>
      </section>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Card */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-sm lg:col-span-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            <span>Successfully submitted</span>
          </span>

          <h2 className="mt-4 text-2xl font-bold text-[#152852]">Application submitted</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your details have been sent to the dormitory office.
          </p>

          {/* Details Grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-[#FFF8EB] p-4">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                APPLICANT
              </p>
              <p className="mt-1 text-sm font-bold text-[#152852] break-words">
                {applicantName}
              </p>
            </div>
            <div className="rounded-xl bg-[#FFF8EB] p-4">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                STUDENT ID
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-[#152852]">{studentNumber}</p>
            </div>
            <div className="rounded-xl bg-[#FFF8EB] p-4">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                APPLICATION ID
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-[#152852]">{applicationCode}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              STATUS
            </span>
            <span className="text-xs font-bold text-emerald-700">Pending office review</span>
          </div>

          {/* Notice */}
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#D4A537]/40 bg-[#FFF8EB] p-4 text-xs text-[#152852]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A537]" />
            <span>
              Submitting an application does not guarantee a room. The office will confirm any
              room assignment after review.
            </span>
          </div>

          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4A537] px-6 py-3 text-sm font-bold text-[#152852] shadow-xs transition hover:bg-[#c2942c]"
            >
              <span>Return to Home</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Right Card */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-sm lg:col-span-5">
          <h2 className="text-xl font-bold text-[#152852]">What happens next?</h2>
          <p className="mt-1 text-xs text-slate-500">
            Follow these steps while waiting for confirmation.
          </p>

          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#152852] text-xs font-extrabold text-[#D4A537]">
                01
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#152852]">Office review</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Dormitory personnel verify your enrollment status, emergency contact, and
                  submitted documents.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#152852] text-xs font-extrabold text-[#D4A537]">
                02
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#152852]">Watch for an update</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Keep your email and mobile number active for notifications regarding your
                  application decision.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#152852] text-xs font-extrabold text-[#D4A537]">
                03
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#152852]">Room assignment</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Once approved, the dormitory office assigns your building, room, and bed
                  number.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
