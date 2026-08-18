export type ClockReading = Readonly<{
  instant: string;
  date: string;
}>;

export interface Clock {
  now(): ClockReading;
}
