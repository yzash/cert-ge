import { useEffect, useState } from 'react';
import type { DemoState, Officer } from '@mozart/schema';
import { useApp } from '@/store/app';

export function useView(): DemoState {
  return useApp((s) => s.view)!;
}

export function useMe(): Officer {
  const id = useApp((s) => s.session?.officerId);
  const view = useApp((s) => s.view);
  return view?.officers.find((o) => o.id === id) ?? view!.officers[0];
}

export function useOnline(): boolean {
  const net = useApp((s) => s.netOnline);
  const airplane = useApp((s) => s.settings.airplane);
  return net && !airplane;
}

/** Re-render every `ms` so SLA countdowns stay live. */
export function useNow(ms = 30000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function usePendingCount(): number {
  return useApp((s) => s.outbox.filter((c) => c.type !== 'audit.ai').length);
}
