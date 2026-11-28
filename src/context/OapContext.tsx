import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  OapState,
  AbsenceAlert,
  OccupancyStats,
  User,
  Applicant,
  Dormer,
  Room,
  Bed,
  AddRoomPayload,
  UpdateRoomPayload,
  ActionResult,
  LoginResult,
  ActivateDormerResult,
  SubmitApplicationData,
  SubmitPublicApplicationPayload,
  SubmitPublicApplicationResult,
  SubmitPassSlipPayload,
  RecordAttendancePayload,
  AttendanceRecord,
  AddDormerData,
  ApplicantChecklist,
  ApplicantDocument,
  Notification,
} from '../types/oap';
import {
  INITIAL_APPLICANTS,
  INITIAL_ATTENDANCE_CREDENTIALS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_BEDS,
  INITIAL_BUILDINGS,
  INITIAL_DORMERS,
  INITIAL_MONITORING_RECORDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PASS_SLIPS,
  INITIAL_PERSONNEL,
  INITIAL_RENEWAL_REQUESTS,
  INITIAL_ROOM_ASSIGNMENTS,
  INITIAL_ROOMS,
  INITIAL_USERS,
} from '../data/mockData';
import { OapContext } from './oapContextDef';

const STORAGE_KEY = 'msun_oap_state_v8';
const ABSENCE_ALERT_THRESHOLD = 3; // Configured consecutive-night absence threshold (FR-18)

function loadInitialState(): OapState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as OapState;
  } catch {
    // Fallback to initial mock data if localStorage is unavailable
  }
  return {
    users: INITIAL_USERS,
    personnel: INITIAL_PERSONNEL,
    buildings: INITIAL_BUILDINGS,
    rooms: INITIAL_ROOMS,
    beds: INITIAL_BEDS,
    dormers: INITIAL_DORMERS,
    credentials: INITIAL_ATTENDANCE_CREDENTIALS,
    applicants: INITIAL_APPLICANTS,
    roomAssignments: INITIAL_ROOM_ASSIGNMENTS,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    passSlips: INITIAL_PASS_SLIPS,
    renewalRequests: INITIAL_RENEWAL_REQUESTS,
    monitoringRecords: INITIAL_MONITORING_RECORDS,
    notifications: INITIAL_NOTIFICATIONS,
    currentUser: null,
  };
}

