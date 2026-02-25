const BOOLEAN_COLUMNS = [
  'tts_enabled',
  'image_gen_enabled',
  'music_gen_enabled',
  'music_gen_instrumental',
  'video_gen_enabled'
] as const

export const normalizeShowNoteRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const normalizedRow: Record<string, unknown> = { ...row }

  for (const column of BOOLEAN_COLUMNS) {
    const value = normalizedRow[column]
    if (value === 0 || value === 1) {
      normalizedRow[column] = Boolean(value)
    }
  }

  return normalizedRow
}
