/** حامل الجلسة الشبكية الحالية (كائنات غير قابلة للتسلسل — خارج المخزن). */
import type { HostSession, GuestSession } from '@/lib/net';

let host: HostSession | null = null;
let guest: GuestSession | null = null;

export function setHostSession(s: HostSession | null) { host = s; }
export function getHostSession() { return host; }
export function setGuestSession(s: GuestSession | null) { guest = s; }
export function getGuestSession() { return guest; }

export function clearSessions() {
  try { host?.destroy(); } catch { /* ignore */ }
  try { guest?.destroy(); } catch { /* ignore */ }
  host = null;
  guest = null;
}