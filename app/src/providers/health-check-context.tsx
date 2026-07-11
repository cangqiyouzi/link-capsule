import { createContext } from 'react';
import type { Capsule } from '@/types';

export interface HealthCheckContextValue {
  running: boolean;
  completed: number;
  total: number;
  deadCount: number;
  force: boolean;
  setForce: (v: boolean) => void;
  startBatch: (capsules: Capsule[]) => void;
  abort: () => void;
}

export const HealthCheckContext = createContext<HealthCheckContextValue | null>(null);
