import { json } from "@solidjs/router"
import { err } from "../../utils/logging"
import { getDatabase, initializeSchema } from "~/database/db"

export async function GET() {
  const startTime = Date.now()
  
  try {
    const checks = {
      database: false
    }
    
    try {
      const db = getDatabase()
      initializeSchema(db)
      checks.database = true
    } catch (error) {
      err("Database check failed", error)
    }
    
    const allHealthy = checks.database
    const responseTime = Date.now() - startTime
    
    const response = {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env["NODE_ENV"] || "development",
      database: checks.database ? "connected" : "disconnected",
      services: {
        groq: process.env["GROQ_API_KEY"] ? "configured" : "not configured",
        deepinfra: process.env["DEEPINFRA_API_KEY"] ? "configured" : "not configured",
        happyscribe: process.env["HAPPYSCRIBE_API_KEY"] ? "configured" : "not configured",
        openai: process.env["OPENAI_API_KEY"] ? "configured" : "not configured",
        anthropic: process.env["ANTHROPIC_API_KEY"] ? "configured" : "not configured",
        gemini: process.env["GEMINI_API_KEY"] ? "configured" : "not configured"
      },
      responseTime: `${responseTime}ms`
    }
    
    return json(response, {
      status: allHealthy ? 200 : 503
    })
  } catch (error) {
    err("Health check failed", error)
    
    return json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    }, {
      status: 500
    })
  }
}
