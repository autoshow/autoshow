import { json } from "@solidjs/router"
import { getDatabase,initializeSchema } from "~/database/db"
import { err } from "~/utils/logger/logging"

export async function GET() {
  try {
    let databaseHealthy = false

    try {
      const db = getDatabase()
      await initializeSchema(db)
      databaseHealthy = true
    } catch (error) {
      err("Database check failed", error)
    }

    const allHealthy = databaseHealthy

    return json(
      { status: allHealthy ? "healthy" : "degraded" },
      { status: allHealthy ? 200 : 503 }
    )
  } catch (error) {
    err("Health check failed", error)

    return json(
      { status: "error" },
      { status: 500 }
    )
  }
}
