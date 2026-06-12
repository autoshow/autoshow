
export const calculateAudioDuration = async (audioPath: string): Promise<number> => {
  try {
    const proc = Bun.spawn(
      ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    const result = await Promise.race([
      new Response(proc.stdout).text(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('ffprobe timeout')), 15_000))
    ])
    const duration = parseFloat(result.trim())
    return isFinite(duration) ? duration : 0
  } catch (error) {
    return 0
  }
}
