# API Tests

API endpoint tests verify health check functionality.

## Outline

- [Running Tests](#running-tests)
  - [All API Tests](#all-api-tests)
  - [Individual Test Suites](#individual-test-suites)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Test Suites](#test-suites)
  - [Health Tests](#health-tests-1-test)

## Running Tests

### All API Tests

```bash
bun test:api
```

### Individual Test Suites

```bash
bun test tests/api/health.test.ts
```

## Prerequisites

These tests run against a running app instance. Start one of:

```bash
bun dev
```

or:

```bash
docker compose -f .github/docker-compose.yml up -d
```

## Environment Variables

| Variable       | Default                          | Description                               |
|----------------|----------------------------------|-------------------------------------------|
| `BASE_URL`     | `http://localhost:4321`          | App URL for local dev or Docker           |
| `DATABASE_URL` | `sqlite://./data/autoshow.db`    | SQLite database URL used by the app       |

## Test Suites

### Health Tests (1 test)

```bash
bun test tests/api/health.test.ts
```

Verifies the health check endpoint returns proper status.
