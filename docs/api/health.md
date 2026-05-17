# Health Check

Service health endpoint for uptime and dependency status.

## Outline

- [Endpoint](#endpoint)
- [Access](#access)
- [Status Codes](#status-codes)
- [Response](#response)
- [Notes](#notes)

## Endpoint

```text
GET /api/health
```

## Access

Public endpoint (no authentication required).

## Status Codes

- `200` - Healthy
- `503` - Degraded (database connection failed)
- `500` - Internal health-check failure

## Response

```json
{
  "status": "healthy"
}
```

The `status` field is one of `healthy`, `degraded`, or `error`.

- `healthy` (`200`) - Database connection verified.
- `degraded` (`503`) - Database check failed but the server is still running.
- `error` (`500`) - The health-check handler itself threw an unexpected error.

## Notes

- Checks database connectivity by calling `getDatabase()` and `initializeSchema()`.
- Does not test third-party API keys or upstream provider availability.
- Security headers middleware still applies to this API response.
