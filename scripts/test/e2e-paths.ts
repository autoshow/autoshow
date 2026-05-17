import { existsSync, statSync } from "node:fs"
import { walkJsonFiles } from "./harness/definitions"

const GLOB_MAGIC = ["*", "?", "[", "{"] as const

function hasGlobMagic(path: string): boolean {
  return GLOB_MAGIC.some(char => path.includes(char))
}

export async function resolveTestDefinitionPaths(args: string[]): Promise<string[]> {
  const paths = new Set<string>()

  for (const arg of args) {
    if (hasGlobMagic(arg)) {
      const glob = new Bun.Glob(arg)
      const matches = await Array.fromAsync(glob.scan({ cwd: process.cwd() }))
      for (const match of matches) {
        if (match.endsWith(".json")) {
          paths.add(match)
        }
      }
      continue
    }

    if (!existsSync(arg)) {
      continue
    }

    const stat = statSync(arg)
    if (stat.isDirectory()) {
      for (const path of walkJsonFiles(arg)) {
        paths.add(path)
      }
      continue
    }

    if (stat.isFile() && arg.endsWith(".json")) {
      paths.add(arg)
    }
  }

  return [...paths].sort((a, b) => a.localeCompare(b))
}
