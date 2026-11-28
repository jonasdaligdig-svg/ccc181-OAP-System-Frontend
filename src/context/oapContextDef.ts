import { createContext } from 'react';
import type { OapContextValue } from '../types/oap';

export type {
  ActivateDormerResult,
  AddDormerData,
  AddRoomPayload,
  Applicant,
  ApplicantChecklist,
  ApplicantDocument,
  Bed,
  LoginResult,
  OapContextValue,
  PublicUploadFileInfo,
  RecordAttendancePayload,
  Room,
  SubmitPublicApplicationPayload,
  SubmitPublicApplicationResult,
  UpdateRoomPayload,
  User,
  UserAccount,
  UserAccountStatus,
} from '../types/oap';
export const OapContext = createContext<OapContextValue | null>(null);
