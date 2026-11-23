const UNIT_IN_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
} as const;

export const durationToSeconds = (duration: string): number => {
  const match = /^(\d+)([smhd])$/.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const [, amount, unit] = match;

  return Number(amount) * UNIT_IN_SECONDS[unit as keyof typeof UNIT_IN_SECONDS];
};
