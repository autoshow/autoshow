#!/usr/bin/env bun

const args = Bun.argv.slice(2)

if (args.length === 0) {
  console.error("Usage: bun e2e [--input <variant>] <path1.json> [path2.json] ...")
  console.error("       bun e2e [--input <variant>] <glob-pattern>")
  console.error("")
  console.error("Options:")
  console.error("  --input <variant>  Input variant(s), comma-separated")
  console.error("                     Audio: 1m-local, 5m-local, 10m-direct, 20m-direct")
  console.error("                     Document: 1p-local, 1p-direct, 3p-local, 10p-direct")
  console.error("")
  console.error("Examples:")
  console.error("  bun e2e tests/test-definitions/transcription/transcription-fal.json")
  console.error("  bun e2e --input 1m-local tests/test-definitions/transcription/transcription-fal.json")
  console.error("  bun e2e --input 1m-local,10m-direct tests/test-definitions/llm/*.json")
  process.exit(1)
}

let inputVariants: string | undefined
const filteredArgs: string[] = []

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--input" && i + 1 < args.length) {
    inputVariants = args[i + 1]
    i++
  } else {
    const arg = args[i]
    if (arg) filteredArgs.push(arg)
  }
}

const paths: string[] = []

for (const arg of filteredArgs) {
  if (arg.includes("*")) {
    const glob = new Bun.Glob(arg)
    const matches = await Array.fromAsync(glob.scan({ cwd: process.cwd() }))
    paths.push(...matches)
  } else if (arg.endsWith(".json")) {
    paths.push(arg)
  }
}

if (paths.length === 0) {
  console.error("No test definition files found matching the given patterns")
  process.exit(1)
}

console.log(`Found ${paths.length} test definition files`)
if (inputVariants) {
  console.log(`Using input variant(s): ${inputVariants}`)
}

const env: Record<string, string> = { ...process.env as Record<string, string>, TEST_PATHS: paths.join(" ") }
if (inputVariants) {
  env.INPUT_VARIANTS = inputVariants
}

const proc = Bun.spawn(["bun", "test", "tests/paths.test.ts"], {
  stdio: ["inherit", "inherit", "inherit"],
  env,
})

const exitCode = await proc.exited
process.exit(exitCode)
