import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { HealthStatus } from '@/types';

export type HealthFilterValue = 'all' | HealthStatus;

interface HealthFilterProps {
  value: HealthFilterValue;
  onChange: (v: HealthFilterValue) => void;
  disabled?: boolean;
}

const OPTIONS: { value: HealthFilterValue; label: string }[] = [
  { value: 'all', label: '全部链接' },
  { value: 'ok', label: '健康' },
  { value: 'dead', label: '失效' },
  { value: 'rate_limited', label: '被限流' },
  { value: 'redirect', label: '重定向' },
  { value: 'slow', label: '响应慢' },
  { value: 'unknown', label: '待检' },
];

export default function HealthFilter({ value, onChange, disabled }: HealthFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as HealthFilterValue)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full border-white/10 bg-white/5 text-white/70 sm:w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#0a0a0a]/95 text-white">
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
