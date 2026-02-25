import * as readline from 'readline'

const RESET = '\x1b[0m'
const errorColor = Bun.color('#ef4444', 'ansi-16m') || ''

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
    console.log(`${errorColor}✗ ${error}${RESET}`)
  }
}

export function validateNotEmpty(input: string): string | null {
  if (input.length === 0) {
    return 'Value cannot be empty'
  }
  return null
}

export function validateUrl(input: string): string | null {
  if (input.length === 0) {
    return 'Value cannot be empty'
  }
  try {
    const url = new URL(input)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'URL must use http or https protocol'
    }
    return null
  } catch {
    return 'Invalid URL format'
  }
}

export function validateSecretLength(input: string): string | null {
  if (input.length === 0) {
    return 'Value cannot be empty'
  }
  if (input.length < 32) {
    return `Secret must be at least 32 characters (got ${input.length})`
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
