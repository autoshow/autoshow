# Health Check

Monitor application health and service availability.

## Endpoint

```
GET /api/health
```

## Description

Checks database connectivity, service configuration status, and system health. Used for monitoring and load balancer health checks.

## Request

No parameters required.

## Response

**Status Codes:**
- `200` - All systems healthy
- `503` - Service degraded (database unavailable)
- `500` - Health check failed

**Success Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "database": "connected",
  "services": {
    "groq": "configured",
    "deepinfra": "configured",
    "happyscribe": "configured",
    "openai": "configured"
  },
  "responseTime": "15ms"
}
```

**Degraded Response (503):**

```json
{
  "status": "degraded",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "database": "disconnected",
  "services": {
    "groq": "configured",
    "deepinfra": "configured",
    "happyscribe": "not configured",
    "openai": "configured"
  },
  "responseTime": "20ms"
}
```

**Error Response (500):**

```json
{
  "status": "error",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "error": "Database connection failed"
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall health status: `healthy`, `degraded`, or `error` |
| `timestamp` | string | ISO 8601 timestamp of the check |
| `uptime` | number | Server uptime in seconds |
| `environment` | string | Current environment (`development`, `production`, etc.) |
| `database` | string | Database connection status: `connected` or `disconnected` |
| `services` | object | Configuration status for external services |
| `services.groq` | string | Groq API key status |
| `services.deepinfra` | string | DeepInfra API key status |
| `services.happyscribe` | string | HappyScribe API key status |
| `services.openai` | string | OpenAI API key status |
| `responseTime` | string | Time taken to complete health check |

## Example

```bash
curl http://localhost:4321/api/health
```

## Notes

- Check runs synchronously and blocks until complete
- Database check includes schema initialization
- Service status only indicates API key presence, not validity
- Suitable for automated monitoring and alerting systems
