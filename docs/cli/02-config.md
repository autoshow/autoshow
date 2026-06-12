# Configuration Checks

The config commands in `scripts/config/` validate optional email and Google Drive setup. They read current values from `process.env`, optionally update the repo-root `.env` file, and exit non-zero when selected configuration remains incomplete.

## Usage

```bash
bun as config
bun as config resend
bun as config google-drive
```

## Subcommands

- `config resend` validates `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_ADMIN_EMAIL`. It can also check SPF and DKIM DNS records with `dig`.
- `config google-drive` validates Google Drive import credentials, uses `gcloud` to enable the Drive and Picker APIs when confirmed, creates or updates a restricted browser API key when possible, and prints Google Cloud Console steps for OAuth client setup.
- `config` runs the currently supported config checks.

## Relevant Variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender address used for outgoing mail |
| `RESEND_ADMIN_EMAIL` | Address used for admin notifications |
| `DATABASE_URL` | Optional runtime database override; defaults to SQLite when unset |
| `AUTOSHOW_TRUST_PROXY_HEADERS` | Trust forwarded proxy IP headers when set to `1` |
| `AUTOSHOW_TRUSTED_PROXY_TOKEN` | Shared token required before proxy headers are trusted |
| `VITE_GOOGLE_DRIVE_CLIENT_ID` | Browser OAuth client ID for the Google Picker |
| `VITE_GOOGLE_DRIVE_API_KEY` | Browser API key restricted to Google Picker API HTTP referrers |
| `GOOGLE_DRIVE_CLIENT_ID` | Server-side OAuth client ID used to verify Drive access tokens |

## Example `.env` Snippet

```dotenv
DATABASE_URL=sqlite://./data/autoshow.sqlite
AUTOSHOW_TRUST_PROXY_HEADERS=0
AUTOSHOW_TRUSTED_PROXY_TOKEN=
RESEND_API_KEY=re_example
RESEND_FROM_EMAIL=AutoShow <hello@example.com>
RESEND_ADMIN_EMAIL=admin@example.com
VITE_GOOGLE_DRIVE_CLIENT_ID=123-example.apps.googleusercontent.com
VITE_GOOGLE_DRIVE_API_KEY=AIza_example
GOOGLE_DRIVE_CLIENT_ID=123-example.apps.googleusercontent.com
```

Google Drive OAuth client setup remains manual because the web client flow is not reliably covered by `gcloud`.
