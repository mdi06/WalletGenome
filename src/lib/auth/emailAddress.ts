const EMAIL_MAX_LENGTH = 254;

export type EmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

/**
 * Keep the local part intact. Lower-casing the domain is safe for DNS
 * lookups; lower-casing the local part is not guaranteed by the RFC.
 */
export function normalizeEmailAddress(value: string): string {
  const trimmed = value.trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) return trimmed;
  return `${trimmed.slice(0, atIndex)}@${trimmed.slice(atIndex + 1).toLowerCase()}`;
}

export function validateEmailAddress(value: unknown): EmailValidationResult {
  if (typeof value !== 'string') {
    return { ok: false, message: 'Enter an email address.' };
  }

  const email = normalizeEmailAddress(value);
  if (!email) return { ok: false, message: 'Enter an email address.' };
  if (email.length > EMAIL_MAX_LENGTH) {
    return { ok: false, message: 'Use an email address shorter than 255 characters.' };
  }

  const atIndex = email.lastIndexOf('@');
  const localPart = atIndex > 0 ? email.slice(0, atIndex) : '';
  const domain = atIndex > 0 ? email.slice(atIndex + 1) : '';
  const validLocalPart = localPart.length > 0
    && localPart.length <= 64
    && !/[\s<>()[\],;:]/.test(localPart)
    && !localPart.startsWith('.')
    && !localPart.endsWith('.')
    && !localPart.includes('..');
  const validDomain = domain.length > 0
    && domain.length <= 253
    && domain.includes('.')
    && !domain.startsWith('.')
    && !domain.endsWith('.')
    && !domain.includes('..')
    && domain.split('.').every(label => /^[a-zA-Z0-9-]+$/.test(label) && !label.startsWith('-') && !label.endsWith('-'));

  if (!validLocalPart || !validDomain) {
    return { ok: false, message: 'Check the email address format, for example name@example.com.' };
  }

  return { ok: true, email };
}
