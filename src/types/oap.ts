// ─── OAP Dormitory Management System – Entity Interfaces ───
// Aligned with mockData.js snake_case schema (OAP SRS Ch.5 & Ch.8)

export type UserAccountStatus = "active" | "pending_activation" | "inactive";

export interface User {
  user_id: number;
  username: string;
  password_hash: string;
  role: "management" | "dormer";
  account_status: UserAccountStatus;
  status?: UserAccountStatus;
  student_number?: string;
}

export type UserAccount = User;

export interface Personnel {
  personnel_id: number;
  user_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  position: string;
}

export interface Building {
  building_id: number;
  building_name: string;
}

export interface Room {
  room_id: number;
  building_id: number;
  room_number: string;
  floor: string;
  capacity: number;
  status: "available" | "full" | "maintenance";
  room_status?: "available" | "unavailable";
  last_reviewed?: string;
}

export interface Bed {
  bed_id: number;
  room_id: number;
  bed_number: string;
  bed_status: "available" | "occupied";
}

export interface AddRoomPayload {
  building_id: number;
  room_number: string;
  floor: string;
  capacity: number;
  status?: "available" | "maintenance";
}

export interface UpdateRoomPayload {
  building_id?: number;
  room_number?: string;
  floor?: string;
  capacity?: number;
  status?: "available" | "full" | "maintenance";
}

export interface Dormer {
  dormer_id: number;
  user_id: number | null;
  student_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  course: string;
  year_level: string;
  contact_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  status?: 'Active Resident' | 'On Leave' | 'Pending Assignment' | string;
}

export interface AttendanceCredential {
  credential_id: number;
  dormer_id: number;
  fingerprint_user_id: string;
  pin_hash: string;
  credential_status: "active" | "inactive";
}

export interface ApplicantDocument {
  id: string;
  title: string;
  file_type: string;
  submitted_at: string;
  file_name: string;
}

export interface ApplicantChecklist {
  enrollment_confirmed: boolean;
  valid_student_id: boolean;
  completed_application: boolean;
}

export interface Applicant {
  applicant_id: number;
  dormer_id: number;
  application_code?: string;
  submitted_at?: string;
  status?: "pending" | "approved" | "waitlisted" | "rejected";
  is_scholar?: boolean;
  home_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;
  decision_notes?: string;
  reviewed_at?: string | null;
  checklist?: ApplicantChecklist;
  documents?: ApplicantDocument[];

  // Legacy / DB Schema fields
  evaluated_by?: number | null;
  application_date?: string;
  scholarship_status?: boolean;
  address?: string;
  consent_confirmed?: boolean;
  evaluation_notes?: string;
  application_status?: "pending" | "approved" | "rejected" | "waitlisted";
}

export interface RoomAssignment {
  assignment_id: number;
  dormer_id: number;
  bed_id: number;
  start_date: string;
  end_date: string | null;
  assignment_status: "active" | "transferred" | "ended";
}

export interface AttendanceRecord {
  attendance_id: number;
  dormer_id: number;
  attendance_date: string;
  time_recorded: string;
  recording_method: "fingerprint" | "numeric_id_pin" | "manual";
  attendance_status: "present" | "absent" | "excused";
}

export interface PassSlip {
  pass_slip_id: number;
  dormer_id: number;
  reviewed_by: number | null;
  departure_datetime: string;
  expected_return_datetime: string;
  actual_return_datetime: string | null;
  destination: string;
  purpose: string;
  remarks: string;
  request_status: "pending" | "approved" | "rejected" | "overdue" | "returned";
}

export interface RenewalRequest {
  renewal_id: number;
  dormer_id: number;
  reviewed_by: number | null;
  submission_date: string;
  renewal_period: string;
  consent_confirmed: boolean;
  assessment_notes: string;
  review_date: string | null;
  renewal_status: "pending" | "approved" | "rejected";
}

export interface MonitoringRecord {
  monitoring_id: number;
  dormer_id: number;
  recorded_by: number;
  record_date: string;
  monitoring_type: string;
  description: string;
}

export interface Notification {
  notification_id: number;
  user_id: number;
  notification_type: string;
  message: string;
  date_created: string;
  read_status: boolean;
}

export interface OccupancyTrend {
  semester: string;
  occupancyRate: number;
}

// ─── Application State ───

export interface OapState {
  users: User[];
  personnel: Personnel[];
  buildings: Building[];
  rooms: Room[];
  beds: Bed[];
  dormers: Dormer[];
  credentials: AttendanceCredential[];
  applicants: Applicant[];
  roomAssignments: RoomAssignment[];
  attendanceRecords: AttendanceRecord[];
  passSlips: PassSlip[];
  renewalRequests: RenewalRequest[];
  monitoringRecords: MonitoringRecord[];
  notifications: Notification[];
  currentUser: User | null;
}

