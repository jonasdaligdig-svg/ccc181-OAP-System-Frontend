/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const STORAGE_KEY = 'msun_oap_state_v1';
const ABSENCE_ALERT_THRESHOLD = 3; // Configured consecutive-night absence threshold (FR-18)

const OapContext = createContext(null);

function loadInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
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

export function OapProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // --- FR-01: User Authentication ---
  const login = (username, password, expectedRole) => {
    const user = state.users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password_hash === password &&
        (!expectedRole || u.role === expectedRole)
    );
    if (!user) return { ok: false, error: 'Invalid credentials or wrong portal.' };
    if (user.account_status !== 'active') {
      return { ok: false, error: 'This account is inactive. Please contact Dormitory Management.' };
    }
    setState((prev) => ({ ...prev, currentUser: user }));
    return { ok: true, user };
  };

  const logout = () => setState((prev) => ({ ...prev, currentUser: null }));

  // --- FR-05: Public Application Submission (reuses student profile by student_number) ---
  const submitApplication = (formData) => {
    const cleanNum = formData.student_number.trim();
    const existingDormer = state.dormers.find((d) => d.student_number === cleanNum);
    let targetDormerId;
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
    const newApplicant = {
      applicant_id: newApplicantId,
      dormer_id: targetDormerId,
      evaluated_by: null,
      application_date: new Date().toISOString().slice(0, 10),
      scholarship_status: Boolean(formData.scholarship_status),
      address: formData.address.trim(),
      consent_confirmed: Boolean(formData.consent_confirmed),
      evaluation_notes: '',
      application_status: 'pending',
    };

    setState((prev) => ({
      ...prev,
      dormers: nextDormers,
      applicants: [newApplicant, ...prev.applicants],
    }));

    return { ok: true, applicant: newApplicant };
  };

  // --- FR-07: Applicant Evaluation (human decision only) ---
  const evaluateApplicant = (applicantId, status, evaluationNotes) => {
    const reviewerId =
      state.personnel.find((p) => p.user_id === state.currentUser?.user_id)?.personnel_id || 1;
    setState((prev) => ({
      ...prev,
      applicants: prev.applicants.map((a) =>
        a.applicant_id === applicantId
          ? {
              ...a,
              application_status: status,
              evaluation_notes: evaluationNotes,
              evaluated_by: reviewerId,
            }
          : a
      ),
    }));
  };

  // --- FR-08 & FR-09: Assign Student to Bed (enforces max 4 per room & no double-booking) ---
  const assignStudentToBed = (dormerId, bedId) => {
    const bed = state.beds.find((b) => b.bed_id === bedId);
    if (!bed || bed.bed_status !== 'available') {
      return { ok: false, error: 'Selected bed is not available.' };
    }
    const room = state.rooms.find((r) => r.room_id === bed.room_id);
    const activeInRoom = state.beds.filter(
      (b) => b.room_id === bed.room_id && b.bed_status === 'occupied'
    ).length;
    if (activeInRoom >= (room?.capacity || 4)) {
      return { ok: false, error: 'Room has reached its maximum capacity of 4 occupants.' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextAssignmentId = Math.max(0, ...state.roomAssignments.map((r) => r.assignment_id)) + 1;

    setState((prev) => {
      const previousActive = prev.roomAssignments.find(
        (r) => r.dormer_id === dormerId && r.assignment_status === 'active'
      );
      const updatedAssignments = prev.roomAssignments.map((r) =>
        r.dormer_id === dormerId && r.assignment_status === 'active'
          ? { ...r, assignment_status: 'transferred', end_date: today }
          : r
      );
      const updatedBeds = prev.beds.map((b) => {
        if (previousActive && b.bed_id === previousActive.bed_id) {
          return { ...b, bed_status: 'available' };
        }
        if (b.bed_id === bedId) {
          return { ...b, bed_status: 'occupied' };
        }
        return b;
      });
      return {
        ...prev,
        beds: updatedBeds,
        roomAssignments: [
          ...updatedAssignments,
          {
            assignment_id: nextAssignmentId,
            dormer_id: dormerId,
            bed_id: bedId,
            start_date: today,
            end_date: null,
            assignment_status: 'active',
          },
        ],
      };
    });
    return { ok: true };
  };

  // --- FR-11: Record / Import Attendance (does NOT alter bed occupancy) ---
  const recordAttendance = ({ dormer_id, attendance_date, attendance_status, recording_method }) => {
    const exists = state.attendanceRecords.some(
      (r) => r.dormer_id === dormer_id && r.attendance_date === attendance_date
    );
    if (exists) {
      return { ok: false, error: 'Duplicate attendance entry for this student and date.' };
    }
    const nextId = Math.max(0, ...state.attendanceRecords.map((a) => a.attendance_id)) + 1;
    const nowTime = new Date().toTimeString().slice(0, 8);
    setState((prev) => ({
      ...prev,
      attendanceRecords: [
        {
          attendance_id: nextId,
          dormer_id,
          attendance_date,
          time_recorded: nowTime,
          recording_method: recording_method || 'fingerprint',
          attendance_status,
        },
        ...prev.attendanceRecords,
      ],
    }));
    return { ok: true };
  };

  // --- FR-13: Submit Pass Slip Request (validates return >= departure) ---
  const submitPassSlip = (dormerId, payload) => {
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
          request_status: 'pending',
        },
        ...prev.passSlips,
      ],
    }));
    return { ok: true };
  };

  // --- FR-14 & FR-21: Review Pass Slip & Record Actual Return + Notify Dormer ---
  const reviewPassSlip = (passSlipId, status, remarks = '', actualReturn = null) => {
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
                request_status: status,
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
  const submitRenewal = (dormerId, renewalPeriod, profileUpdates) => {
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
          renewal_status: 'pending',
        },
        ...prev.renewalRequests,
      ],
    }));
    return { ok: true };
  };

  // --- FR-16 & FR-21: Review Renewal Request + Notify Dormer ---
  const reviewRenewal = (renewalId, status, assessmentNotes) => {
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
              message: `Your renewal for ${req.renewal_period} was ${status.toUpperCase()}.`,
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
                renewal_status: status,
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
  const absenceAlerts = useMemo(() => {
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
  const occupancyStats = useMemo(() => {
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

  const markNotificationRead = (notificationId) => {
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

  const value = {
    ...state,
    absenceAlerts,
    occupancyStats,
    login,
    logout,
    submitApplication,
    evaluateApplicant,
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

export function useOap() {
  const ctx = useContext(OapContext);
  if (!ctx) throw new Error('useOap must be used inside OapProvider');
  return ctx;
}