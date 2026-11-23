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
  Room,
  UpdateRoomPayload,
} from '../types/oap';
export const OapContext = createContext<OapContextValue | null>(null);
