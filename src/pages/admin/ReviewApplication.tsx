import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useOap } from '../../context/useOap';
import type { ApplicantDocument, ApplicantChecklist } from '../../types/oap';

function formatDateTime(isoString?: string | null): string {
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

export default function ReviewApplication() {
  const { id } = useParams<{ id: string }>();
  const applicantId = Number(id);

  const { applicants, dormers, occupancyStats, reviewApplicant } = useOap();

  // Find applicant and linked dormer
  const applicant = applicants.find((a) => a.applicant_id === applicantId);
  const dormer = dormers.find((d) => d.dormer_id === applicant?.dormer_id);

  // Local checklist state (can be toggled before decision)
  const [checklist, setChecklist] = useState<ApplicantChecklist>({
    enrollment_confirmed: applicant?.checklist?.enrollment_confirmed ?? true,
    valid_student_id: applicant?.checklist?.valid_student_id ?? true,
    completed_application: applicant?.checklist?.completed_application ?? true,
  });

  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ApplicantDocument | null>(null);

  // Modal form states
  const [approveNotes, setApproveNotes] = useState(
    'All enrollment and identity requirements are verified.'
  );
  const [approveNotify, setApproveNotify] = useState(true);

  const [waitlistReason, setWaitlistReason] = useState('');
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlistNotify, setWaitlistNotify] = useState(true);

  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectNotify, setRejectNotify] = useState(true);

  // Computed values
  const studentFullName = dormer
    ? `${dormer.first_name} ${dormer.middle_name ? dormer.middle_name + ' ' : ''}${dormer.last_name}`.trim()
    : `Applicant #${applicantId}`;

  const studentInitials = dormer
    ? `${dormer.first_name?.[0] || ''}${dormer.last_name?.[0] || ''}`.toUpperCase()
    : 'AP';

  const appCode =
    applicant?.application_code || `APP-${String(applicantId).padStart(4, '0')}`;
  const submittedDate = formatDateTime(applicant?.submitted_at || applicant?.application_date);
  const reviewedDate = formatDateTime(applicant?.reviewed_at);

  const status = (
    applicant?.status ||
    applicant?.application_status ||
    'pending'
  ).toLowerCase() as 'pending' | 'approved' | 'waitlisted' | 'rejected';

  const availableBeds = occupancyStats.availableBeds;
  const isDormAvailable = availableBeds > 0;

  const allChecklistVerified =
    checklist.enrollment_confirmed &&
    checklist.valid_student_id &&
    checklist.completed_application &&
    isDormAvailable;

  const canEditChecklist = status === 'pending' || status === 'waitlisted';

  // Toggle checklist item
  const handleToggleChecklist = (field: keyof ApplicantChecklist) => {
    if (!canEditChecklist) return;
    setChecklist((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Submit decision handlers
  const handleConfirmApprove = () => {
    reviewApplicant(applicantId, 'approved', approveNotes, approveNotify, checklist);
    setApproveModalOpen(false);
  };

  const handleConfirmWaitlist = () => {
    if (!waitlistReason.trim()) {
      setWaitlistError('Please provide a reason for waitlisting.');
      return;
    }
    reviewApplicant(applicantId, 'waitlisted', waitlistReason.trim(), waitlistNotify, checklist);
    setWaitlistModalOpen(false);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectError('Please provide a reason for rejecting.');
      return;
    }
    reviewApplicant(applicantId, 'rejected', rejectReason.trim(), rejectNotify, checklist);
    setRejectModalOpen(false);
  };

  if (!applicant) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/applicants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#152852] hover:text-[#1e3a75] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to applicants</span>
        </Link>
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-900">Applicant Not Found</h2>
          <p className="mt-1 text-xs text-slate-500">
            No application was found matching ID #{id}.
          </p>
          <Link
            to="/admin/applicants"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#152852] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1e3a75]"
          >
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  // Attached documents (COR + optional Proof of Scholarship)
  const corDocument: ApplicantDocument = applicant?.documents?.find(
    (d) =>
      d.title.toLowerCase().includes('certificate of registration') ||
      d.title.toLowerCase().includes('cor')
  ) ||
    applicant?.documents?.[0] || {
      id: `doc-${applicantId}-cor`,
      title: 'Certificate of Registration (COR)',
      file_type: 'PDF',
      submitted_at: `${submittedDate} · 09:30 AM`,
      file_name: `cor_sem1_2026_${dormer?.last_name?.toLowerCase() || 'student'}.pdf`,
    };

  const isScholarApplicant =
    applicant?.is_scholar === true || applicant?.scholarship_status === true;

  const scholarshipDocument: ApplicantDocument = applicant?.documents?.find((d) =>
    d.title.toLowerCase().includes('scholarship')
  ) || {
    id: `doc-scholar-${applicantId}`,
    title: 'Proof of Scholarship',
    file_type: 'PDF',
    submitted_at: corDocument.submitted_at,
    file_name: 'Proof_of_Scholarship_2026.pdf',
  };

  return (
    <div className="space-y-6">
      {/* Top back link */}
      <div>
        <Link
          to="/admin/applicants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#152852] hover:text-[#1e3a75] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to applicants</span>
        </Link>
      </div>

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#152852]">Review Application</h1>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
          <span className="font-mono text-slate-900">{appCode}</span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-slate-500">Submitted {submittedDate}</span>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column: 3 stacked cards */}
        <div className="space-y-5 lg:col-span-7 xl:col-span-8">
          {/* 1. Applicant Summary Header Card */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#EFE6D2] bg-[#FFF8EB] text-sm font-bold text-[#152852]">
                  {studentInitials}
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{studentFullName}</h2>
                  <p className="text-xs text-slate-500">
                    {dormer?.course || 'MSU at Naawan'} &bull; {dormer?.year_level || '1st Year'}
                  </p>
                </div>
              </div>

              <div>
                {status === 'pending' && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Pending
                  </span>
                )}
                {status === 'approved' && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Approved
                  </span>
                )}
                {status === 'waitlisted' && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    Waitlisted
                  </span>
                )}
                {status === 'rejected' && (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                    Rejected
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 01 Student Details */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-[#152852] uppercase">
              01 Student Details
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Full Name</p>
                <p className="mt-1 font-bold text-slate-900">{studentFullName}</p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Student ID</p>
                <p className="mt-1 font-mono font-bold text-slate-900">
                  {dormer?.student_number || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Email Address</p>
                <p className="mt-1 font-medium text-slate-800 truncate">
                  {dormer?.email || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Mobile Number</p>
                <p className="mt-1 font-medium text-slate-800">
                  {dormer?.contact_number || applicant.emergency_contact_number || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Course / Program</p>
                <p className="mt-1 font-bold text-slate-900">
                  {dormer?.course || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Year Level</p>
                <p className="mt-1 font-bold text-slate-900">
                  {dormer?.year_level || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Scholar Status</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {applicant.is_scholar || applicant.scholarship_status
                    ? 'Yes — Scholar'
                    : 'No — Non-scholar'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Application Status</p>
                <div className="mt-1">
                  {status === 'pending' && (
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      Pending
                    </span>
                  )}
                  {status === 'approved' && (
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                      Approved
                    </span>
                  )}
                  {status === 'waitlisted' && (
                    <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                      Waitlisted
                    </span>
                  )}
                  {status === 'rejected' && (
                    <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 02 Emergency Contact */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-[#152852] uppercase">
              02 Emergency Contact
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Contact Person</p>
                <p className="mt-1 font-bold text-slate-900">
                  {applicant.emergency_contact_name || dormer?.emergency_contact_name || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Relationship</p>
                <p className="mt-1 font-bold text-slate-900">
                  {applicant.emergency_contact_relationship || dormer?.emergency_contact_relationship || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Mobile Number</p>
                <p className="mt-1 font-medium text-slate-800">
                  {applicant.emergency_contact_number || dormer?.emergency_contact_number || '—'}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFF8EB] p-3">
                <p className="font-semibold text-slate-500">Home Address</p>
                <p className="mt-1 font-medium text-slate-800">
                  {applicant.home_address || applicant.address || dormer?.address || '—'}
                </p>
              </div>
            </div>
          </section>

          {/* 03 Attached Document */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-[#152852] uppercase">
              03 Attached Document
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Certificate of Registration (COR) submitted for dormitory application.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF8EB] p-3.5 transition hover:bg-[#FFF8EB]/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#152852]/10 text-[#152852]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{corDocument.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {corDocument.file_type} &bull; Submitted {corDocument.submitted_at}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDoc(corDocument)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#152852] shadow-2xs hover:bg-slate-50 hover:text-[#1e3a75] cursor-pointer"
              >
                View document
              </button>
            </div>
          </section>

          {/* 04 Proof of Scholarship (Conditional) */}
          {isScholarApplicant && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold tracking-wider text-[#152852] uppercase">
                04 Proof of Scholarship
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Document confirming current scholarship status.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF8EB] p-3.5 transition hover:bg-[#FFF8EB]/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E2B743]/50 bg-[#E2B743]/15 text-[#152852]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {scholarshipDocument.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {scholarshipDocument.file_type} &bull; Submitted{' '}
                      {scholarshipDocument.submitted_at}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDoc(scholarshipDocument)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#152852] shadow-2xs hover:bg-slate-50 hover:text-[#1e3a75] cursor-pointer"
                >
                  View document
                </button>
              </div>
            </section>
          )}

          {/* Compact Confirmation Consent Note */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
            <span className="font-bold text-emerald-600">✓</span>
            <span>
              Applicant confirmed information accuracy and consented to its use for dormitory application.
            </span>
          </div>
        </div>

        {/* Right Column: 2 stacked cards */}
        <div className="space-y-5 lg:col-span-5 xl:col-span-4">
          {/* 1. Review Checklist Card */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Review Checklist</h3>
            <p className="mt-0.5 text-xs text-slate-500">Verify requirements before a decision.</p>

            <div className="mt-4 space-y-2.5 text-xs">
              {/* Item 1 */}
              <div
                onClick={() => handleToggleChecklist('enrollment_confirmed')}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  canEditChecklist ? 'cursor-pointer hover:border-[#152852]/40' : ''
                } ${
                  checklist.enrollment_confirmed
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">1.</span>
                  <span className="font-semibold text-slate-800">Enrollment confirmation</span>
                </div>
                {checklist.enrollment_confirmed ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    &mdash; Not verified
                  </span>
                )}
              </div>

              {/* Item 2 */}
              <div
                onClick={() => handleToggleChecklist('valid_student_id')}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  canEditChecklist ? 'cursor-pointer hover:border-[#152852]/40' : ''
                } ${
                  checklist.valid_student_id
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">2.</span>
                  <span className="font-semibold text-slate-800">Valid student ID</span>
                </div>
                {checklist.valid_student_id ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    &mdash; Not verified
                  </span>
                )}
              </div>

              {/* Item 3 */}
              <div
                onClick={() => handleToggleChecklist('completed_application')}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  canEditChecklist ? 'cursor-pointer hover:border-[#152852]/40' : ''
                } ${
                  checklist.completed_application
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">3.</span>
                  <span className="font-semibold text-slate-800">Completed application</span>
                </div>
                {checklist.completed_application ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    &mdash; Not verified
                  </span>
                )}
              </div>

              {/* Item 4 (Live Dormitory availability check) */}
              <div
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  isDormAvailable
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">4.</span>
                  <span className="font-semibold text-slate-800">Dormitory availability</span>
                </div>
                {isDormAvailable ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <Check className="h-3 w-3" />
                    Verified ({availableBeds} beds)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    &mdash; No available beds
                  </span>
                )}
              </div>
            </div>

            {canEditChecklist && (
              <p className="mt-3 text-[11px] text-slate-400 text-center">
                Click items 1–3 to toggle verification status.
              </p>
            )}
          </section>

          {/* 2. Application Decision Card */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Application Decision</h3>

            {/* Tinted status banner when approved / rejected / waitlisted */}
            {status === 'approved' && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Approved application</span>
                </div>
                <p className="mt-1 text-slate-700">
                  {applicant.decision_notes ||
                    applicant.evaluation_notes ||
                    'Application approved for residency. Ready for bed assignment.'}
                </p>
                {applicant.reviewed_at && (
                  <p className="mt-2 text-[10px] text-emerald-700">
                    Reviewed on {reviewedDate}
                  </p>
                )}
              </div>
            )}

            {status === 'rejected' && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span>Rejected application</span>
                </div>
                <p className="mt-1 text-slate-700">
                  {applicant.decision_notes ||
                    applicant.evaluation_notes ||
                    'Application could not be approved.'}
                </p>
                {applicant.reviewed_at && (
                  <p className="mt-2 text-[10px] text-rose-700">
                    Reviewed on {reviewedDate}
                  </p>
                )}
              </div>
            )}

            {status === 'waitlisted' && (
              <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-3.5 text-xs text-purple-900 mb-3">
                <div className="flex items-center gap-1.5 font-bold text-purple-800">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span>Waitlisted application</span>
                </div>
                <p className="mt-1 text-slate-700">
                  {applicant.decision_notes ||
                    applicant.evaluation_notes ||
                    'Application placed on waitlist.'}
                </p>
                {applicant.reviewed_at && (
                  <p className="mt-2 text-[10px] text-purple-700">
                    Reviewed on {reviewedDate}
                  </p>
                )}
              </div>
            )}

            {/* Interactive decision controls for pending and waitlisted */}
            {(status === 'pending' || status === 'waitlisted') && (
              <div className="mt-3 space-y-3">
                {allChecklistVerified ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>All requirements verified. Select a decision.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Verify requirements before approving.</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setApproveNotify(true);
                      setApproveModalOpen(true);
                    }}
                    className="rounded-xl bg-[#152852] py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#1e3a75] text-center"
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWaitlistReason(applicant.decision_notes || '');
                      setWaitlistError('');
                      setWaitlistNotify(true);
                      setWaitlistModalOpen(true);
                    }}
                    className="rounded-xl bg-[#5B4B9E] py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-purple-800 text-center"
                  >
                    Waitlist
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectReason(applicant.decision_notes || '');
                      setRejectError('');
                      setRejectNotify(true);
                      setRejectModalOpen(true);
                    }}
                    className="rounded-xl bg-[#9F2B36] py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-rose-900 text-center"
                  >
                    Reject
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  A confirmation is required before saving.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* --- 4. THREE CONFIRMATION MODALS --- */}

      {/* APPROVE APPLICATION MODAL */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setApproveModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#152852]">Approve Application</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {appCode} &bull; {studentFullName} &bull; {status.toUpperCase()}
            </p>

            <div className="mt-4 rounded-xl border border-[#EFE6D2] bg-[#FFF8EB] p-3 text-xs text-[#152852]">
              <span className="font-semibold">Notice:</span> Approval does not assign a room or bed.
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Review notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="All enrollment and identity requirements are verified."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-1 focus:ring-[#152852]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={approveNotify}
                  onChange={(e) => setApproveNotify(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#152852] focus:ring-[#152852]"
                />
                <span className="text-xs font-medium text-slate-700">
                  Notify applicant of this decision
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="rounded-xl bg-[#152852] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#1e3a75]"
              >
                Confirm approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITLIST APPLICATION MODAL */}
      {waitlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setWaitlistModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#152852]">Waitlist Application</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {appCode} &bull; {studentFullName} &bull; {status.toUpperCase()}
            </p>

            <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs text-purple-900">
              <span className="font-semibold">Notice:</span> The applicant will be placed on the waitlist pending slot allocation review.
            </div>

            {waitlistError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{waitlistError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Reason *
                </label>
                <textarea
                  rows={3}
                  value={waitlistReason}
                  onChange={(e) => {
                    setWaitlistReason(e.target.value);
                    if (e.target.value.trim()) setWaitlistError('');
                  }}
                  placeholder="Enter reason for waitlisting this applicant..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#5B4B9E] focus:outline-none focus:ring-1 focus:ring-[#5B4B9E]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={waitlistNotify}
                  onChange={(e) => setWaitlistNotify(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#5B4B9E] focus:ring-[#5B4B9E]"
                />
                <span className="text-xs font-medium text-slate-700">
                  Notify applicant of this decision
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setWaitlistModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWaitlist}
                className="rounded-xl bg-[#5B4B9E] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-purple-800"
              >
                Confirm waitlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT APPLICATION MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#152852]">Reject Application</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {appCode} &bull; {studentFullName} &bull; {status.toUpperCase()}
            </p>

            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-900">
              <span className="font-semibold">Notice:</span> The applicant will no longer appear in the pending queue.
            </div>

            {rejectError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (e.target.value.trim()) setRejectError('');
                  }}
                  placeholder="Student ID could not be verified."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#9F2B36] focus:outline-none focus:ring-1 focus:ring-[#9F2B36]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rejectNotify}
                  onChange={(e) => setRejectNotify(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#9F2B36] focus:ring-[#9F2B36]"
                />
                <span className="text-xs font-medium text-slate-700">
                  Notify applicant of this decision
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-xl bg-[#9F2B36] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-rose-900"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-[#152852]">{selectedDoc.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedDoc.file_name} &bull; {selectedDoc.file_type} &bull; Submitted {selectedDoc.submitted_at}
              </p>
            </div>

            {/* Document Mock Preview Frame */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                {/* Header */}
                <div className="border-b border-slate-200 pb-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Mindanao State University at Naawan
                  </p>
                  <p className="text-sm font-bold text-[#152852]">Office of Admissions & Student Housing</p>
                  <p className="mt-1 text-[10px] text-slate-400 font-mono">
                    VERIFIED DOCUMENT REFERENCE: {appCode}
                  </p>
                </div>

                {/* Body Details */}
                <div className="mt-5 space-y-3 text-xs text-slate-700">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Applicant:</span>
                    <span className="font-bold text-slate-900">{studentFullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Student ID:</span>
                    <span className="font-mono font-bold text-slate-900">{dormer?.student_number || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Program:</span>
                    <span className="font-bold text-slate-900">{dormer?.course || 'Official Program'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Document Title:</span>
                    <span className="font-bold text-slate-900">{selectedDoc.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Timestamp:</span>
                    <span className="text-slate-600">{selectedDoc.submitted_at}</span>
                  </div>
                </div>

                {/* Document Preview Source Note */}
                <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-center text-xs text-slate-500">
                  Uploaded via the OAP Student Application Portal (Document Preview)
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
