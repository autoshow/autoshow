import { json } from "@solidjs/router"
import { fetchAllModels } from './fetch-models'
import { err } from '~/utils/logging'

export async function GET() {
  try {
    const response = await fetchAllModels()
    return json(response)
  } catch (error) {
    err('Failed to fetch models', error)
    return json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
