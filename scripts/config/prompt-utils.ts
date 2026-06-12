import * as readline from 'readline'
import { RESET, errorColor } from '../utils/ansi-colors'
import { writeStdout } from '../utils/terminal-output'

export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question + ' ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]'
  const answer = await prompt(`${question} ${hint}`)
  if (answer === '') return defaultYes
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

export async function promptWithValidation(
  question: string,
  validate: (input: string) => string | null
): Promise<string> {
  while (true) {
    const answer = await prompt(question)
    const error = validate(answer)
    if (error === null) {
      return answer
    }
    writeStdout(`${errorColor}✗ ${error}${RESET}`)
  }
}

export function validateResendApiKey(input: string): string | null {
  if (input.length === 0) {
    return 'Value cannot be empty'
  }
  if (!input.startsWith('re_')) {
    return 'API key must start with re_'
  }
  return null
}

export function validateFromEmail(input: string): string | null {
  if (input.length === 0) {
    return 'Value cannot be empty'
  }
  const pattern = /^(?:.+\s)?<?[\w.-]+@[\w.-]+\.\w+>?$/
  if (!pattern.test(input)) {
    return 'Invalid format. Use "Name <email@domain>" or "email@domain"'
  }
  return null
}

export function validateEmail(input: string): string | null {
  if (input.length === 0) {
    return 'Value cannot be empty'
  }
  const pattern = /^[\w.-]+@[\w.-]+\.\w+$/
  if (!pattern.test(input)) {
    return 'Invalid email format'
  }
  return null
}
