import { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useOap } from '../../context/useOap';

const STATUS_OPTIONS = ['All statuses', 'Pending', 'Approved', 'Waitlisted', 'Rejected'];
const ITEMS_PER_PAGE = 6;

function formatSubmittedDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 10);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString.slice(0, 10);
  }
}

export default function ApplicantManagement() {
  const { applicants, dormers } = useOap();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Ref for outside click
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge applicants with dormer info
  const applicantsWithMeta = useMemo(() => {
    return applicants.map((app) => {
      const dormer = dormers.find((d) => d.dormer_id === app.dormer_id);
      const appCode = app.application_code || `APP-${String(app.applicant_id).padStart(4, '0')}`;
      const fullName = dormer
        ? `${dormer.first_name} ${dormer.middle_name ? dormer.middle_name + ' ' : ''}${dormer.last_name}`.trim()
        : `Applicant #${app.applicant_id}`;
      const initials = dormer
        ? `${dormer.first_name?.[0] || ''}${dormer.last_name?.[0] || ''}`.toUpperCase()
        : 'AP';
      const studentNumber = dormer?.student_number || '—';
      const courseAndYear = dormer ? `${dormer.course} - ${dormer.year_level}` : '—';
      const appStatus = (app.status || app.application_status || 'pending').toLowerCase() as
        | 'pending'
        | 'approved'
        | 'waitlisted'
        | 'rejected';
      const submittedFormatted = formatSubmittedDate(app.submitted_at || app.application_date);

      return {
        ...app,
        appCode,
        fullName,
        initials,
        studentNumber,
        courseAndYear,
        appStatus,
        submittedFormatted,
      };
    });
  }, [applicants, dormers]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalApplicants = applicantsWithMeta.length;
    const pendingCount = applicantsWithMeta.filter((a) => a.appStatus === 'pending').length;
    const approvedCount = applicantsWithMeta.filter((a) => a.appStatus === 'approved').length;
    const waitlistedCount = applicantsWithMeta.filter((a) => a.appStatus === 'waitlisted').length;
    const rejectedCount = applicantsWithMeta.filter((a) => a.appStatus === 'rejected').length;

    return {
      totalApplicants,
      pendingCount,
      approvedCount,
      waitlistedCount,
      rejectedCount,
    };
  }, [applicantsWithMeta]);

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applicantsWithMeta.filter((app) => {
      // Search matching
      if (q) {
        const matchesCode = app.appCode.toLowerCase().includes(q);
        const matchesId = app.studentNumber.toLowerCase().includes(q);
        const matchesName = app.fullName.toLowerCase().includes(q);
        if (!matchesCode && !matchesId && !matchesName) return false;
      }
      // Status filter
      if (statusFilter !== 'All statuses') {
        if (app.appStatus !== statusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [applicantsWithMeta, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / ITEMS_PER_PAGE));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const startIndex = (currentPageClamped - 1) * ITEMS_PER_PAGE;
  const paginatedApplicants = filteredApplicants.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All statuses');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter Toolbar */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#0F2447]">Applicant Management</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-72 sm:w-80">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search applicant by name or ID..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9.5 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
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
            </div>

            {/* Status Dropdown */}
            <div ref={statusRef} className="relative flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <button
                type="button"
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
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
        </div>
      </div>

      {/* 2. Two-Column Layout (Directory Left, 2 Stacked Cards Right) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left Card — APPLICANTS DIRECTORY */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-9">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-xs font-bold tracking-wider text-[#0F2447] uppercase">
              Applicants Directory
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {filteredApplicants.length} {filteredApplicants.length === 1 ? 'applicant' : 'applicants'} found
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#EEF3FC] text-slate-700">
                  <th className="px-3.5 py-2.5 font-bold">Application ID</th>
                  <th className="px-3.5 py-2.5 font-bold">Applicant Name</th>
                  <th className="px-3.5 py-2.5 font-bold">Course & Year</th>
                  <th className="px-3.5 py-2.5 font-bold">Submitted</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedApplicants.length > 0 ? (
                  paginatedApplicants.map((applicant) => (
                    <tr key={applicant.applicant_id} className="transition hover:bg-slate-50/70">
                      {/* Application ID */}
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono font-medium text-slate-700">
                        {applicant.appCode}
                      </td>

                      {/* Applicant Name with circular initials avatar */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#2563EB]">
                            {applicant.initials}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{applicant.fullName}</p>
                            <p className="font-mono text-[10px] text-slate-400">
                              ID: {applicant.studentNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Course & Year */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-slate-600">
                        {applicant.courseAndYear}
                      </td>

                      {/* Submitted Date */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-slate-600">
                        {applicant.submittedFormatted}
                      </td>

                      {/* Status Badge */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {applicant.appStatus === 'pending' && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            Pending
                          </span>
                        )}
                        {applicant.appStatus === 'approved' && (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Approved
                          </span>
                        )}
                        {applicant.appStatus === 'waitlisted' && (
                          <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                            Waitlisted
                          </span>
                        )}
                        {applicant.appStatus === 'rejected' && (
                          <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Action Link */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <Link
                          to={`/admin/applicants/${applicant.applicant_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <Users className="h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-800">
                          No applicants found
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          No applicant records match your search or filter criteria.
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

          {/* Pagination Footer (6 entries per page) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <span className="text-xs text-slate-500">
              Showing {filteredApplicants.length > 0 ? startIndex + 1 : 0} to{' '}
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredApplicants.length)} of{' '}
              {filteredApplicants.length} applicants
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

        {/* Right Column — 2 Stacked Cards */}
        <div className="space-y-4 xl:col-span-3">
          {/* Card 1: Application Summary */}
          <section className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Application Summary</h2>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Applicants:</span>
                <span className="font-bold text-slate-900 text-sm">{summary.totalApplicants}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pending Review:</span>
                <span className="font-bold text-amber-600 text-sm">{summary.pendingCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Approved:</span>
                <span className="font-bold text-emerald-600 text-sm">{summary.approvedCount}</span>
              </div>
            </div>

            <div className="my-4 border-t border-slate-100" />

            <div>
              <p className="text-xs font-bold text-slate-800">Other Decisions</p>
              <div className="mt-3 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-xs bg-[#5B4B9E] shrink-0" />
                    <span>Waitlisted</span>
                  </div>
                  <span className="font-semibold text-slate-600">({summary.waitlistedCount})</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-xs bg-[#E11D48] shrink-0" />
                    <span>Rejected</span>
                  </div>
                  <span className="font-semibold text-slate-600">({summary.rejectedCount})</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Review Checklist */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Review Checklist</h2>
            <p className="mt-1 text-xs text-slate-500">Before approving, verify:</p>

            <ul className="mt-3 space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2563EB]">1.</span>
                <span>Enrollment confirmation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2563EB]">2.</span>
                <span>Valid student ID</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2563EB]">3.</span>
                <span>Completed application</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2563EB]">4.</span>
                <span>Dormitory availability</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
