# Security Rules

## RULE-001: Hardcoded Secret
Severity: Critical

Detect:
- `OPENAI_API_KEY=`
- `sk-`
- `password=`
- `private_key`
- `access_token`
- `secret =`

Fix:
Move secret to environment variable.

---

## RULE-002: PII / Patient Data Logging
Severity: High

Detect:
- `console.log(patient)`
- `logger.info(ssn)`
- `logger.info(phone)`
- `logger.info(email)`
- logging diagnosis, prescription, Aadhaar, phone, email, patient record

Fix:
Remove the log or mask sensitive fields.

---

## RULE-003: Missing Authentication
Severity: High

Detect:
API route returning sensitive patient/user data without auth middleware.

Fix:
Add authentication middleware before returning sensitive data.

---

## RULE-004: Unsafe SQL
Severity: High

Detect:
String concatenation inside SQL query.

Fix:
Use parameterized query.

---

## RULE-005: Wildcard CORS
Severity: Medium

Detect:
`Access-Control-Allow-Origin: *`

Fix:
Restrict allowed origins.

---

## RULE-006: Insecure Cookie
Severity: Medium

Detect:
Cookies without `httpOnly`, `secure`, and `sameSite`.

Fix:
Add secure cookie flags.
