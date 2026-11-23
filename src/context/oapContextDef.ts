import { createContext } from 'react';
import type { OapContextValue } from '../types/oap';

export const OapContext = createContext<OapContextValue | null>(null);