export function OapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OapState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // --- FR-01: User Authentication & First-Time Activation ---
  const findUserByEmail = (email: string): User | undefined => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return undefined;
    return state.users.find((u) => u.username.toLowerCase() === cleanEmail);
  };

  const login = (
    email: string,
    password: string,
    portal: 'dormer' | 'personnel'
  ): LoginResult => {
    const user = findUserByEmail(email);
    if (
      !user ||
      user.password_hash !== password ||
      (portal === 'dormer' && user.role !== 'dormer') ||
      (portal === 'personnel' && user.role !== 'management')
    ) {
      return {
        success: false,
        error: 'Invalid email or password.',
      };
    }

    const effectiveStatus = user.status || user.account_status;
    if (effectiveStatus === 'inactive') {
      return {
        success: false,
        error: 'This account is inactive. Please contact Dormitory Management.',
      };
    }

    if (effectiveStatus === 'pending_activation') {
      return {
        success: false,
        requiresActivation: true,
        error: 'Your account requires first-time activation. Please set your personal password.',
      };
    }

    setState((prev) => ({ ...prev, currentUser: user }));
    return { success: true, user };
  };

  const activateDormerAccount = (
    email: string,
    tempPassword: string,
    newPassword: string
  ): ActivateDormerResult => {
    const user = findUserByEmail(email);
    if (!user || user.role !== 'dormer') {
      return {
        success: false,
        error: 'No dormer account found matching that student email.',
      };
    }

    const effectiveStatus = user.status || user.account_status;
    if (effectiveStatus === 'inactive') {
      return {
        success: false,
        error: 'This account is inactive. Please contact Dormitory Management.',
      };
    }
    if (effectiveStatus !== 'pending_activation') {
      return {
        success: false,
        error: 'This account is already active. Please log in with your password.',
      };
    }

    if (user.password_hash !== tempPassword) {
      return {
        success: false,
        error: 'Incorrect temporary password. Please check the temporary password issued by the Dormitory Office.',
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'New password must be at least 8 characters long.',
      };
    }

    const activatedUser: User = {
      ...user,
      password_hash: newPassword,
      account_status: 'active',
      status: 'active',
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.user_id === user.user_id ? activatedUser : u)),
      currentUser: activatedUser,
    }));

    return { success: true, user: activatedUser };
  };

  const logout = () => setState((prev) => ({ ...prev, currentUser: null }));

  // --- FR-05: Public Application Submission (reuses student profile by student_number) ---
  const submitApplication = (formData: SubmitApplicationData): ActionResult<Applicant> => {
    const cleanNum = formData.student_number.trim();
    const existingDormer = state.dormers.find((d) => d.student_number === cleanNum);
    let targetDormerId: number;
    let nextDormers = state.dormers;

    if (existingDormer) {
      targetDormerId = existingDormer.dormer_id;
    } else {
      targetDormerId = Math.max(0, ...state.dormers.map((d) => d.dormer_id)) + 1;
      nextDormers = [
        ...state.dormers,
        {
          dormer_id: targetDormerId,
          user_id: null,
          student_number: cleanNum,
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name?.trim() || '',
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          course: formData.course.trim(),
          year_level: formData.year_level,
          contact_number: formData.contact_number.trim(),
          address: formData.address.trim(),
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_relationship: formData.emergency_contact_relationship.trim(),
          emergency_contact_number: formData.emergency_contact_number.trim(),
        },
      ];
    }

    const newApplicantId = Math.max(260, ...state.applicants.map((a) => a.applicant_id)) + 1;
    const nowIso = new Date().toISOString();
    const newApplicant: Applicant = {
      applicant_id: newApplicantId,
      dormer_id: targetDormerId,
      application_code: `APP-${String(newApplicantId).padStart(4, '0')}`,
      submitted_at: nowIso,
      application_date: nowIso.slice(0, 10),
      status: 'pending',
      application_status: 'pending',
      is_scholar: Boolean(formData.scholarship_status),
      scholarship_status: Boolean(formData.scholarship_status),
      home_address: formData.address.trim(),
      address: formData.address.trim(),
      emergency_contact_name: formData.emergency_contact_name?.trim() || '',
      emergency_contact_relationship: formData.emergency_contact_relationship?.trim() || '',
      emergency_contact_number: formData.emergency_contact_number?.trim() || '',
      consent_confirmed: Boolean(formData.consent_confirmed),
      decision_notes: '',
      evaluation_notes: '',
      evaluated_by: null,
      reviewed_at: null,
      checklist: {
        enrollment_confirmed: true,
        valid_student_id: true,
        completed_application: true,
      },
      documents: [
        {
          id: `doc-${newApplicantId}-1`,
          title: 'Enrollment Confirmation',
          file_type: 'PDF',
          submitted_at: nowIso.slice(0, 16).replace('T', ' '),
          file_name: `enrollment_${cleanNum}.pdf`,
        },
      ],
    };

    setState((prev) => ({
      ...prev,
      dormers: nextDormers,
      applicants: [newApplicant, ...prev.applicants],
    }));

    return { ok: true, applicant: newApplicant };
  };

  const submitPublicApplication = (
    payload: SubmitPublicApplicationPayload
  ): SubmitPublicApplicationResult => {
    const cleanNum = payload.studentNumber.trim();
    const cleanFullName = payload.fullName.trim();
    if (!cleanNum || !cleanFullName) {
      return { success: false, error: 'Full name and Student ID are required.' };
    }

    const matchingDormer = state.dormers.find(
      (d) => d.student_number.trim().toLowerCase() === cleanNum.toLowerCase()
    );
    if (matchingDormer) {
      const hasPending = state.applicants.some(
        (a) =>
          a.dormer_id === matchingDormer.dormer_id &&
          (a.status || a.application_status || 'pending').toLowerCase() === 'pending'
      );
      if (hasPending) {
        return {
          success: false,
          error: `A pending application already exists for Student ID ${cleanNum}. Please wait for the dormitory office review.`,
        };
      }
    }

    const nameParts = cleanFullName.split(/\s+/).filter(Boolean);
    let firstName = nameParts[0] || cleanFullName;
    let middleName = '';
    let lastName = '';
    if (nameParts.length === 2) {
      lastName = nameParts[1];
    } else if (nameParts.length >= 3) {
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];
      middleName = nameParts.slice(1, -1).join(' ');
    }

    let targetDormerId: number;
    let nextDormers: Dormer[];
    if (matchingDormer) {
      targetDormerId = matchingDormer.dormer_id;
      nextDormers = state.dormers.map((d) =>
        d.dormer_id === targetDormerId
          ? {
              ...d,
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              email: payload.email.trim(),
              course: payload.course.trim(),
              year_level: payload.yearLevel,
              contact_number: payload.contactNumber.trim(),
              address: payload.homeAddress.trim(),
              emergency_contact_name: payload.emergencyContactName.trim(),
              emergency_contact_relationship: payload.emergencyContactRelationship.trim(),
              emergency_contact_number: payload.emergencyContactNumber.trim(),
            }
          : d
      );
    } else {
      targetDormerId = Math.max(0, ...state.dormers.map((d) => d.dormer_id)) + 1;
      const newDormer: Dormer = {
        dormer_id: targetDormerId,
        user_id: null,
        student_number: cleanNum,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email: payload.email.trim(),
        course: payload.course.trim(),
        year_level: payload.yearLevel,
        contact_number: payload.contactNumber.trim(),
        address: payload.homeAddress.trim(),
        emergency_contact_name: payload.emergencyContactName.trim(),
        emergency_contact_relationship: payload.emergencyContactRelationship.trim(),
        emergency_contact_number: payload.emergencyContactNumber.trim(),
        status: 'Pending Assignment',
      };
      nextDormers = [...state.dormers, newDormer];
    }

    const newApplicantId = Math.max(260, ...state.applicants.map((a) => a.applicant_id)) + 1;
    const applicationCode = `APP-${String(newApplicantId).padStart(4, '0')}`;
    const now = new Date();
    const nowIso = now.toISOString();
    const submittedDisplay = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
      ' · ' +
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const getDocExtension = (fileName: string, mimeType: string) => {
      const dotIdx = fileName.lastIndexOf('.');
      if (dotIdx !== -1 && dotIdx < fileName.length - 1) {
        return fileName.slice(dotIdx + 1).toUpperCase();
      }
      if (mimeType.includes('pdf')) return 'PDF';
      if (mimeType.includes('png')) return 'PNG';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPG';
      return 'FILE';
    };

    const documents: ApplicantDocument[] = [
      {
        id: `doc-${newApplicantId}-cor`,
        title: 'Certificate of Registration (COR)',
        file_type: getDocExtension(payload.corFile.name, payload.corFile.type),
        submitted_at: submittedDisplay,
        file_name: payload.corFile.name,
      },
    ];

    if (payload.isScholar && payload.scholarshipFile) {
      documents.push({
        id: `doc-${newApplicantId}-scholarship`,
        title: 'Proof of Scholarship',
        file_type: getDocExtension(payload.scholarshipFile.name, payload.scholarshipFile.type),
        submitted_at: submittedDisplay,
        file_name: payload.scholarshipFile.name,
      });
    }

    const newApplicant: Applicant = {
      applicant_id: newApplicantId,
      dormer_id: targetDormerId,
      application_code: applicationCode,
      submitted_at: nowIso,
      application_date: nowIso.slice(0, 10),
      status: 'pending',
      application_status: 'pending',
      is_scholar: Boolean(payload.isScholar),
      scholarship_status: Boolean(payload.isScholar),
      home_address: payload.homeAddress.trim(),
      address: payload.homeAddress.trim(),
      emergency_contact_name: payload.emergencyContactName.trim(),
      emergency_contact_relationship: payload.emergencyContactRelationship.trim(),
      emergency_contact_number: payload.emergencyContactNumber.trim(),
      consent_confirmed: Boolean(payload.consentConfirmed),
      decision_notes: '',
      evaluation_notes: '',
      evaluated_by: null,
      reviewed_at: null,
      checklist: {
        enrollment_confirmed: true,
        valid_student_id: true,
        completed_application: true,
      },
      documents,
    };

    setState((prev) => ({
      ...prev,
      dormers: nextDormers,
      applicants: [newApplicant, ...prev.applicants],
    }));

    return { success: true, applicationCode };
  };

  // --- FR-07: Applicant Evaluation (human decision only) ---
  const evaluateApplicant = (applicantId: number, status: string, evaluationNotes: string) => {
    reviewApplicant(
      applicantId,
      status as 'approved' | 'waitlisted' | 'rejected',
      evaluationNotes,
      true
    );
  };

  const reviewApplicant = (
    applicantId: number,
    decision: 'approved' | 'waitlisted' | 'rejected',
    notes?: string,
    notifyApplicant = true,
    checklist?: ApplicantChecklist
  ): ActionResult<Applicant> => {
    const reviewerId =
      state.personnel.find((p) => p.user_id === state.currentUser?.user_id)?.personnel_id || 1;
    const applicant = state.applicants.find((a) => a.applicant_id === applicantId);
    if (!applicant) return { ok: false, error: 'Applicant not found.' };

    const dormer = state.dormers.find((d) => d.dormer_id === applicant.dormer_id);
    const nowIso = new Date().toISOString();

    const updatedApplicant: Applicant = {
      ...applicant,
      status: decision,
      application_status: decision,
      decision_notes: notes ?? applicant.decision_notes ?? '',
      evaluation_notes: notes ?? applicant.evaluation_notes ?? '',
      reviewed_at: nowIso,
      evaluated_by: reviewerId,
      checklist: checklist || applicant.checklist,
    };

    let nextDormers = state.dormers;
    if (decision === 'approved') {
      if (dormer) {
        const hasActiveAssignment = state.roomAssignments.some(
          (r) => r.dormer_id === dormer.dormer_id && r.assignment_status === 'active'
        );
        if (!hasActiveAssignment) {
          nextDormers = state.dormers.map((d) =>
            d.dormer_id === dormer.dormer_id ? { ...d, status: 'Pending Assignment' } : d
          );
        }
      }
    }

    let nextNotifications = state.notifications;
    if (notifyApplicant) {
      const nextNotifId = Math.max(0, ...state.notifications.map((n) => n.notification_id)) + 1;
      const notifCode = applicant.application_code || `APP-${String(applicant.applicant_id).padStart(4, '0')}`;
      const newNotification: Notification = {
        notification_id: nextNotifId,
        user_id: dormer?.user_id || 0,
        notification_type: `application_${decision}`,
        message: `Your dormitory application (${notifCode}) was ${decision.toUpperCase()}.${notes ? ` Decision note: ${notes}` : ''}`,
        date_created: nowIso.slice(0, 19),
        read_status: false,
      };
      nextNotifications = [newNotification, ...state.notifications];
    }

    setState((prev) => ({
      ...prev,
      dormers: nextDormers,
      notifications: nextNotifications,
      applicants: prev.applicants.map((a) => (a.applicant_id === applicantId ? updatedApplicant : a)),
    }));

    return { ok: true, applicant: updatedApplicant };
  };

  // --- Room & Bed Management Actions ---
  const addRoom = (payload: AddRoomPayload): ActionResult<Room> => {
    const cleanRoomNum = payload.room_number.trim();
    if (!cleanRoomNum) {
      return { ok: false, error: 'Room number is required.' };
    }
    const duplicate = state.rooms.some(
      (r) =>
        r.building_id === payload.building_id &&
        r.room_number.toLowerCase() === cleanRoomNum.toLowerCase()
    );
    if (duplicate) {
      return { ok: false, error: 'Room number already exists in this dormitory.' };
    }
    const cap = Math.min(4, Math.max(1, payload.capacity || 4));
    const nextRoomId = Math.max(0, ...state.rooms.map((r) => r.room_id)) + 1;
    const today = new Date().toISOString().slice(0, 10);
    const status = payload.status || 'available';
    const newRoom: Room = {
      room_id: nextRoomId,
      building_id: payload.building_id,
      room_number: cleanRoomNum,
      floor: payload.floor.trim() || '1st floor',
      capacity: cap,
      status,
      room_status: status === 'maintenance' ? 'unavailable' : 'available',
      last_reviewed: today,
    };

    let nextBedId = Math.max(0, ...state.beds.map((b) => b.bed_id)) + 1;
    const newBeds: Bed[] = Array.from({ length: cap }, (_, i) => ({
      bed_id: nextBedId++,
      room_id: nextRoomId,
      bed_number: `Bed ${String(i + 1).padStart(2, '0')}`,
      bed_status: 'available',
    }));

    setState((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
      beds: [...prev.beds, ...newBeds],
    }));

    return { ok: true, room: newRoom };
  };

  const updateRoom = (roomId: number, payload: UpdateRoomPayload): ActionResult<Room> => {
    const room = state.rooms.find((r) => r.room_id === roomId);
    if (!room) return { ok: false, error: 'Room not found.' };

    const targetBldg = payload.building_id ?? room.building_id;
    const targetNum = payload.room_number ? payload.room_number.trim() : room.room_number;

    if (
      (targetBldg !== room.building_id || targetNum.toLowerCase() !== room.room_number.toLowerCase()) &&
      state.rooms.some(
        (r) =>
          r.room_id !== roomId &&
          r.building_id === targetBldg &&
          r.room_number.toLowerCase() === targetNum.toLowerCase()
      )
    ) {
      return { ok: false, error: 'Room number already exists in this dormitory.' };
    }

    const currentOccupiedBeds = state.beds.filter(
      (b) => b.room_id === roomId && b.bed_status === 'occupied'
    ).length;

    let targetCapacity = room.capacity;
    if (payload.capacity !== undefined) {
      if (payload.capacity < currentOccupiedBeds) {
        return {
          ok: false,
          error: `Cannot reduce bed capacity below currently occupied beds (${currentOccupiedBeds}).`,
        };
      }
      targetCapacity = Math.min(4, Math.max(1, payload.capacity));
    }

    const today = new Date().toISOString().slice(0, 10);
    let nextStatus = payload.status ?? room.status;
    if (nextStatus !== 'maintenance') {
      nextStatus = currentOccupiedBeds >= targetCapacity ? 'full' : 'available';
    }

    const updatedRoom: Room = {
      ...room,
      building_id: targetBldg,
      room_number: targetNum,
      floor: payload.floor ? payload.floor.trim() : room.floor,
      capacity: targetCapacity,
      status: nextStatus,
      room_status: nextStatus === 'maintenance' ? 'unavailable' : 'available',
      last_reviewed: today,
    };

    let updatedBeds = [...state.beds];
    const currentRoomBeds = updatedBeds.filter((b) => b.room_id === roomId);
    if (targetCapacity > currentRoomBeds.length) {
      let nextBedId = Math.max(0, ...state.beds.map((b) => b.bed_id)) + 1;
      const addCount = targetCapacity - currentRoomBeds.length;
      for (let i = 0; i < addCount; i++) {
        const bedIndex = currentRoomBeds.length + i + 1;
        updatedBeds.push({
          bed_id: nextBedId++,
          room_id: roomId,
          bed_number: `Bed ${String(bedIndex).padStart(2, '0')}`,
          bed_status: 'available',
        });
      }
    } else if (targetCapacity < currentRoomBeds.length) {
      let toRemove = currentRoomBeds.length - targetCapacity;
      const bedsToRemoveIds = new Set<number>();
      for (let i = currentRoomBeds.length - 1; i >= 0 && toRemove > 0; i--) {
        if (currentRoomBeds[i].bed_status !== 'occupied') {
          bedsToRemoveIds.add(currentRoomBeds[i].bed_id);
          toRemove--;
        }
      }
      updatedBeds = updatedBeds.filter((b) => !bedsToRemoveIds.has(b.bed_id));
    }

    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.room_id === roomId ? updatedRoom : r)),
      beds: updatedBeds,
    }));

    return { ok: true, room: updatedRoom };
  };

  const assignResidentToBed = (
    bedId: number,
    dormerId: number,
    effectiveDate?: string,
    notes?: string
  ): ActionResult => {
    const bed = state.beds.find((b) => b.bed_id === bedId);
    if (!bed || bed.bed_status !== 'available') {
      return { ok: false, error: 'Selected bed is not available.' };
    }
    const room = state.rooms.find((r) => r.room_id === bed.room_id);
    if (!room) return { ok: false, error: 'Room not found.' };

    const dormer = state.dormers.find((d) => d.dormer_id === dormerId);
    if (!dormer) return { ok: false, error: 'Resident not found.' };

    const today = effectiveDate || new Date().toISOString().slice(0, 10);
    const nextAssignmentId = Math.max(0, ...state.roomAssignments.map((r) => r.assignment_id)) + 1;

    setState((prev) => {
      const previousActive = prev.roomAssignments.find(
        (r) => r.dormer_id === dormerId && r.assignment_status === 'active'
      );
      const updatedAssignments = prev.roomAssignments.map((r) =>
        r.dormer_id === dormerId && r.assignment_status === 'active'
          ? { ...r, assignment_status: 'transferred' as const, end_date: today }
          : r
      );

      const updatedBeds = prev.beds.map((b) => {
        if (previousActive && b.bed_id === previousActive.bed_id) {
          return { ...b, bed_status: 'available' as const };
        }
        if (b.bed_id === bedId) {
          return { ...b, bed_status: 'occupied' as const };
        }
        return b;
      });

      const occupiedInRoom = updatedBeds.filter(
        (b) => b.room_id === room.room_id && b.bed_status === 'occupied'
      ).length;

      const updatedRooms = prev.rooms.map((r) => {
        if (r.room_id === room.room_id) {
          const newStatus: 'available' | 'full' | 'maintenance' =
            r.status === 'maintenance'
              ? 'maintenance'
              : occupiedInRoom >= r.capacity
              ? 'full'
              : 'available';
          return { ...r, status: newStatus, last_reviewed: today };
        }
        return r;
      });

      const updatedDormers = prev.dormers.map((d) =>
        d.dormer_id === dormerId ? { ...d, status: 'Active Resident' } : d
      );

      const noteMessage = notes ? ` Note: ${notes}` : '';
      const newNotif: Notification = {
        notification_id: Math.max(0, ...prev.notifications.map((n) => n.notification_id)) + 1,
        user_id: dormer.user_id || 0,
        notification_type: 'Room Assignment',
        message: `Assigned to ${room.room_number} (${bed.bed_number}).${noteMessage}`,
        date_created: today,
        read_status: false,
      };

      return {
        ...prev,
        beds: updatedBeds,
        rooms: updatedRooms,
        dormers: updatedDormers,
        notifications: [newNotif, ...prev.notifications],
        roomAssignments: [
          ...updatedAssignments,
          {
            assignment_id: nextAssignmentId,
            dormer_id: dormerId,
            bed_id: bedId,
            start_date: today,
            end_date: null,
            assignment_status: 'active' as const,
          },
        ],
      };
    });

    return { ok: true };
  };

  const unassignBed = (bedId: number): ActionResult => {
    const bed = state.beds.find((b) => b.bed_id === bedId);
    if (!bed || bed.bed_status !== 'occupied') {
      return { ok: false, error: 'Bed is not currently occupied.' };
    }
    const room = state.rooms.find((r) => r.room_id === bed.room_id);
    const assignment = state.roomAssignments.find(
      (r) => r.bed_id === bedId && r.assignment_status === 'active'
    );

    const today = new Date().toISOString().slice(0, 10);

    setState((prev) => {
      const updatedBeds = prev.beds.map((b) =>
        b.bed_id === bedId ? { ...b, bed_status: 'available' as const } : b
      );

      const updatedAssignments = prev.roomAssignments.map((r) =>
        r.bed_id === bedId && r.assignment_status === 'active'
          ? { ...r, assignment_status: 'ended' as const, end_date: today }
          : r
      );

      const updatedDormers = assignment
        ? prev.dormers.map((d) =>
            d.dormer_id === assignment.dormer_id
              ? { ...d, status: 'Pending Assignment' }
              : d
          )
        : prev.dormers;

      const occupiedInRoom = updatedBeds.filter(
        (b) => b.room_id === bed.room_id && b.bed_status === 'occupied'
      ).length;

      const updatedRooms = prev.rooms.map((r) => {
        if (room && r.room_id === room.room_id) {
          const newStatus: 'available' | 'full' | 'maintenance' =
            r.status === 'maintenance'
              ? 'maintenance'
              : occupiedInRoom >= r.capacity
              ? 'full'
              : 'available';
          return { ...r, status: newStatus, last_reviewed: today };
        }
        return r;
      });

      return {
        ...prev,
        beds: updatedBeds,
        rooms: updatedRooms,
        dormers: updatedDormers,
        roomAssignments: updatedAssignments,
      };
    });

    return { ok: true };
  };

  // Backwards compatible wrapper for assignStudentToBed
  const assignStudentToBed = (dormerId: number, bedId: number): ActionResult => {
    return assignResidentToBed(bedId, dormerId);
  };

  // --- FR-11: Record / Import Attendance (upsert: updates if exists for dormer + date, otherwise inserts; does NOT alter bed occupancy) ---
  const recordAttendance = (payload: RecordAttendancePayload): ActionResult => {
    const targetDate = payload.date || payload.attendance_date || new Date().toISOString().slice(0, 10);
    const targetStatus = payload.status || payload.attendance_status || 'present';
    const targetTime = payload.time_recorded || new Date().toTimeString().slice(0, 8);

    let method: 'fingerprint' | 'numeric_id_pin' | 'manual' = 'manual';
    if (payload.recording_method) {
      method = payload.recording_method;
    } else if (payload.method === 'pin') {
      method = 'numeric_id_pin';
    } else if (payload.method === 'manual') {
      method = 'manual';
    } else if (payload.method === 'biometric') {
      method = 'fingerprint';
    } else if (targetStatus === 'present') {
      method = 'fingerprint';
    }

    setState((prev) => {
      const existingIdx = prev.attendanceRecords.findIndex(
        (r) => r.dormer_id === payload.dormer_id && r.attendance_date === targetDate
      );

      if (existingIdx >= 0) {
        const updated = [...prev.attendanceRecords];
        updated[existingIdx] = {
          ...updated[existingIdx],
          attendance_status: targetStatus,
          time_recorded: targetTime,
          recording_method: method,
        };
        return { ...prev, attendanceRecords: updated };
      } else {
        const nextId = Math.max(0, ...prev.attendanceRecords.map((a) => a.attendance_id)) + 1;
        const newRecord: AttendanceRecord = {
          attendance_id: nextId,
          dormer_id: payload.dormer_id,
          attendance_date: targetDate,
          time_recorded: targetTime,
          recording_method: method,
          attendance_status: targetStatus,
        };
        return {
          ...prev,
          attendanceRecords: [newRecord, ...prev.attendanceRecords],
        };
      }
    });
    return { ok: true };
  };

  // --- FR-13: Submit Pass Slip Request (validates return >= departure) ---
  const submitPassSlip = (dormerId: number, payload: SubmitPassSlipPayload): ActionResult => {
    if (new Date(payload.expected_return_datetime) < new Date(payload.departure_datetime)) {
      return { ok: false, error: 'Expected return date/time cannot be earlier than departure.' };
    }
    const nextId = Math.max(140, ...state.passSlips.map((p) => p.pass_slip_id)) + 1;
    setState((prev) => ({
      ...prev,
      passSlips: [
        {
          pass_slip_id: nextId,
          dormer_id: dormerId,
          reviewed_by: null,
          departure_datetime: payload.departure_datetime,
          expected_return_datetime: payload.expected_return_datetime,
          actual_return_datetime: null,
          destination: payload.destination.trim(),
          purpose: payload.purpose.trim(),
          remarks: '',
          request_status: 'pending' as const,
        },
        ...prev.passSlips,
      ],
    }));
    return { ok: true };
  };

  // --- FR-14 & FR-21: Review Pass Slip & Record Actual Return + Notify Dormer ---
  const reviewPassSlip = (passSlipId: number, status: string, remarks = '', actualReturn: string | null = null) => {
    const reviewerId =
      state.personnel.find((p) => p.user_id === state.currentUser?.user_id)?.personnel_id || 1;
    const slip = state.passSlips.find((p) => p.pass_slip_id === passSlipId);
    const dormer = state.dormers.find((d) => d.dormer_id === slip?.dormer_id);

    setState((prev) => {
      const nextNotifId = Math.max(0, ...prev.notifications.map((n) => n.notification_id)) + 1;
      const notifications = dormer?.user_id
        ? [
            {
              notification_id: nextNotifId,
              user_id: dormer.user_id,
              notification_type: 'pass_slip_update',
              message: `Pass Slip PS-${passSlipId} status updated to ${status.toUpperCase()}.`,
              date_created: new Date().toISOString().slice(0, 19),
              read_status: false,
            },
            ...prev.notifications,
          ]
        : prev.notifications;

      return {
        ...prev,
        notifications,
        passSlips: prev.passSlips.map((p) =>
          p.pass_slip_id === passSlipId
            ? {
                ...p,
                request_status: status as PassSlipStatus,
                reviewed_by: reviewerId,
                remarks: remarks || p.remarks,
                actual_return_datetime: actualReturn ?? p.actual_return_datetime,
              }
            : p
        ),
      };
    });
  };

  // --- FR-15: Submit Renewal Request (prevents duplicate per period) ---
  const submitRenewal = (dormerId: number, renewalPeriod: string, profileUpdates: Partial<Dormer>): ActionResult => {
    const duplicate = state.renewalRequests.some(
      (r) => r.dormer_id === dormerId && r.renewal_period === renewalPeriod
    );
    if (duplicate) {
      return { ok: false, error: `A renewal request for ${renewalPeriod} already exists.` };
    }
    const nextId = Math.max(0, ...state.renewalRequests.map((r) => r.renewal_id)) + 1;
    setState((prev) => ({
      ...prev,
      dormers: prev.dormers.map((d) => (d.dormer_id === dormerId ? { ...d, ...profileUpdates } : d)),
      renewalRequests: [
        {
          renewal_id: nextId,
          dormer_id: dormerId,
          reviewed_by: null,
          submission_date: new Date().toISOString().slice(0, 10),
          renewal_period: renewalPeriod,
          consent_confirmed: true,
          assessment_notes: '',
          review_date: null,
          renewal_status: 'pending' as const,
        },
        ...prev.renewalRequests,
      ],
    }));
    return { ok: true };
  };

  // --- FR-16 & FR-21: Review Renewal Request + Notify Dormer ---
  const reviewRenewal = (renewalId: number, status: string, assessmentNotes: string) => {
    const reviewerId =
      state.personnel.find((p) => p.user_id === state.currentUser?.user_id)?.personnel_id || 1;
    const req = state.renewalRequests.find((r) => r.renewal_id === renewalId);
    const dormer = state.dormers.find((d) => d.dormer_id === req?.dormer_id);

    setState((prev) => {
      const nextNotifId = Math.max(0, ...prev.notifications.map((n) => n.notification_id)) + 1;
      const notifications = dormer?.user_id
        ? [
            {
              notification_id: nextNotifId,
              user_id: dormer.user_id,
              notification_type: 'renewal_update',
              message: `Your renewal for ${req!.renewal_period} was ${status.toUpperCase()}.`,
              date_created: new Date().toISOString().slice(0, 19),
              read_status: false,
            },
            ...prev.notifications,
          ]
        : prev.notifications;

      return {
        ...prev,
        notifications,
        renewalRequests: prev.renewalRequests.map((r) =>
          r.renewal_id === renewalId
            ? {
                ...r,
                renewal_status: status as RenewalRequest['renewal_status'],
                assessment_notes: assessmentNotes,
                reviewed_by: reviewerId,
                review_date: new Date().toISOString().slice(0, 19),
              }
            : r
        ),
      };
    });
  };

  // --- FR-18: Computed Absence Alerts (derived from attendance records, separate from occupancy) ---
  const absenceAlerts: AbsenceAlert[] = useMemo(() => {
    return state.dormers
      .map((dormer) => {
        const logs = state.attendanceRecords
          .filter((r) => r.dormer_id === dormer.dormer_id)
          .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
        let consecutiveAbsences = 0;
        for (const log of logs) {
          if (log.attendance_status === 'absent') consecutiveAbsences += 1;
          else break;
        }
        return { dormer, consecutiveAbsences };
      })
      .filter((item) => item.consecutiveAbsences >= ABSENCE_ALERT_THRESHOLD);
  }, [state.dormers, state.attendanceRecords]);

  // --- FR-10: Computed Occupancy Stats by Building ---
  const occupancyStats: OccupancyStats = useMemo(() => {
    const totalBeds = state.beds.length;
    const occupiedBeds = state.beds.filter((b) => b.bed_status === 'occupied').length;
    const availableBeds = state.beds.filter((b) => b.bed_status === 'available').length;
    const byBuilding = state.buildings.map((bldg) => {
      const bldgRooms = state.rooms.filter((r) => r.building_id === bldg.building_id);
      const roomIds = new Set(bldgRooms.map((r) => r.room_id));
      const bldgBeds = state.beds.filter((b) => roomIds.has(b.room_id));
      const occupied = bldgBeds.filter((b) => b.bed_status === 'occupied').length;
      const available = bldgBeds.filter((b) => b.bed_status === 'available').length;
      return {
        ...bldg,
        totalRooms: bldgRooms.length,
        totalBeds: bldgBeds.length,
        occupiedBeds: occupied,
        availableBeds: available,
        occupancyRate: bldgBeds.length ? Math.round((occupied / bldgBeds.length) * 100) : 0,
      };
    });
    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      overallRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      byBuilding,
    };
  }, [state.buildings, state.rooms, state.beds]);

  const markNotificationRead = (notificationId: number) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.notification_id === notificationId ? { ...n, read_status: true } : n
      ),
    }));
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(loadInitialState());
  };

  const addDormer = (dormerData: AddDormerData): ActionResult<Dormer> => {
    const cleanNum = dormerData.student_number.trim();
    if (state.dormers.some((d) => d.student_number.toLowerCase() === cleanNum.toLowerCase())) {
      return { ok: false, error: 'Student ID already exists.' };
    }
    const nextId = Math.max(0, ...state.dormers.map((d) => d.dormer_id)) + 1;
    const newDormer: Dormer = {
      dormer_id: nextId,
      user_id: null,
      student_number: cleanNum,
      first_name: dormerData.first_name.trim(),
      middle_name: dormerData.middle_name?.trim() || '',
      last_name: dormerData.last_name.trim(),
      email: dormerData.email.trim(),
      course: dormerData.course,
      year_level: dormerData.year_level,
      contact_number: dormerData.contact_number.trim(),
      address: dormerData.address?.trim() || '',
      emergency_contact_name: dormerData.emergency_contact_name.trim(),
      emergency_contact_relationship: dormerData.emergency_contact_relationship?.trim() || 'Parent/Guardian',
      emergency_contact_number: dormerData.emergency_contact_number.trim(),
      status: dormerData.status || 'Pending Assignment',
    };
    setState((prev) => ({
      ...prev,
      dormers: [...prev.dormers, newDormer],
    }));
    return { ok: true, user: undefined };
  };

  const updateDormer = (dormerId: number, updates: Partial<Dormer>): ActionResult<Dormer> => {
    const existing = state.dormers.find((d) => d.dormer_id === dormerId);
    if (!existing) return { ok: false, error: 'Student not found.' };

    if (
      updates.student_number &&
      updates.student_number.trim().toLowerCase() !== existing.student_number.toLowerCase() &&
      state.dormers.some(
        (d) =>
          d.dormer_id !== dormerId &&
          d.student_number.toLowerCase() === updates.student_number!.trim().toLowerCase()
      )
    ) {
      return { ok: false, error: 'Student ID already in use.' };
    }

    setState((prev) => ({
      ...prev,
      dormers: prev.dormers.map((d) => (d.dormer_id === dormerId ? { ...d, ...updates } : d)),
    }));
    return { ok: true };
  };

  const value = {
    ...state,
    absenceAlerts,
    occupancyStats,
    login,
    activateDormerAccount,
    logout,
    addDormer,
    updateDormer,
    submitApplication,
    submitPublicApplication,
    evaluateApplicant,
    reviewApplicant,
    addRoom,
    updateRoom,
    assignResidentToBed,
    unassignBed,
    assignStudentToBed,
    recordAttendance,
    submitPassSlip,
    reviewPassSlip,
    submitRenewal,
    reviewRenewal,
    markNotificationRead,
    resetDemoData,
  };

  return <OapContext.Provider value={value}>{children}</OapContext.Provider>;
}

// Local type aliases used only in this file
type PassSlipStatus = 'pending' | 'approved' | 'rejected' | 'overdue' | 'returned';
type RenewalRequest = { renewal_status: 'pending' | 'approved' | 'rejected' };
