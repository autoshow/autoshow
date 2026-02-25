import { Title } from "@solidjs/meta"
import { For, Show, Suspense, createSignal, createMemo } from "solid-js"
import { createAsync, query } from "@solidjs/router"
import s from "./db.module.css"

type SortConfig = { column: string; direction: 'asc' | 'desc' }

type DbData = {
  showNotes: Record<string, unknown>[]
  jobs: Record<string, unknown>[]
}

const getDbData = query(async (): Promise<DbData> => {
  "use server"
  const { getDatabase, initializeSchema } = await import("~/database/db")
  const db = getDatabase()
  await initializeSchema(db)
  const showNotesRows = await db`SELECT * FROM show_notes ORDER BY processed_at DESC`
  const jobsRows = await db`SELECT * FROM jobs ORDER BY created_at DESC`
  return {
    showNotes: showNotesRows.map((row: Record<string, unknown>) => ({ ...row })),
    jobs: jobsRows.map((row: Record<string, unknown>) => ({ ...row }))
  }
}, "db-data")

export default function DatabaseViewer() {
  const data = createAsync(() => getDbData())
  const [activeTab, setActiveTab] = createSignal<'showNotes' | 'jobs'>('showNotes')
  const [showNotesSort, setShowNotesSort] = createSignal<SortConfig>({ column: 'processed_at', direction: 'desc' })
  const [jobsSort, setJobsSort] = createSignal<SortConfig>({ column: 'created_at', direction: 'desc' })

  const showNotesColumns = createMemo(() => {
    const rows = data()?.showNotes
    if (!rows || rows.length === 0) return []
    const first = rows[0]
    return first ? Object.keys(first) : []
  })

  const jobsColumns = createMemo(() => {
    const rows = data()?.jobs
    if (!rows || rows.length === 0) return []
    const first = rows[0]
    return first ? Object.keys(first) : []
  })

  const sortData = (rows: Record<string, unknown>[], config: SortConfig): Record<string, unknown>[] => {
    return [...rows].sort((a, b) => {
      const aVal = a[config.column]
      const bVal = b[config.column]

      if (aVal === null || aVal === undefined) return config.direction === 'asc' ? -1 : 1
      if (bVal === null || bVal === undefined) return config.direction === 'asc' ? 1 : -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return config.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      if (typeof aVal === 'bigint' && typeof bVal === 'bigint') {
        const diff = aVal - bVal
        return config.direction === 'asc' ? (diff < 0n ? -1 : diff > 0n ? 1 : 0) : (diff > 0n ? -1 : diff < 0n ? 1 : 0)
      }

      const aStr = String(aVal)
      const bStr = String(bVal)
      return config.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }

  const sortedShowNotes = createMemo(() => {
    const rows = data()?.showNotes
    if (!rows) return []
    return sortData(rows, showNotesSort())
  })

  const sortedJobs = createMemo(() => {
    const rows = data()?.jobs
    if (!rows) return []
    return sortData(rows, jobsSort())
  })

  const handleSort = (table: 'showNotes' | 'jobs', column: string) => {
    const setter = table === 'showNotes' ? setShowNotesSort : setJobsSort
    setter(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'bigint') return value.toString()
    if (typeof value === 'object') return JSON.stringify(value)
    const str = String(value)
    return str.length > 100 ? str.slice(0, 100) + '...' : str
  }

  return (
    <main class={s.main}>
      <Title>Database Viewer - Autoshow</Title>
      <div class={s.container}>
        <header class={s.header}>
          <h1 class={s.title}>Database Viewer</h1>
        </header>

        <Suspense fallback={<div class={s.loading}>Loading database...</div>}>
          <Show when={data()}>
            <div class={s.tabs}>
              <button
                class={`${s.tab} ${activeTab() === 'showNotes' ? s.tabActive : ''}`}
                onClick={() => setActiveTab('showNotes')}
              >
                show_notes ({data()?.showNotes?.length || 0})
              </button>
              <button
                class={`${s.tab} ${activeTab() === 'jobs' ? s.tabActive : ''}`}
                onClick={() => setActiveTab('jobs')}
              >
                jobs ({data()?.jobs?.length || 0})
              </button>
            </div>

            <Show when={activeTab() === 'showNotes'}>
              <div class={s.tableInfo}>
                <span>{showNotesColumns().length} columns</span>
                <span>{sortedShowNotes().length} rows</span>
              </div>
              <div class={s.tableWrapper}>
                <table class={s.table}>
                  <thead>
                    <tr>
                      <For each={showNotesColumns()}>
                        {(col) => (
                          <th onClick={() => handleSort('showNotes', col)}>
                            {col}
                            <span class={`${s.sortIndicator} ${showNotesSort().column === col ? s.sortActive : ''}`}>
                              {showNotesSort().column === col ? (showNotesSort().direction === 'desc' ? '▼' : '▲') : '▽'}
                            </span>
                          </th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={sortedShowNotes()}>
                      {(row) => (
                        <tr>
                          <For each={showNotesColumns()}>
                            {(col) => (
                              <td class={row[col] === null ? s.cellNull : ''}>
                                {formatCell(row[col])}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>

            <Show when={activeTab() === 'jobs'}>
              <div class={s.tableInfo}>
                <span>{jobsColumns().length} columns</span>
                <span>{sortedJobs().length} rows</span>
              </div>
              <div class={s.tableWrapper}>
                <table class={s.table}>
                  <thead>
                    <tr>
                      <For each={jobsColumns()}>
                        {(col) => (
                          <th onClick={() => handleSort('jobs', col)}>
                            {col}
                            <span class={`${s.sortIndicator} ${jobsSort().column === col ? s.sortActive : ''}`}>
                              {jobsSort().column === col ? (jobsSort().direction === 'desc' ? '▼' : '▲') : '▽'}
                            </span>
                          </th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={sortedJobs()}>
                      {(row) => (
                        <tr>
                          <For each={jobsColumns()}>
                            {(col) => (
                              <td class={row[col] === null ? s.cellNull : ''}>
                                {formatCell(row[col])}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </Suspense>
      </div>
    </main>
  )
}
