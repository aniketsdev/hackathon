# Evals

## Evaluation Goal
Check whether ComplyPatch AI correctly detects high-risk security and privacy patterns in code changes.

## Test Cases

### Case 1: Hardcoded Secret
Input:
```ts
const apiKey = "sk-demo-hardcoded-key";
```
Expected:
- Rule: RULE-001
- Severity: Critical

### Case 2: PII Logging
Input:
```ts
console.log("Patient data", patient);
```
Expected:
- Rule: RULE-002
- Severity: High

### Case 3: Missing Auth
Input:
```ts
export async function GET(req: Request) {
  return Response.json(patient);
}
```
Expected:
- Rule: RULE-003
- Severity: High

### Case 4: Unsafe SQL
Input:
```ts
const query = "SELECT * FROM users WHERE id = " + userId;
```
Expected:
- Rule: RULE-004
- Severity: High

### Case 5: Wildcard CORS
Input:
```ts
"Access-Control-Allow-Origin": "*"
```
Expected:
- Rule: RULE-005
- Severity: Medium

### Case 6: Insecure Cookie
Input:
```ts
cookies().set("session", token)
```
Expected:
- Rule: RULE-006
- Severity: Medium

## Demo Success Criteria
- Finds at least 4 issues in the demo file
- Produces score below 70 for vulnerable code
- Produces a clear PR comment
- Runs without live GitHub dependency
