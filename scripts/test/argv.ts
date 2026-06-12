export function getRunnerCliArgs(argv: string[] = process.argv): string[] {
  return argv.slice(2)
}
