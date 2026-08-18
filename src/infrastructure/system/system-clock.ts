import type { Clock, ClockReading } from '@/application/ports/clock';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export class SystemClock implements Clock {
  now(): ClockReading {
    const now = new Date();

    return {
      instant: now.toISOString(),
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    };
  }
}
