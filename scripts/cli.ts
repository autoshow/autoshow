import { showHelp } from "./cli-help"
import { getCliInvocation } from "./cli-argv"
import { renderLines, writeStderr, writeStdout } from "./utils/terminal-output"

const { command, subcommand, forwardedArgs, isTopLevelHelp, isTopLevelVersion } = getCliInvocation()

if (isTopLevelVersion) {
  writeStdout("1.0.0")
  process.exit(0)
}

if (isTopLevelHelp) {
  showHelp()
}

if (command === 'help') {
  showHelp()
} else if (command === 'docker') {
  const { executeDockerCommand } = await import('./docker/docker-commands')
  await executeDockerCommand(subcommand, forwardedArgs)
} else if (command === 'config') {
  const { runConfigCheck } = await import('./config/config-commands')
  await runConfigCheck(subcommand)
} else if (command === 'runner') {
  const { runRunnerCommand } = await import('./test/run')
  await runRunnerCommand(forwardedArgs)
} else {
  const errorMessage = command ? `Unknown command: ${command}` : 'No command provided'
  writeStderr(errorMessage)
  writeStdout(renderLines([
    "Usage: bun as <command> [options]",
    "Available commands: docker, runner, config",
    "Run 'bun as help' for more information.",
  ]))
  process.exit(1)
}
