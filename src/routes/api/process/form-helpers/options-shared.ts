export const parseCommaSeparated = (value: string | undefined): string[] => {
  return value ? value.split(',').filter(part => part.length > 0) : []
}
export const MUSIC_SAMPLE_RATES = [16000, 24000, 32000, 44100]
export const MUSIC_BITRATES = [32000, 64000, 128000, 256000]
