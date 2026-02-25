# Configuration

Display environment configuration and verify API keys.

## Outline

- [Usage](#usage)
- [What It Shows](#what-it-shows)
- [Environment Variables](#environment-variables)
  - [Database](#database)
  - [Server](#server)
- [Troubleshooting](#troubleshooting)

## Usage

```bash
bun as config
```

## What It Shows

- Environment variables loaded from `.env`
- API key validation status
- Service configurations
- Database paths
- Port settings

## Environment Variables

See `.env.example` for all available configuration options.

### Database

```bash
DATABASE_URL=sqlite://./data/autoshow.db
```

### Server

```bash
PORT=4321
```

## Troubleshooting

If services fail to connect, verify:
1. API keys are valid and not expired
2. Environment variables are properly set in `.env`
3. Docker containers can access environment variables
