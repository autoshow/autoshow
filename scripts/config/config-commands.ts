import { checkResend } from './check-resend'
import { checkGoogleDrive } from './check-google-drive'
import { RESET, successColor, errorColor } from '../utils/ansi-colors'
import { writeStderr, writeStdout } from '../utils/terminal-output'

export async function runConfigCheck(subcommand?: string): Promise<void> {
  if (subcommand === 'resend') {
    const passed = await checkResend()
    if (!passed) {
      process.exit(1)
    }
    return
  }

  if (subcommand === 'google-drive') {
    const passed = await checkGoogleDrive()
    if (!passed) {
      process.exit(1)
    }
    return
  }

  if (subcommand) {
    writeStderr(`${errorColor}Unknown config subcommand: ${subcommand}${RESET}`)
    writeStdout('Available: resend, google-drive')
    process.exit(1)
  }

  const results = {
    resend: await checkResend()
  }

  const failed = Object.values(results).filter(r => !r).length

  writeStdout('')

  if (failed > 0) {
    writeStderr(`${errorColor}${failed} of 1 configurations incomplete.${RESET}`)
    process.exit(1)
  }

  writeStdout(`${successColor}✓ All configurations complete.${RESET}`)
}
