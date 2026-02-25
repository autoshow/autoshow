import type { ServerInfo, ServerLogEntry, ServerLogCollector } from "~/types"
import { existsSync, readFileSync } from "fs"
import { join } from "path"

const ANSI_REGEX = /\x1b\[[0-9;]*m/g

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
    const key = trimmed.slice(0, eqIndex)
    const value = trimmed.slice(eqIndex + 1)
    env[key] = value
  }

  return env
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "")
}

function createLogCollector(): ServerLogCollector {
  const logs: ServerLogEntry[] = []
  
  return {
    logs,
    getLogsSince(since: number): ServerLogEntry[] {
      return logs.filter((entry: ServerLogEntry) => entry.timestamp >= since)
    },
    getLogsAsText(since?: number): string {
      const entries = since ? this.getLogsSince(since) : logs
      return entries.map((entry: ServerLogEntry) => {
        const date = new Date(entry.timestamp)
        const timeStr = date.toISOString()
        const prefix = entry.stream === "stderr" ? "[ERR]" : "[OUT]"
        const cleanText = stripAnsi(entry.text)
        return `${timeStr} ${prefix} ${cleanText}`
      }).join("")
    }
  }
}

export async function stopServer(info: ServerInfo): Promise<void> {
  console.log(`Stopping server process: ${info.pid}`)

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

  console.log("Server stopped")
}

export async function waitForServerReady(
  baseUrl: string,
  maxAttempts: number = 60
): Promise<boolean> {
  console.log(`Waiting for server at ${baseUrl}`)

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.status === "healthy") {
          console.log("Server is ready")
          return true
        }
      }
    } catch {
      if (i < maxAttempts - 1) {
        await Bun.sleep(1000)
      }
    }
  }

  console.error(`Server failed to start after ${maxAttempts} attempts`)
  return false
}

export async function setupTestServer(): Promise<ServerInfo> {
  console.log("Building application...")
  const buildProc = Bun.spawn(["bun", "run", "--bun", "vinxi", "build"], {
    stdout: "inherit",
    stderr: "inherit",
    cwd: process.cwd(),
  })
  const buildExitCode = await buildProc.exited
  if (buildExitCode !== 0) {
    throw new Error("Failed to build application")
  }
  console.log("Build completed successfully")

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
  console.log(`Using port: ${port}`)

  console.log("Starting server...")
  const logCollector = createLogCollector()
  const envFromFile = loadEnvFile()

  const serverProc = Bun.spawn(["bun", "run", "--bun", "vinxi", "start"], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envFromFile,
      PORT: String(port),
    },
  })

  if (serverProc.stdout) {
    const stdoutReader = async () => {
      const reader = serverProc.stdout.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        logCollector.logs.push({
          timestamp: Date.now(),
          stream: "stdout",
          text,
        })
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
        if (done) break
        const text = decoder.decode(value)
        logCollector.logs.push({
          timestamp: Date.now(),
          stream: "stderr",
          text,
        })
        if (!text.includes("SIGTERM") && !text.includes("SIGKILL")) {
          process.stderr.write(text)
        }
      }
    }
    stderrReader().catch(() => {})
  }

  console.log(`Server started with PID: ${serverProc.pid}`)

  return {
    pid: serverProc.pid,
    port,
    logCollector,
  }
}
