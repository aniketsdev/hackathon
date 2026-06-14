# Policy Packs

## Security Pack
- No hardcoded secrets
- No unsafe SQL string concatenation
- No wildcard CORS on sensitive APIs
- Secure cookies must use `httpOnly`, `secure`, and `sameSite`

## Privacy Pack
- Do not log PII
- Mask phone numbers, emails, IDs, and patient data
- Avoid storing sensitive data in plain text

## Healthcare Demo Pack
- Do not log patient data
- Patient export APIs require authentication
- Patient records must not be returned without authorization
- Diagnosis, prescriptions, phone numbers, emails, and IDs should be treated as sensitive

## Compliance Language
Use careful language:

Good:
- "Compliance risk detected"
- "Compliance readiness issue"
- "May expose sensitive data"
- "Requires human review"

Avoid:
- "This is legally HIPAA compliant"
- "Certified GDPR safe"
- "Guaranteed secure"
