import { buildSitemapXmlResponse } from "~/utils/discovery-route-responses"

export async function GET() {
  return await buildSitemapXmlResponse()
}
