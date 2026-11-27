import { createContext } from 'react';
import type { OapContextValue } from '../types/oap';

export type {
  AddDormerData,
  AddRoomPayload,
  Applicant,
  ApplicantChecklist,
  ApplicantDocument,
  Bed,
  OapContextValue,
  PublicUploadFileInfo,
  RecordAttendancePayload,
  Room,
  SubmitPublicApplicationPayload,
  SubmitPublicApplicationResult,
  UpdateRoomPayload,
} from '../types/oap';
export const OapContext = createContext<OapContextValue | null>(null);
