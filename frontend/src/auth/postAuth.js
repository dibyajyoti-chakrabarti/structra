// Where to send the user after signing in. The invite token has to survive the round trip
// to Google or GitHub, so it is parked in sessionStorage before leaving.
const KEY = 'structra-post-auth';

export function rememberPostAuth({ inviteToken = '' } = {}) {
  try {
    if (inviteToken) sessionStorage.setItem(KEY, JSON.stringify({ inviteToken }));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Without sessionStorage the user simply lands on the default page.
  }
}

export function takePostAuth() {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { inviteToken: typeof parsed.inviteToken === 'string' ? parsed.inviteToken : '' };
  } catch {
    return { inviteToken: '' };
  }
}

export function resolvePostAuthRoute(user, inviteToken = '') {
  if (inviteToken) return `/invite/${encodeURIComponent(inviteToken)}/respond`;
  return user?.is_new === false ? '/app' : '/app/onboarding';
}
