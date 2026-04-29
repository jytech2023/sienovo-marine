'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/lib/types';

type Props = {
  entries: LogEntry[];
};

export function LogPanel({ entries }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div ref={ref} className="log-panel">
      {entries.map((entry) => (
        <div key={entry.id} className={`log-entry ${entry.level}`}>
          <span className="time">[{entry.time}]</span>{' '}
          <span className="msg">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
