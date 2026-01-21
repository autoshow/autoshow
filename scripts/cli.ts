import { parseArgs } from "util"
import { showHelp } from "./cli-help"

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: {
      type: "boolean",
      short: "h"
    },
    version: {
      type: "boolean",
      short: "v"
    }
  },
  strict: false,
  allowPositionals: true
})

if (values.version) {
  console.log("1.0.0")
  process.exit(0)
}

if (values.help) {
  showHelp()
}

const command = positionals[0]
const subcommand = positionals[1]

if (command === 'help') {
  showHelp()
} else if (command === 'build-report') {
  const { analyzeBuild } = await import('./build-report/build-report-commands')
  await analyzeBuild()
} else {
  const { executeDockerCommand } = await import('./docker/docker-commands')
  const shouldPrune = command === 'up' && subcommand === 'prune'
  await executeDockerCommand(command, positionals, shouldPrune)
}