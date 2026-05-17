# URL Verification

```http
POST /api/download/verify-url
Content-Type: application/json
```

Validates a URL and returns metadata before processing. No app session is required.

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

Security behavior:

- Only public HTTP(S) URLs are accepted.
- Embedded credentials, loopback, private, link-local, and local-network targets are blocked.
- Direct-file and document verification enforce server-side byte ceilings.
- IP rate limits apply when trusted proxy headers are configured.

Successful responses include `urlType` plus metadata relevant to the source type.
