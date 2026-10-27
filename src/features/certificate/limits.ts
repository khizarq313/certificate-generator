export const LIMITS = {
  customType: { min: 3, max: 24 },
  recipientName: { min: 2, max: 40 },
  description: { min: 10, max: 200 },
  eventName: { min: 3, max: 70 },
  signatoryName: { min: 2, max: 32 },
  designation: { min: 2, max: 40 },
  referenceId: { min: 0, max: 28 },
} as const;

export const EVENT_DATE_MIN = '2000-01-01';

export function getEventDateMax(now = new Date()): string {
  const upper = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  upper.setDate(upper.getDate() + 366);
  return [upper.getFullYear(), String(upper.getMonth() + 1).padStart(2, '0'), String(upper.getDate()).padStart(2, '0')].join('-');
}
