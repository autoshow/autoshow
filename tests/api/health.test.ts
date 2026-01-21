import { test, expect, describe } from "bun:test"

const BASE_URL = process.env.BASE_URL || "http://localhost:4321"

describe("health endpoint", () => {
  test("returns healthy status", async () => {
    const response = await fetch(`${BASE_URL}/api/health`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("healthy")
  })
})
