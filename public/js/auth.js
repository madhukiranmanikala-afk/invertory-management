import * as api from './api.js';

const STORAGE_KEY = 'session';
let inMemorySession = null;

export function setSession(session) {
  inMemorySession = session;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  if (session?.userId) api.setCurrentUser(session.userId);
}

export function getSession() {
  return inMemorySession;
}

export function restoreSession() {
  if (inMemorySession) return inMemorySession;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.userId) return null;
    inMemorySession = parsed;
    api.setCurrentUser(parsed.userId);
    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  inMemorySession = null;
  sessionStorage.removeItem(STORAGE_KEY);
  api.clearCurrentUser();
}

/**
 * Bring the stored session in step with the shared user record. A role change
 * bumps the user's sessionVersion, so a session that no longer matches is
 * refreshed with the new role instead of keeping the old access.
 */
export function syncSession() {
  const session = inMemorySession || restoreSession();
  if (!session) return null;
  const user = api.peekCurrentUser();
  if (!user) return session;
  const version = Number(user.sessionVersion) || 1;
  if ((Number(session.sessionVersion) || 0) !== version) {
    session.sessionVersion = version;
    inMemorySession = session;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export async function login(identifier, password) {
  const { user } = await api.login(identifier, password);
  setSession({
    userId: user.id,
    token: user.id,
    loginAt: Date.now(),
    sessionVersion: user.sessionVersion,
  });
  return user;
}

export function logout() {
  clearSession();
}

export async function fetchCurrentUser() {
  return api.getMe();
}
