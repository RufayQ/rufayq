/**
 * Active patient key singleton.
 * Allows synchronous reads of the currently-resolved patient key
 * (patient_id when known, else user_id/device_id fallback).
 */
type Subscriber = (key: string | null) => void;

let activeKey: string | null = null;
const subs: Set<Subscriber> = new Set();

export function setActivePatientKey(key: string | null) {
  activeKey = key;
  for (const s of subs) s(activeKey);
}

export function getActivePatientKey(): string | null {
  return activeKey;
}

export function subscribeActivePatient(cb: Subscriber) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export default { setActivePatientKey, getActivePatientKey, subscribeActivePatient };
