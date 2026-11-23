import { useContext } from "react";
import { OapContext } from "./oapContextDef";
import type { OapContextValue } from "./oapContextDef";

export type { OapContextValue };

export function useOap(): OapContextValue {
  const ctx = useContext(OapContext);
  if (!ctx) {
    throw new Error("useOap must be used within an OapProvider");
  }
  return ctx;
}
