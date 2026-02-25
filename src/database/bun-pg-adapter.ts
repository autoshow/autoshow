import { getDatabase } from './db'

interface QueryResult {
  rows: unknown[]
  rowCount: number
  command: string
  oid: number
  fields: unknown[]
}

interface PoolClient {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>
  release: () => void
}

export interface BunPgPool {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>
  connect: () => Promise<PoolClient>
  end: () => Promise<void>
}

export function createBunPgAdapter(): BunPgPool {
  const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
    const db = getDatabase()
    const result = await db.unsafe(text, params ?? [])
    return {
      rows: result as unknown[],
      rowCount: (result as unknown[]).length,
      command: '',
      oid: 0,
      fields: []
    }
  }

  return {
    query,
    async connect(): Promise<PoolClient> {
      return {
        query,
        release: () => {}
      }
    },
    async end(): Promise<void> {}
  }
}