// ─── Computed types ───

export interface AbsenceAlert {
  dormer: Dormer;
  consecutiveAbsences: number;
}

export interface BuildingOccupancy extends Building {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}

export interface OccupancyStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  overallRate: number;
  byBuilding: BuildingOccupancy[];
}

// ─── Result types ───

export interface LoginResult {
  success: boolean;
  error?: string;
  requiresActivation?: boolean;
  user?: UserAccount;
}

export interface ActivateDormerResult {
  success: boolean;
  error?: string;
  user?: UserAccount;
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  user?: T;
  applicant?: T;
  room?: T;
  data?: T;
}

// ─── Full context value ───

export interface SubmitApplicationData {
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  course: string;
  year_level: string;
  contact_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  scholarship_status: boolean;
  consent_confirmed: boolean;
}

export interface PublicUploadFileInfo {
  name: string;
  type: string;
}

export interface SubmitPublicApplicationPayload {
  fullName: string;
  studentNumber: string;
  email: string;
  contactNumber: string;
  course: string;
  yearLevel: string;
  isScholar: boolean;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
  homeAddress: string;
  corFile: PublicUploadFileInfo;
  scholarshipFile?: PublicUploadFileInfo | null;
  consentConfirmed: boolean;
}

export interface SubmitPublicApplicationResult {
  success: boolean;
  error?: string;
  applicationCode?: string;
}

export interface SubmitPassSlipPayload {
  departure_datetime: string;
  expected_return_datetime: string;
  destination: string;
  purpose: string;
}

export interface RecordAttendancePayload {
  dormer_id: number;
  date?: string;
  attendance_date?: string;
  time_recorded?: string;
  status?: "present" | "absent" | "excused";
  attendance_status?: "present" | "absent" | "excused";
  method?: "biometric" | "pin" | "manual" | null;
  recording_method?: "fingerprint" | "numeric_id_pin" | "manual";
  remarks?: string;
}

export interface AddDormerData {
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  course: string;
  year_level: string;
  contact_number: string;
  address?: string;
  emergency_contact_name: string;
  emergency_contact_relationship?: string;
  emergency_contact_number: string;
  status?: 'Active Resident' | 'On Leave' | 'Pending Assignment' | string;
}

export interface OapContextValue extends OapState {
  absenceAlerts: AbsenceAlert[];
  occupancyStats: OccupancyStats;
  login: (identifier: string, password: string, portal: 'dormer' | 'personnel') => LoginResult;
  activateDormerAccount: (
    identifier: string,
    tempPassword: string,
    newPassword: string
  ) => ActivateDormerResult;
  logout: () => void;
  addDormer: (dormerData: AddDormerData) => ActionResult<Dormer>;
  updateDormer: (dormerId: number, updates: Partial<Dormer>) => ActionResult<Dormer>;
  submitApplication: (formData: SubmitApplicationData) => ActionResult<Applicant>;
  submitPublicApplication: (payload: SubmitPublicApplicationPayload) => SubmitPublicApplicationResult;
  evaluateApplicant: (applicantId: number, status: string, evaluationNotes: string) => void;
  reviewApplicant: (
    applicantId: number,
    decision: 'approved' | 'waitlisted' | 'rejected',
    notes?: string,
    notifyApplicant?: boolean,
    checklist?: ApplicantChecklist
  ) => ActionResult<Applicant>;
  addRoom: (payload: AddRoomPayload) => ActionResult<Room>;
  updateRoom: (roomId: number, payload: UpdateRoomPayload) => ActionResult<Room>;
  assignResidentToBed: (
    bedId: number,
    dormerId: number,
    effectiveDate?: string,
    notes?: string
  ) => ActionResult;
  unassignBed: (bedId: number) => ActionResult;
  assignStudentToBed: (dormerId: number, bedId: number) => ActionResult;
  recordAttendance: (payload: RecordAttendancePayload) => ActionResult;
  submitPassSlip: (dormerId: number, payload: SubmitPassSlipPayload) => ActionResult;
  reviewPassSlip: (passSlipId: number, status: string, remarks?: string, actualReturn?: string | null) => void;
  submitRenewal: (dormerId: number, renewalPeriod: string, profileUpdates: Partial<Dormer>) => ActionResult;
  reviewRenewal: (renewalId: number, status: string, assessmentNotes: string) => void;
  markNotificationRead: (notificationId: number) => void;
  resetDemoData: () => void;
}
