import { useContext } from 'react';
import { HealthCheckContext } from '@/providers/health-check-context';

export function useHealthCheck() {
  const ctx = useContext(HealthCheckContext);
  if (!ctx) {
    throw new Error('useHealthCheck must be used within HealthCheckProvider');
  }
  return ctx;
}
