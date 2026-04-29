'use client';

import { useCallback, useRef, useState } from 'react';
import { MAX_LOG_ENTRIES } from './constants';
import type { LogEntry, LogLevel } from './types';

export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const log = useCallback((level: LogLevel, message: string) => {
    const entry: LogEntry = {
      id: idRef.current++,
      level,
      message,
      time: new Date().toLocaleTimeString('zh-CN'),
    };
    setEntries((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
    });
  }, []);

  return { entries, log };
}
