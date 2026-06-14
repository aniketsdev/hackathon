# Contract: GitHub PR Webhook Comments

## POST /api/github/repositories

Adds or enables a repository for ComplyPatch AI PR review.

### Request

```json
{
  "repositoryFullName": "owner/repo",
  "repositoryUrl": "https://github.com/owner/repo",
  "installationId": 123456
}
```

`repositoryFullName` or `repositoryUrl` may be supplied. The backend normalizes either value to `owner/repo`. Repository identity is request-driven and is not read from fixed `GITHUB_OWNER` or `GITHUB_REPO` environment variables.

### Responses

`201 Created`:

```json
{
  "repositoryFullName": "owner/repo",
  "connectionStatus": "connected",
  "permissionsStatus": "read_write"
}
```

`400 Bad Request`:

```json
{
  "message": "Repository could not be connected"
}
```

## POST /api/github/webhook

Receives GitHub webhook deliveries.

### Required Headers

- `X-GitHub-Delivery`: Unique GitHub delivery id.
- `X-GitHub-Event`: GitHub event name.
- `X-Hub-Signature-256`: HMAC-SHA256 signature using the configured webhook secret.
- `Content-Type`: `application/json`.

### Supported Events

| Event | Actions | Behavior |
| --- | --- | --- |
| `ping` | any | Acknowledge setup, do not scan |
| `pull_request` | `opened`, `reopened`, `synchronize`, `ready_for_review` | Accept for scan processing when repository is connected |
| any other event | any | Acknowledge as ignored, do not scan |

### Pull Request Payload Fields Used

```json
{
  "action": "synchronize",
  "repository": {
    "full_name": "owner/repo",
    "owner": { "login": "owner" },
    "name": "repo"
  },
  "installation": {
    "id": 123456
  },
  "pull_request": {
    "number": 12,
    "head": {
      "sha": "commit-sha"
    }
  }
}
```

### Responses

`202 Accepted` for a supported PR delivery accepted for processing:

```json
{
  "deliveryId": "github-delivery-guid",
  "status": "processing",
  "message": "Pull request scan accepted"
}
```

`200 OK` for `ping` or unsupported events:

```json
{
  "deliveryId": "github-delivery-guid",
  "status": "ignored",
  "message": "Event acknowledged without scan"
}
```

`400 Bad Request` for malformed payloads or missing required non-secret headers:

```json
{
  "deliveryId": "github-delivery-guid",
  "status": "rejected",
  "message": "Missing required pull request data"
}
```

`401 Unauthorized` for invalid or missing signature:

```json
{
  "status": "rejected",
  "message": "Invalid webhook signature"
}
```

`403 Forbidden` for a repository that is not connected or allowed:

```json
{
  "deliveryId": "github-delivery-guid",
  "status": "rejected",
  "message": "Repository is not connected"
}
```

`503 Service Unavailable` when live webhook verification is not configured:

```json
{
  "status": "rejected",
  "message": "Webhook receiver is not configured"
}
```

## GET /api/github/operations/{delivery_id}

Returns local operation status for a received delivery.

### Response

`200 OK`:

```json
{
  "delivery": {
    "deliveryId": "github-delivery-guid",
    "event": "pull_request",
    "action": "synchronize",
    "repository": "owner/repo",
    "pullRequestNumber": 12,
    "headSha": "commit-sha",
    "status": "completed"
  },
  "scan": {
    "score": 47,
    "summary": "ComplyPatch AI detected 3 compliance/security finding(s).",
    "findings": [],
    "prComment": "## ComplyPatch AI Review..."
  },
  "outbound": {
    "mode": "preview",
    "status": "not_configured",
    "commentUrl": null,
    "failureReason": null
  },
  "skippedFiles": []
}
```

`404 Not Found`:

```json
{
  "message": "Delivery not found"
}
```

## Outbound GitHub Comment Behavior

- Use one PR timeline comment for the full ComplyPatch report.
- Include a hidden marker containing the head SHA so the comment can be updated instead of duplicated.
- If posting is disabled or unauthorized, preserve the generated markdown comment in the operation response.
- Sanitized errors may mention status codes and permission problems, but must not include access tokens, app keys, webhook secrets, or full sensitive payloads.
