const SECRET_ASSIGNMENT =
  /\b(api[_-]?key|access[_-]?token|private[_-]?key|password)\s*=\s*(["'])([^"']+)\2/gi;
const OPENAI_STYLE_KEY = /\bsk-[A-Za-z0-9_-]{8,}\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\b(?:\+?\d[\d -]{7,}\d)\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const AADHAAR = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const QUOTED_PATIENT_VALUE =
  /\b(name|patientName|diagnosis|prescription|dob|ssn|phone|email)\s*:\s*(["'])([^"']+)\2/gi;
const QUOTED_PERSON_NAME = /(["'])([A-Z][a-z]+ [A-Z][a-z]+)\1/g;

export type RedactionResult = {
  value: string;
  masked: boolean;
};

export function redactSensitiveText(input: string): RedactionResult {
  let masked = false;
  let value = input;

  const replace = (next: string) => {
    if (next !== value) masked = true;
    value = next;
  };

  replace(value.replace(SECRET_ASSIGNMENT, (_match, key: string, quote: string) => `${key} = ${quote}[REDACTED_SECRET]${quote}`));
  replace(value.replace(OPENAI_STYLE_KEY, "sk-[REDACTED]"));
  replace(value.replace(EMAIL, "[REDACTED_EMAIL]"));
  replace(value.replace(SSN, "[REDACTED_SSN]"));
  replace(value.replace(AADHAAR, "[REDACTED_ID]"));
  replace(value.replace(QUOTED_PERSON_NAME, (_match, quote: string) => `${quote}[REDACTED_NAME]${quote}`));
  replace(value.replace(PHONE, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 9 ? "[REDACTED_PHONE]" : match;
  }));
  replace(value.replace(QUOTED_PATIENT_VALUE, (_match, key: string, quote: string) => `${key}: ${quote}[REDACTED_PHI]${quote}`));

  return { value, masked };
}

export function redactEvidence(input: string): RedactionResult {
  const { value, masked } = redactSensitiveText(input.trim());
  return {
    value: value.length > 240 ? `${value.slice(0, 237)}...` : value,
    masked
  };
}
