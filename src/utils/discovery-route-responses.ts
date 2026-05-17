import type { SQL } from "bun"
import { getDatabase,initializeSchema } from "../database/db"
import { buildAbsoluteUrl,getCanonicalSiteUrl } from "./site-url"

type ShowNoteSitemapEntry = {
  id: string
  lastModifiedAt: number
}

async function getShowNoteSitemapEntries(db: SQL): Promise<ShowNoteSitemapEntry[]> {
  const rows = await db.unsafe(
    `
      SELECT
        id,
        processed_at AS lastModifiedAt
      FROM show_notes
      WHERE deleted_at IS NULL
      ORDER BY processed_at DESC
    `
  ) as Array<{ id: string; lastModifiedAt: number | string | bigint | null }>

  return rows.map(row => ({
    id: row.id,
    lastModifiedAt: Number(row.lastModifiedAt),
  }))
}

const SITEMAP_MARKDOWN_PATH = "/sitemap.md"

const STATIC_SITEMAP_ENTRIES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/llms.txt", changefreq: "weekly", priority: "0.6" },
  { path: SITEMAP_MARKDOWN_PATH, changefreq: "weekly", priority: "0.7" },
] as const

export async function buildSitemapXmlResponse(): Promise<Response> {
  const baseUrl = getCanonicalSiteUrl()
  const nowIso = new Date().toISOString()

  const db = getDatabase()
  await initializeSchema(db)
  const showNotes = await getShowNoteSitemapEntries(db)

  const staticEntries = STATIC_SITEMAP_ENTRIES.map(entry => [
    "  <url>",
    `    <loc>${buildAbsoluteUrl(entry.path, baseUrl)}</loc>`,
    `    <lastmod>${nowIso}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    "  </url>",
  ].join("\n"))

  const showNoteEntries = showNotes.map((entry: ShowNoteSitemapEntry) => [
    "  <url>",
    `    <loc>${buildAbsoluteUrl(`/show-notes/${entry.id}`, baseUrl)}</loc>`,
    `    <lastmod>${new Date(entry.lastModifiedAt).toISOString()}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>0.8</priority>",
    "  </url>",
  ].join("\n"))

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...showNoteEntries,
    "</urlset>",
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
