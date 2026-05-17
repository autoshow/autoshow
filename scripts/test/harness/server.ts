import type { ServerInfo, ServerLogEntry, ServerLogCollector } from "~/types"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { writeStderr } from "../../utils/terminal-output"

const ANSI_REGEX = /\x1b\[[0-9;]*m/g
const EXTERNAL_SERVER_MODE = "external"
const SERVER_HEALTHCHECK_TIMEOUT_MS = 2000

function formatClockTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0")
  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

function formatDurationMs(valueMs: number): string {
  if (valueMs < 1000) {
    return `${valueMs}ms`
  }
  return `${(valueMs / 1000).toFixed(1)}s`
}

function logServerHarness(message: string): void {
  void message
}

function parseEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim()
  if (trimmed.length < 2) return trimmed

  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  const isWrappedInQuotes =
    (first === '"' && last === '"') || (first === "'" && last === "'")

  return isWrappedInQuotes ? trimmed.slice(1, -1) : trimmed
}

function loadEnvFile(): Record<string, string> {
  const envPath = join(process.cwd(), ".env")
  if (!existsSync(envPath)) return {}

  const content = readFileSync(envPath, "utf-8")
  const env: Record<string, string> = {}

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).replace(/^export\s+/, "").trim()
    const value = parseEnvValue(trimmed.slice(eqIndex + 1))
    if (!key) continue
    env[key] = value
  }

  return env
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

type ManagedLogCollector = ServerLogCollector & {
  recordChunk: (stream: ServerLogEntry["stream"], chunk: string) => void
  flushStream: (stream: ServerLogEntry["stream"]) => void
}

function createLogCollector(): ManagedLogCollector {
  const logs: ServerLogEntry[] = []
  const pendingBuffers: Record<ServerLogEntry["stream"], string> = {
    stdout: "",
    stderr: "",
  }

  const pushLine = (stream: ServerLogEntry["stream"], text: string): void => {
    logs.push({
      timestamp: Date.now(),
      stream,
      text,
    })
  }

  const flushPending = (stream: ServerLogEntry["stream"]): void => {
    const pending = pendingBuffers[stream]
    if (!pending) return
    pushLine(stream, pending)
    pendingBuffers[stream] = ""
  }

  return {
    logs,
    getLogsSince(since: number): ServerLogEntry[] {
      return logs.filter((entry: ServerLogEntry) => entry.timestamp >= since)
    },
    getLogsContaining(substring: string): ServerLogEntry[] {
      return logs.filter((entry: ServerLogEntry) => {
        return stripAnsi(entry.text).includes(substring)
      })
    },
    getLogsAsText(since?: number): string {
      const entries = since ? this.getLogsSince(since) : logs
      return entries.map((entry: ServerLogEntry) => {
        const date = new Date(entry.timestamp)
        const timeStr = date.toISOString()
        const prefix = entry.stream === "stderr" ? "[ERR]" : "[OUT]"
        const cleanText = stripAnsi(entry.text)
        return `${timeStr} ${prefix} ${cleanText}`
      }).join("\n")
    },
    getLogsAsTextContaining(substring: string): string {
      return this.getLogsContaining(substring).map((entry: ServerLogEntry) => {
        const date = new Date(entry.timestamp)
        const timeStr = date.toISOString()
        const prefix = entry.stream === "stderr" ? "[ERR]" : "[OUT]"
        const cleanText = stripAnsi(entry.text)
        return `${timeStr} ${prefix} ${cleanText}`
      }).join("\n")
    },
    recordChunk(stream: ServerLogEntry["stream"], chunk: string): void {
      const buffered = pendingBuffers[stream] + chunk
      const normalized = buffered.replace(/\r\n/g, "\n")
      const lines = normalized.split("\n")
      pendingBuffers[stream] = lines.pop() ?? ""
      for (const line of lines) {
        pushLine(stream, line)
      }
    },
    flushStream(stream: ServerLogEntry["stream"]): void {
      flushPending(stream)
    },
  }
}

function isUsingExternalTestServer(): boolean {
  return process.env.TEST_SERVER_MODE === EXTERNAL_SERVER_MODE && !!process.env.BASE_URL
}

function getPortFromBaseUrl(baseUrl: string): number {
  try {
    const url = new URL(baseUrl)
    if (url.port) {
      return Number(url.port)
    }
    return url.protocol === "https:" ? 443 : 80
  } catch {
    return 0
  }
}

