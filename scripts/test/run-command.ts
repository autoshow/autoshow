import { createWriteStream } from "node:fs"
import type { WriteStream } from "node:fs"
import type { ServerLogCollector } from "~/types"

const ANSI_REGEX = /\x1b\[[0-9;]*m/g
const RUNNER_IDLE_HEARTBEAT_MS = Number(process.env.AUTOSHOW_RUNNER_IDLE_HEARTBEAT_MS ?? "15000")

export interface CommandDiagnostics {
  label: string
  baseUrl?: string
  serverLogCollector?: ServerLogCollector
}
export { getTimestampPrefix } from "./timestamp"


export function formatDurationMs(valueMs: number): string {
  if (valueMs < 1000) {
    return `${valueMs}ms`
  }
  return `${(valueMs / 1000).toFixed(1)}s`
}

function logRunner(message: string): void {
  void message
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "")
}

function decodeProcessOutput(
  output: string | Uint8Array | null | undefined
): string {
  if (!output) return ""
  if (typeof output === "string") return output
  return new TextDecoder().decode(output)
}

function quoteShellArg(arg: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(arg)) {
    return arg
  }

  return `'${arg.replace(/'/g, `'\\''`)}'`
}

export function formatCommand(command: string[]): string {
  return command.map((segment) => quoteShellArg(segment)).join(" ")
}

function summarizeSuiteEnv(env: NodeJS.ProcessEnv): string {
  const interestingKeys = [
    "NODE_ENV",
    "TEST_SERVER_MODE",
    "BASE_URL",
    "PLAYWRIGHT_BASE_URL",
    "PLAYWRIGHT_DISABLE_WEBSERVER",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_JUNIT_REPORT",
    "TEST_RUN_OUTPUT_DIR",
    "AUTOSHOW_E2E_CONCURRENCY",
  ]

  return interestingKeys
    .flatMap((key) => env[key] !== undefined ? [`${key}=${env[key]}`] : [])
    .join(", ")
}

async function getHealthStatus(baseUrl: string): Promise<string> {
  const startedAt = Date.now()

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(2000),
    })
    const latency = formatDurationMs(Date.now() - startedAt)
    let bodyStatus = ""

    try {
      const payload = await response.json() as { status?: unknown }
      if (payload.status !== undefined) {
        bodyStatus = `, body.status=${String(payload.status)}`
      }
    } catch {
    }

    return `status=${response.status}${bodyStatus}, latency=${latency}`
  } catch (error) {
    return `unreachable (${error instanceof Error ? error.message : String(error)})`
  }
}

function getProcessState(pid: number): string | undefined {
  if (pid <= 0 || process.platform === "win32") {
    return undefined
  }

  const proc = Bun.spawnSync(["ps", "-p", String(pid), "-o", "pid=,ppid=,etime=,stat=,command="], {
    stdout: "pipe",
    stderr: "pipe",
  })

  if (proc.exitCode !== 0) {
    return undefined
  }

  const output = decodeProcessOutput(proc.stdout).trim()
  return output ? output.replace(/\s+/g, " ") : undefined
}

async function pipeStream(
  stream: ReadableStream<Uint8Array> | null | undefined,
  destination: WriteStream,
  target: NodeJS.WriteStream,
  onChunk?: (text: string) => void
): Promise<void> {
  if (!stream) return

  const reader = stream.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    onChunk?.(text)
    destination.write(text)
    target.write(text)
  }
}

async function buildIdleHeartbeatDetails(
  proc: Bun.Subprocess<any, any, any>,
  label: string,
  startedAt: number,
  silenceMs: number,
  diagnostics?: CommandDiagnostics
): Promise<string[]> {
  const details = [
    `${label} still running after ${formatDurationMs(Date.now() - startedAt)}`,
    `pid=${proc.pid}`,
    `no child output for ${formatDurationMs(silenceMs)}`,
  ]

  const processState = getProcessState(proc.pid)
  if (processState) {
    details.push(`ps=${processState}`)
  }

  if (diagnostics?.baseUrl) {
    details.push(`server health ${await getHealthStatus(diagnostics.baseUrl)}`)
  }

  const latestServerLog = diagnostics?.serverLogCollector?.logs.at(-1)
  if (latestServerLog?.text) {
    const serverLogAge = Date.now() - latestServerLog.timestamp
    const serverLogText = stripAnsi(latestServerLog.text).trim().slice(0, 200)
    if (serverLogText) {
      details.push(
        `last server log ${formatDurationMs(serverLogAge)} ago (${latestServerLog.stream}): ${serverLogText}`
      )
    }
  }

  return details
}

function createIdleHeartbeat(
  proc: Bun.Subprocess<any, any, any>,
  label: string,
  startedAt: number,
  getLastOutputAt: () => number,
  diagnostics?: CommandDiagnostics
): ReturnType<typeof setInterval> | undefined {
  if (RUNNER_IDLE_HEARTBEAT_MS <= 0) {
    return undefined
  }

  let idleProbeInFlight = false
  const idleInterval = setInterval(() => {
    const silenceMs = Date.now() - getLastOutputAt()
    if (silenceMs < RUNNER_IDLE_HEARTBEAT_MS || idleProbeInFlight) {
      return
    }

    idleProbeInFlight = true
    void (async () => {
      logRunner((await buildIdleHeartbeatDetails(proc, label, startedAt, silenceMs, diagnostics)).join("; "))
    })().finally(() => {
      idleProbeInFlight = false
    })
  }, RUNNER_IDLE_HEARTBEAT_MS)

  if (typeof idleInterval.unref === "function") {
    idleInterval.unref()
  }

  return idleInterval
}

export async function runCommand(
  command: string[],
  env: NodeJS.ProcessEnv,
  logPath: string,
  diagnostics?: CommandDiagnostics
): Promise<number> {
  const label = diagnostics?.label ?? command[0] ?? "command"
  const commandText = formatCommand(command)
  const envSummary = summarizeSuiteEnv(env)
  logRunner(`Launching ${label}: ${commandText}`)
  if (envSummary) {
    logRunner(`${label} env: ${envSummary}`)
  }

  const logStream = createWriteStream(logPath, { flags: "a" })
  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    env,
    stdout: "pipe",
    stderr: "pipe",
  })
  const startedAt = Date.now()
  let lastOutputAt = startedAt

  logRunner(`${label} started with pid=${proc.pid}; log=${logPath}`)
  const idleInterval = createIdleHeartbeat(proc, label, startedAt, () => lastOutputAt, diagnostics)

  try {
    await Promise.all([
      pipeStream(proc.stdout, logStream, process.stdout, () => {
        lastOutputAt = Date.now()
      }),
      pipeStream(proc.stderr, logStream, process.stderr, () => {
        lastOutputAt = Date.now()
      }),
    ])
    const exitCode = await proc.exited
    logRunner(`${label} exited with code ${exitCode} after ${formatDurationMs(Date.now() - startedAt)}`)
    return exitCode
  } finally {
    if (idleInterval) {
      clearInterval(idleInterval)
    }
    logStream.end()
  }
}

export async function runCommandPassthrough(
  command: string[],
  env: NodeJS.ProcessEnv,
  label?: string
): Promise<number> {
  const commandLabel = label ?? command[0] ?? "command"
  const startedAt = Date.now()
  logRunner(`Launching ${commandLabel}: ${formatCommand(command)}`)

  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    env,
    stdio: ["inherit", "inherit", "inherit"],
  })
  logRunner(`${commandLabel} started with pid=${proc.pid}`)

  const exitCode = await proc.exited
  logRunner(`${commandLabel} exited with code ${exitCode} after ${formatDurationMs(Date.now() - startedAt)}`)
  return exitCode
}
