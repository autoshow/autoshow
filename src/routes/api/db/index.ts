import { getDatabase, initializeSchema } from "~/database/db"
import { err } from "~/utils/logging"

export async function GET() {
  try {
    const db = getDatabase()
    await initializeSchema(db)

    const showNotesRows = await db`SELECT * FROM show_notes ORDER BY processed_at DESC`
    const jobsRows = await db`SELECT * FROM jobs ORDER BY created_at DESC`

    return Response.json({
      showNotes: showNotesRows,
      jobs: jobsRows
    })
  } catch (error) {
    err("Failed to fetch database tables", error)
    return Response.json({ error: "Failed to fetch database" }, { status: 500 })
  }
}
