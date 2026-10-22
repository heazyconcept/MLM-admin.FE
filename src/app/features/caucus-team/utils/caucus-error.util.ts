export function extractCaucusErrorMessage(err: unknown): string {
  const http = err as {
    error?: { message?: string | string[]; code?: string };
    message?: string;
  };
  const code = http?.error?.code;
  const msg = http?.error?.message;
  if (code) {
    const mapped = CAUCUS_ERROR_MESSAGES[code];
    if (mapped) {
      return mapped;
    }
  }
  if (Array.isArray(msg)) {
    return msg.join(', ');
  }
  if (typeof msg === 'string' && msg.trim()) {
    return msg;
  }
  return http?.message ?? 'Request failed';
}

const CAUCUS_ERROR_MESSAGES: Record<string, string> = {
  CAUCUS_USER_NOT_FOUND: 'No member with that username.',
  CAUCUS_NOT_PAID: 'Registration is not paid.',
  CAUCUS_ALREADY_ON_TEAM: 'This username is already on the team.',
  CAUCUS_APPEAL_OPEN: 'An appeal is already waiting.',
  CAUCUS_APPEAL_NOT_ALLOWED: 'Membership is active.',
  CAUCUS_APPEAL_NOT_PENDING: 'This appeal is already closed. Refresh the list.',
  CAUCUS_APPEAL_NOT_FOUND: 'Appeal not found. Refresh the list.',
  CAUCUS_NOT_DEACTIVATED: 'Member is already active. Refresh the member.',
  CAUCUS_NOT_ON_TEAM: 'That user is not on the Caucus Team.',
  CAUCUS_CAR_NOT_QUALIFIED: 'This member is not qualified. Refresh.',
  CAUCUS_REFERRAL_ALREADY_VOIDED: 'That referral is already void.',
  CAUCUS_MONTH_INVALID: 'Invalid month.',
};
