import { createContext } from "react";
import type { MockData } from "../types/oap";

// ─── Context value shape ───
export interface OapContextValue {
  data: MockData;
  setData: React.Dispatch<React.SetStateAction<MockData>>;
}

export const OapContext = createContext<OapContextValue | undefined>(undefined);