export async function stopServer(info: ServerInfo): Promise<void> {
  if (info.ownership === "external" || info.pid <= 0) {
    return
  }

  try {
    process.kill(info.pid, "SIGTERM")
    await Bun.sleep(1000)
    try {
      process.kill(info.pid, 0)
      process.kill(info.pid, "SIGKILL")
    } catch {
    }
  } catch {
  }
}

export async function waitForServerReady(
  baseUrl: string,
  maxAttempts: number = 60
): Promise<boolean> {
  logServerHarness(
    `Waiting for server at ${baseUrl} (health path: ${baseUrl}/api/health, maxAttempts=${maxAttempts})`
  )

  for (let i = 0; i < maxAttempts; i++) {
    const startedAt = Date.now()
    const attempt = i + 1

    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(SERVER_HEALTHCHECK_TIMEOUT_MS),
      })

      const latency = formatDurationMs(Date.now() - startedAt)
      if (response.ok) {
        const data = await response.json()
        if (data.status === "healthy") {
          logServerHarness(`Server is ready on attempt ${attempt}/${maxAttempts} after ${latency}`)
          return true
        }
      }

      if (attempt === 1 || attempt % 5 === 0) {
        logServerHarness(
          `Health check attempt ${attempt}/${maxAttempts} returned HTTP ${response.status} after ${latency}`
        )
      }
    } catch (error) {
      if (attempt === 1 || attempt % 5 === 0) {
        logServerHarness(
          `Health check attempt ${attempt}/${maxAttempts} failed after ${formatDurationMs(Date.now() - startedAt)}: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      if (i < maxAttempts - 1) {
        await Bun.sleep(1000)
      }
    }
  }

  writeStderr(`[server-harness ${formatClockTime()}] Server failed to start after ${maxAttempts} attempts`)
  return false
}

export async function setupTestServer(): Promise<ServerInfo> {
  if (isUsingExternalTestServer()) {
    const baseUrl = process.env.BASE_URL!
    return {
      pid: -1,
      port: getPortFromBaseUrl(baseUrl),
      logCollector: createLogCollector(),
      ownership: "external",
    }
  }

  const buildProc = Bun.spawnSync(["bun", "run", "build"], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
  })
  if (buildProc.exitCode !== 0) {
    const buildStdout = decodeProcessOutput(buildProc.stdout)
    const buildStderr = decodeProcessOutput(buildProc.stderr)
    if (buildStdout) process.stdout.write(buildStdout)
    if (buildStderr) process.stderr.write(buildStderr)
    throw new Error("Failed to build application")
  }

  let port = 4321
  while (true) {
    try {
      const server = Bun.serve({ port, fetch: () => new Response() })
      server.stop(true)
      break
    } catch {
      port++
    }
  }
  const baseUrl = `http://localhost:${port}`

  logServerHarness("Starting managed server process with `bun run start`")
  const logCollector = createLogCollector()
  const envFromFile = loadEnvFile()

  const serverProc = Bun.spawn(["bun", "run", "start"], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envFromFile,
      NODE_ENV: "test",
      PORT: String(port),
      BASE_URL: baseUrl,
      RESEND_API_KEY: "",
    },
  })

  if (serverProc.stdout) {
    const stdoutReader = async () => {
      const reader = serverProc.stdout.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          logCollector.flushStream("stdout")
          break
        }
        const text = decoder.decode(value)
        logCollector.recordChunk("stdout", text)
        process.stdout.write(text)
      }
    }
    stdoutReader().catch(() => {})
  }

  if (serverProc.stderr) {
    const stderrReader = async () => {
      const reader = serverProc.stderr.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          logCollector.flushStream("stderr")
          break
        }
        const text = decoder.decode(value)
        logCollector.recordChunk("stderr", text)
        if (!text.includes("SIGTERM") && !text.includes("SIGKILL")) {
          process.stderr.write(text)
        }
      }
    }
    stderrReader().catch(() => {})
  }

  void serverProc.exited.then((exitCode) => {
    logServerHarness(`Managed server process ${serverProc.pid} exited with code ${exitCode}`)
  }).catch((error) => {
    logServerHarness(
      `Managed server process ${serverProc.pid} exit watcher failed: ${error instanceof Error ? error.message : String(error)}`
    )
  })

  logServerHarness(`Server started with PID: ${serverProc.pid}`)

  return {
    pid: serverProc.pid,
    port,
    logCollector,
    ownership: "managed",
  }
}
