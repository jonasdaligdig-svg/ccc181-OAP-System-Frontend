import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  UploadCloud,
  X,
} from 'lucide-react';
import { useOap } from '../../context/useOap';
import type { PublicUploadFileInfo } from '../../context/oapContextDef';

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

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';

function isValidUploadFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png')
  );
}

interface FormErrors {
  fullName?: string;
  studentNumber?: string;
  email?: string;
  contactNumber?: string;
  course?: string;
  yearLevel?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
  homeAddress?: string;
  corFile?: string;
  scholarshipFile?: string;
  consentConfirmed?: string;
}

export default function PublicApply() {
  const navigate = useNavigate();
  const { submitPublicApplication } = useOap();

  // 01 Student details
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [course, setCourse] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [isScholar, setIsScholar] = useState<boolean>(false);

  // 02 Emergency contact
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

  // 03 & 04 File attachments
  const [corFile, setCorFile] = useState<PublicUploadFileInfo | null>(null);
  const [scholarshipFile, setScholarshipFile] = useState<PublicUploadFileInfo | null>(null);
  const [corDragActive, setCorDragActive] = useState(false);
  const [scholDragActive, setScholDragActive] = useState(false);

  const corInputRef = useRef<HTMLInputElement>(null);
  const scholInputRef = useRef<HTMLInputElement>(null);

  // Consent & validation
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const handleFileSelect = (
    file: File | undefined,
    target: 'cor' | 'scholarship'
  ) => {
    if (!file) return;
    if (!isValidUploadFile(file)) {
      setErrors((prev) => ({
        ...prev,
        [target === 'cor' ? 'corFile' : 'scholarshipFile']:
          'Accepted file formats are PDF, JPG, JPEG, or PNG.',
      }));
      return;
    }
    const info: PublicUploadFileInfo = {
      name: file.name,
      type: file.type || 'application/octet-stream',
    };
    if (target === 'cor') {
      setCorFile(info);
      setErrors((prev) => ({ ...prev, corFile: undefined }));
    } else {
      setScholarshipFile(info);
      setErrors((prev) => ({ ...prev, scholarshipFile: undefined }));
    }
  };

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    target: 'cor' | 'scholarship'
  ) => {
    e.preventDefault();
    if (target === 'cor') setCorDragActive(false);
    else setScholDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file, target);
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!studentNumber.trim()) nextErrors.studentNumber = 'Student ID is required.';

    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!contactNumber.trim()) nextErrors.contactNumber = 'Mobile number is required.';
    if (!course) nextErrors.course = 'Please select your course or program.';
    if (!yearLevel) nextErrors.yearLevel = 'Please select your year level.';

    if (!emergencyContactName.trim()) {
      nextErrors.emergencyContactName = 'Contact person is required.';
    }
    if (!emergencyContactRelationship.trim()) {
      nextErrors.emergencyContactRelationship = 'Relationship is required.';
    }
    if (!emergencyContactNumber.trim()) {
      nextErrors.emergencyContactNumber = 'Emergency mobile number is required.';
    }
    if (!homeAddress.trim()) {
      nextErrors.homeAddress = 'Home address is required.';
    }

    if (!corFile) {
      nextErrors.corFile = 'Please upload your Certificate of Registration (COR).';
    }
    if (isScholar && !scholarshipFile) {
      nextErrors.scholarshipFile = 'Please upload your Proof of Scholarship document.';
    }
    if (!consentConfirmed) {
      nextErrors.consentConfirmed =
        'You must confirm accuracy and consent to submit your application.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate() || !corFile) {
      return;
    }

    const result = submitPublicApplication({
      fullName,
      studentNumber,
      email,
      contactNumber,
      course,
      yearLevel,
      isScholar,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactNumber,
      homeAddress,
      corFile,
      scholarshipFile: isScholar ? scholarshipFile : null,
      consentConfirmed,
    });

    if (!result.success) {
      setSubmitError(result.error || 'Unable to submit application. Please try again.');
      return;
    }

    navigate('/apply/confirmation', {
      state: {
        applicantName: fullName.trim(),
        studentNumber: studentNumber.trim(),
        applicationCode: result.applicationCode,
      },
    });
  };

  const inputBaseClass =
    'mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#152852] placeholder:text-slate-400 focus:outline-none focus:ring-2 transition';

  const getFieldBorder = (hasError?: string) =>
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-200 focus:border-[#D4A537] focus:ring-[#D4A537]/25';

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#152852] p-8 text-white shadow-md md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D4A537]/10 blur-2xl" />
        <div className="relative z-10">
          <span className="inline-block rounded-full border border-[#D4A537]/50 bg-white/10 px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#D4A537] uppercase">
            DORMITORY APPLICATION
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your next chapter starts here
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm text-slate-200 sm:text-base">
            Apply for a place at MSUN Girls Dormitory. Complete your details below to get
            started.
          </p>
          <p className="mt-3 text-xs font-medium text-[#D4A537]">Fields marked * are required.</p>
        </div>
      </section>

      {/* Two-Column Layout */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12"
      >
        {/* Left ~68% Form */}
        <div className="space-y-6 lg:col-span-8">
          {submitError && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-2xs">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Submission blocked</p>
                <p className="mt-0.5 text-xs">{submitError}</p>
              </div>
            </div>
          )}

          {/* 01 Student details */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-extrabold tracking-widest text-[#D4A537] uppercase">
                01 Student details
              </p>
              <p className="mt-1 text-sm text-slate-600">Tell us a little about yourself.</p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="full-name" className="block text-xs font-semibold text-[#152852]">
                  Full name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder="e.g., Juana M. Dela Cruz"
                  className={`${inputBaseClass} ${getFieldBorder(errors.fullName)}`}
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="student-number"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Student ID <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student-number"
                  type="text"
                  value={studentNumber}
                  onChange={(e) => {
                    setStudentNumber(e.target.value);
                    if (errors.studentNumber) {
                      setErrors((p) => ({ ...p, studentNumber: undefined }));
                    }
                  }}
                  placeholder="e.g., 2026-0412"
                  className={`${inputBaseClass} ${getFieldBorder(errors.studentNumber)}`}
                />
                {errors.studentNumber && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.studentNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="email-address" className="block text-xs font-semibold text-[#152852]">
                  Email address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email-address"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="e.g., juana.delacruz@msunaawan.edu.ph"
                  className={`${inputBaseClass} ${getFieldBorder(errors.email)}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="mobile-number" className="block text-xs font-semibold text-[#152852]">
                  Mobile number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="mobile-number"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => {
                    setContactNumber(e.target.value);
                    if (errors.contactNumber) {
                      setErrors((p) => ({ ...p, contactNumber: undefined }));
                    }
                  }}
                  placeholder="e.g., 0917-555-0142"
                  className={`${inputBaseClass} ${getFieldBorder(errors.contactNumber)}`}
                />
                {errors.contactNumber && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.contactNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="course-program" className="block text-xs font-semibold text-[#152852]">
                  Course / program <span className="text-rose-500">*</span>
                </label>
                <select
                  id="course-program"
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    if (errors.course) setErrors((p) => ({ ...p, course: undefined }));
                  }}
                  className={`${inputBaseClass} ${getFieldBorder(errors.course)}`}
                >
                  <option value="">Select course / program</option>
                  {MSU_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.course && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.course}</p>
                )}
              </div>

              <div>
                <label htmlFor="year-level" className="block text-xs font-semibold text-[#152852]">
                  Year level <span className="text-rose-500">*</span>
                </label>
                <select
                  id="year-level"
                  value={yearLevel}
                  onChange={(e) => {
                    setYearLevel(e.target.value);
                    if (errors.yearLevel) setErrors((p) => ({ ...p, yearLevel: undefined }));
                  }}
                  className={`${inputBaseClass} ${getFieldBorder(errors.yearLevel)}`}
                >
                  <option value="">Select year level</option>
                  {YEAR_LEVELS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {errors.yearLevel && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.yearLevel}</p>
                )}
              </div>

              {/* Are you a scholar? */}
              <div className="sm:col-span-2 pt-1">
                <span className="block text-xs font-semibold text-[#152852]">
                  Are you a scholar?
                </span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      isScholar
                        ? 'border-[#D4A537] bg-[#FFF8EB] text-[#152852] ring-1 ring-[#D4A537]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="is_scholar"
                      checked={isScholar === true}
                      onChange={() => setIsScholar(true)}
                      className="h-4 w-4 accent-[#152852]"
                    />
                    <span>Yes</span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      !isScholar
                        ? 'border-[#D4A537] bg-[#FFF8EB] text-[#152852] ring-1 ring-[#D4A537]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="is_scholar"
                      checked={isScholar === false}
                      onChange={() => {
                        setIsScholar(false);
                        setScholarshipFile(null);
                        setErrors((p) => ({ ...p, scholarshipFile: undefined }));
                      }}
                      className="h-4 w-4 accent-[#152852]"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* 02 Emergency contact */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-extrabold tracking-widest text-[#D4A537] uppercase">
                02 Emergency contact
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Who should we contact in an emergency?
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="emergency-person"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Contact person <span className="text-rose-500">*</span>
                </label>
                <input
                  id="emergency-person"
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => {
                    setEmergencyContactName(e.target.value);
                    if (errors.emergencyContactName) {
                      setErrors((p) => ({ ...p, emergencyContactName: undefined }));
                    }
                  }}
                  placeholder="e.g., Maria Dela Cruz"
                  className={`${inputBaseClass} ${getFieldBorder(errors.emergencyContactName)}`}
                />
                {errors.emergencyContactName && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {errors.emergencyContactName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="emergency-relationship"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Relationship <span className="text-rose-500">*</span>
                </label>
                <input
                  id="emergency-relationship"
                  type="text"
                  value={emergencyContactRelationship}
                  onChange={(e) => {
                    setEmergencyContactRelationship(e.target.value);
                    if (errors.emergencyContactRelationship) {
                      setErrors((p) => ({ ...p, emergencyContactRelationship: undefined }));
                    }
                  }}
                  placeholder="e.g., Mother / Guardian"
                  className={`${inputBaseClass} ${getFieldBorder(
                    errors.emergencyContactRelationship
                  )}`}
                />
                {errors.emergencyContactRelationship && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {errors.emergencyContactRelationship}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="emergency-mobile"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Mobile number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="emergency-mobile"
                  type="tel"
                  value={emergencyContactNumber}
                  onChange={(e) => {
                    setEmergencyContactNumber(e.target.value);
                    if (errors.emergencyContactNumber) {
                      setErrors((p) => ({ ...p, emergencyContactNumber: undefined }));
                    }
                  }}
                  placeholder="e.g., 0918-555-0190"
                  className={`${inputBaseClass} ${getFieldBorder(errors.emergencyContactNumber)}`}
                />
                {errors.emergencyContactNumber && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {errors.emergencyContactNumber}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="home-address" className="block text-xs font-semibold text-[#152852]">
                  Home address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="home-address"
                  type="text"
                  value={homeAddress}
                  onChange={(e) => {
                    setHomeAddress(e.target.value);
                    if (errors.homeAddress) {
                      setErrors((p) => ({ ...p, homeAddress: undefined }));
                    }
                  }}
                  placeholder="City / Municipality, Province"
                  className={`${inputBaseClass} ${getFieldBorder(errors.homeAddress)}`}
                />
                {errors.homeAddress && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{errors.homeAddress}</p>
                )}
              </div>
            </div>
          </section>

          {/* 03 Attach a Document (COR) */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-extrabold tracking-widest text-[#D4A537] uppercase">
                03 Attach a Document <span className="text-rose-500">*</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Please upload a clear copy of your Certificate of Registration (COR)
              </p>
            </div>

            <div className="mt-5">
              <input
                ref={corInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files?.[0], 'cor');
                  e.target.value = '';
                }}
              />

              {!corFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCorDragActive(true);
                  }}
                  onDragLeave={() => setCorDragActive(false)}
                  onDrop={(e) => handleDrop(e, 'cor')}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${
                    corDragActive
                      ? 'border-[#D4A537] bg-[#FFF8EB]'
                      : errors.corFile
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-300 bg-[#FFF8EB]/50'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#152852]/10 text-[#152852]">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#152852]">
                    Drag and drop your COR file here
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Accepted formats: PDF, JPG, JPEG, PNG</p>
                  <button
                    type="button"
                    onClick={() => corInputRef.current?.click()}
                    className="mt-4 rounded-lg bg-[#D4A537] px-5 py-2 text-xs font-bold text-[#152852] shadow-2xs transition hover:bg-[#c2942c] cursor-pointer"
                  >
                    Choose File
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#152852]">{corFile.name}</p>
                      <p className="text-xs text-emerald-700">Certificate of Registration attached</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCorFile(null)}
                    aria-label="Remove Certificate of Registration file"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              )}

              {errors.corFile && (
                <p className="mt-2 text-xs font-medium text-rose-600">{errors.corFile}</p>
              )}
            </div>
          </section>

          {/* 04 Proof of Scholarship (Conditional) */}
          {isScholar && (
            <section className="rounded-2xl border border-[#D4A537]/40 bg-white p-6 shadow-sm sm:p-7">
              <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-extrabold tracking-widest text-[#D4A537] uppercase">
                  04 Proof of Scholarship <span className="text-rose-500">*</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a document confirming your current scholarship status.
                </p>
              </div>

              <div className="mt-5">
                <input
                  ref={scholInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    handleFileSelect(e.target.files?.[0], 'scholarship');
                    e.target.value = '';
                  }}
                />

                {!scholarshipFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setScholDragActive(true);
                    }}
                    onDragLeave={() => setScholDragActive(false)}
                    onDrop={(e) => handleDrop(e, 'scholarship')}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${
                      scholDragActive
                        ? 'border-[#D4A537] bg-[#FFF8EB]'
                        : errors.scholarshipFile
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-300 bg-[#FFF8EB]/50'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#152852]/10 text-[#152852]">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#152852]">
                      Drag and drop your scholarship certificate here
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Accepted formats: PDF, JPG, JPEG, PNG
                    </p>
                    <button
                      type="button"
                      onClick={() => scholInputRef.current?.click()}
                      className="mt-4 rounded-lg bg-[#D4A537] px-5 py-2 text-xs font-bold text-[#152852] shadow-2xs transition hover:bg-[#c2942c] cursor-pointer"
                    >
                      Choose File
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#152852]">
                          {scholarshipFile.name}
                        </p>
                        <p className="text-xs text-emerald-700">Proof of Scholarship attached</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScholarshipFile(null)}
                      aria-label="Remove Proof of Scholarship file"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

                {errors.scholarshipFile && (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    {errors.scholarshipFile}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Consent & Submit Card */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => {
                  setConsentConfirmed(e.target.checked);
                  if (e.target.checked && errors.consentConfirmed) {
                    setErrors((p) => ({ ...p, consentConfirmed: undefined }));
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#152852]"
              />
              <span className="text-sm leading-snug text-slate-700">
                I confirm that the information provided is accurate and consent to its use for my
                dormitory application.
              </span>
            </label>
            {errors.consentConfirmed && (
              <p className="mt-2 text-xs font-medium text-rose-600">{errors.consentConfirmed}</p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A537] px-6 py-3 text-sm font-bold text-[#152852] shadow-sm transition hover:bg-[#c2942c] sm:w-auto cursor-pointer"
              >
                <span>Submit application</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>

        {/* Right ~32% Sticky Guide */}
        <aside className="lg:col-span-4 lg:sticky lg:top-28">
          <div className="space-y-6 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div>
              <p className="text-[11px] font-extrabold tracking-widest text-[#D4A537] uppercase">
                Before you apply
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#152852]">Have these details ready</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A537]" />
                  <span>Student ID and course</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A537]" />
                  <span>Active email and mobile number</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A537]" />
                  <span>Emergency contact&apos;s details</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-[#152852]">What happens next?</h3>
              <ol className="mt-4 space-y-3.5">
                <li className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#152852] text-xs font-bold text-white">
                    1
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    Complete your application
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#152852] text-xs font-bold text-white">
                    2
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    Dormitory office review
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#152852] text-xs font-bold text-white">
                    3
                  </span>
                  <span className="text-sm font-medium text-slate-700">Room assignment</span>
                </li>
              </ol>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-[#D4A537]/40 bg-[#FFF8EB] p-4 text-xs text-[#152852]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A537]" />
              <span className="font-semibold">Application does not guarantee a room.</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
