const errorColor = Bun.color('#ef4444', 'ansi-16m') || ''
const RESET = '\x1b[0m'

export async function runConfigCheck(subcommand?: string): Promise<void> {
  if (subcommand) {
    console.error(`${errorColor}Unknown config subcommand: ${subcommand}${RESET}`)
    console.log('No config subcommands are currently available.')
    process.exit(1)
  }

  console.log('No config checks are currently configured.')
}
