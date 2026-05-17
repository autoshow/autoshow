import type { SQL } from 'bun'

let transactionQueue: Promise<void> = Promise.resolve()

export async function runImmediateTransaction<T>(
  db: SQL,
  operation: () => Promise<T>
): Promise<T> {
  const previousTransaction = transactionQueue
  let releaseQueue: () => void = () => {}
  transactionQueue = new Promise<void>(resolve => {
    releaseQueue = resolve
  })

  await previousTransaction

  let inTransaction = false

  try {
    await db.unsafe('BEGIN IMMEDIATE')
    inTransaction = true

    const result = await operation()

    await db.unsafe('COMMIT')
    inTransaction = false
    return result
  } catch (error) {
    if (inTransaction) {
      try {
        await db.unsafe('ROLLBACK')
      } catch {}
    }
    throw error
  } finally {
    releaseQueue()
  }
}
