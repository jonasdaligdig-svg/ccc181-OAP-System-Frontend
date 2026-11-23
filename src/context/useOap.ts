import { useContext } from 'react';
import { OapContext } from './oapContextDef';
import type { OapContextValue } from '../types/oap';

export function useOap(): OapContextValue {
  const ctx = useContext(OapContext);
  if (!ctx) throw new Error('useOap must be used inside OapProvider');
  return ctx;
}
