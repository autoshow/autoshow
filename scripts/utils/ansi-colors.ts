export const RESET = '\x1b[0m'
export const BOLD = '\x1b[1m'
export const successColor = Bun.color('#22c55e', 'ansi-16m') || ''
export const errorColor = Bun.color('#ef4444', 'ansi-16m') || ''
export const dimColor = Bun.color('#6b7280', 'ansi-16m') || ''

export const CHECK = `${successColor}✓${RESET}`
export const CROSS = `${errorColor}✗${RESET}`
