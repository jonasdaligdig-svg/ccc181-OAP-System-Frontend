// ─── OAP Dormitory Management System – Entity Interfaces ───

export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "staff" | "dormer";
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Personnel {
  id: string;
  userId: string;
  employeeId: string;
  department: string;
  position: string;
  contactNumber: string;
  hireDate: string;
}

export interface Dormer {
  id: string;
  userId: string;
  studentId: string;
  course: string;
  yearLevel: number;
  contactNumber: string;
  emergencyContact: string;
  emergencyContactNumber: string;
  status: "active" | "inactive" | "suspended";
}

export interface AttendanceCredential {
  id: string;
  dormerId: string;
  cardNumber: string;
  issuedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  course: string;
  yearLevel: number;
  applicationDate: string;
  status: "pending" | "approved" | "rejected" | "waitlisted";
  remarks?: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  address: string;
  totalFloors: number;
  totalRooms: number;
  status: "operational" | "under_maintenance" | "closed";
}

export interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  occupancy: number;
  type: "single" | "double" | "quad" | "suite";
  status: "available" | "full" | "maintenance";
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: string;
  status: "available" | "occupied" | "maintenance";
  dormerId?: string;
}

export interface RoomAssignment {
  id: string;
  dormerId: string;
  roomId: string;
  bedId: string;
  assignedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "cancelled";
}

export interface AttendanceRecord {
  id: string;
  dormerId: string;
  credentialId: string;
  type: "check_in" | "check_out";
  timestamp: string;
  location: string;
}

export interface PassSlip {
  id: string;
  dormerId: string;
  reason: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  status: "pending" | "approved" | "rejected" | "expired";
  approvedBy?: string;
}

export interface RenewalRequest {
  id: string;
  dormerId: string;
  currentAssignmentId: string;
  requestDate: string;
  desiredStartDate: string;
  desiredEndDate: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  remarks?: string;
}

export interface MonitoringRecord {
  id: string;
  dormerId: string;
  recordedBy: string;
  type: "violation" | "incident" | "observation";
  description: string;
  date: string;
  severity: "low" | "medium" | "high";
  resolved: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  isRead: boolean;
  createdAt: string;
}

// ─── Aggregate types ───

export interface MockData {
  users: User[];
  personnel: Personnel[];
  dormers: Dormer[];
  attendanceCredentials: AttendanceCredential[];
  applicants: Applicant[];
  buildings: Building[];
  rooms: Room[];
  beds: Bed[];
  roomAssignments: RoomAssignment[];
  attendanceRecords: AttendanceRecord[];
  passSlips: PassSlip[];
  renewalRequests: RenewalRequest[];
  monitoringRecords: MonitoringRecord[];
  notifications: Notification[];
}
