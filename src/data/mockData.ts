import type {
  User,
  Personnel,
  Dormer,
  AttendanceCredential,
  Applicant,
  Building,
  Room,
  Bed,
  RoomAssignment,
  AttendanceRecord,
  PassSlip,
  RenewalRequest,
  MonitoringRecord,
  Notification,
} from "../types/oap";

// ─── Users ───
export const users: User[] = [
  {
    id: "u1",
    username: "admin",
    email: "admin@oap.edu",
    role: "admin",
    firstName: "Maria",
    lastName: "Santos",
    isActive: true,
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "u2",
    username: "staff1",
    email: "jcruz@oap.edu",
    role: "staff",
    firstName: "Juan",
    lastName: "Cruz",
    isActive: true,
    createdAt: "2026-02-01T08:00:00Z",
  },
  {
    id: "u3",
    username: "dormer1",
    email: "aramos@oap.edu",
    role: "dormer",
    firstName: "Ana",
    lastName: "Ramos",
    isActive: true,
    createdAt: "2026-06-01T08:00:00Z",
  },
];

// ─── Personnel ───
export const personnel: Personnel[] = [
  {
    id: "p1",
    userId: "u2",
    employeeId: "EMP-2024-001",
    department: "Student Affairs",
    position: "Dormitory Manager",
    contactNumber: "09171234567",
    hireDate: "2024-03-01",
  },
];

// ─── Dormers ───
export const dormers: Dormer[] = [
  {
    id: "d1",
    userId: "u3",
    studentId: "STU-2026-0001",
    course: "BS Computer Science",
    yearLevel: 2,
    contactNumber: "09181234567",
    emergencyContact: "Rosa Ramos",
    emergencyContactNumber: "09191234567",
    status: "active",
  },
];

// ─── Attendance Credentials ───
export const attendanceCredentials: AttendanceCredential[] = [
  {
    id: "ac1",
    dormerId: "d1",
    cardNumber: "CARD-00001",
    issuedAt: "2026-06-01T08:00:00Z",
    expiresAt: "2027-06-01T08:00:00Z",
    isActive: true,
  },
];

// ─── Applicants ───
export const applicants: Applicant[] = [
  {
    id: "a1",
    firstName: "Carlos",
    lastName: "Garcia",
    email: "cgarcia@oap.edu",
    studentId: "STU-2026-0042",
    course: "BS Information Technology",
    yearLevel: 1,
    applicationDate: "2026-05-10",
    status: "pending",
  },
];

// ─── Buildings ───
export const buildings: Building[] = [
  {
    id: "b1",
    name: "Rizal Hall",
    code: "RH",
    address: "OAP Campus, Building A",
    totalFloors: 4,
    totalRooms: 40,
    status: "operational",
  },
];

// ─── Rooms ───
export const rooms: Room[] = [
  {
    id: "r1",
    buildingId: "b1",
    roomNumber: "101",
    floor: 1,
    capacity: 4,
    occupancy: 1,
    type: "quad",
    status: "available",
  },
];

// ─── Beds ───
export const beds: Bed[] = [
  {
    id: "bed1",
    roomId: "r1",
    bedNumber: "A",
    status: "occupied",
    dormerId: "d1",
  },
  {
    id: "bed2",
    roomId: "r1",
    bedNumber: "B",
    status: "available",
  },
];

// ─── Room Assignments ───
export const roomAssignments: RoomAssignment[] = [
  {
    id: "ra1",
    dormerId: "d1",
    roomId: "r1",
    bedId: "bed1",
    assignedAt: "2026-06-01T08:00:00Z",
    expiresAt: "2027-05-31T08:00:00Z",
    status: "active",
  },
];

// ─── Attendance Records ───
export const attendanceRecords: AttendanceRecord[] = [
  {
    id: "ar1",
    dormerId: "d1",
    credentialId: "ac1",
    type: "check_in",
    timestamp: "2026-11-23T07:30:00Z",
    location: "Main Gate",
  },
];

// ─── Pass Slips ───
export const passSlips: PassSlip[] = [
  {
    id: "ps1",
    dormerId: "d1",
    reason: "Family event",
    destination: "Quezon City",
    departureDate: "2026-11-25",
    returnDate: "2026-11-27",
    status: "pending",
  },
];

// ─── Renewal Requests ───
export const renewalRequests: RenewalRequest[] = [
  {
    id: "rr1",
    dormerId: "d1",
    currentAssignmentId: "ra1",
    requestDate: "2026-11-01",
    desiredStartDate: "2027-06-01",
    desiredEndDate: "2028-05-31",
    status: "pending",
  },
];

// ─── Monitoring Records ───
export const monitoringRecords: MonitoringRecord[] = [
  {
    id: "mr1",
    dormerId: "d1",
    recordedBy: "p1",
    type: "observation",
    description: "Room kept in good condition during inspection.",
    date: "2026-11-20",
    severity: "low",
    resolved: true,
  },
];

// ─── Notifications ───
export const notifications: Notification[] = [
  {
    id: "n1",
    userId: "u3",
    title: "Welcome!",
    message: "Your dormitory account has been created.",
    type: "info",
    isRead: false,
    createdAt: "2026-06-01T08:00:00Z",
  },
];
