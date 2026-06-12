export interface CliInvocation {
  command?: string | undefined
  subcommand?: string | undefined
  forwardedArgs: string[]
  isTopLevelHelp: boolean
  isTopLevelVersion: boolean
}

export function getCliInvocation(argv: string[] = Bun.argv): CliInvocation {
  const rawArgs = argv.slice(2)
  const command = rawArgs[0]
  const forwardedArgs = rawArgs.slice(1)

  return {
    command,
    subcommand: forwardedArgs[0],
    forwardedArgs,
    isTopLevelHelp: command === "--help" || command === "-h",
    isTopLevelVersion: command === "--version" || command === "-v",
  }
}
