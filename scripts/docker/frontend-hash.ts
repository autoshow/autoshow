import { l } from '../../src/utils/logging'

const CACHE_DIR = '.cache/frontend-build'
const HASH_FILE = `${CACHE_DIR}/hash`
const CACHED_OUTPUT_DIR = `${CACHE_DIR}/output`

const FRONTEND_PATTERNS = [
  'src/app.tsx',
  'src/app.css',
  'src/entry-client.tsx',
  'src/entry-server.tsx',
  'src/routes/(home)/**/*',
  'src/routes/(404)/**/*',
  'src/routes/create/**/*',
  'src/routes/show-notes/**/*',
  'src/types/**/*',
  'src/utils/**/*',
  'src/prompts/prompt-metadata.ts',
  'app.config.ts',
  'package.json',
  'bun.lock',
]

const getFrontendFiles = async (): Promise<string[]> => {
  const files: string[] = []

  for (const pattern of FRONTEND_PATTERNS) {
    const patternGlob = new Bun.Glob(pattern)
    for await (const file of patternGlob.scan({ cwd: '.', absolute: false })) {
      if (!file.includes('.DS_Store')) {
        files.push(file)
      }
    }
  }

  return files.sort()
}

export const getFrontendHash = async (): Promise<string> => {
  const files = await getFrontendFiles()
  const hasher = new Bun.CryptoHasher('sha256')

  for (const file of files) {
    const content = await Bun.file(file).arrayBuffer()
    hasher.update(file)
    hasher.update(new Uint8Array(content))
  }

  return hasher.digest('hex').slice(0, 16)
}

export const getCachedHash = async (): Promise<string | null> => {
  const hashFile = Bun.file(HASH_FILE)
  if (await hashFile.exists()) {
    return (await hashFile.text()).trim()
  }
  return null
}

export const saveFrontendCache = async (hash: string): Promise<void> => {
  const outputExists = await Bun.file('.output/server/index.mjs').exists()
  if (!outputExists) {
    return
  }
  await Bun.$`mkdir -p ${CACHE_DIR}`.quiet()
  await Bun.$`rm -rf ${CACHED_OUTPUT_DIR}`.quiet()
  await Bun.$`cp -r .output ${CACHED_OUTPUT_DIR}`.quiet()
  await Bun.write(HASH_FILE, hash)
  l(`  Frontend build cached (hash: ${hash})`)
}

export const restoreFrontendCache = async (): Promise<void> => {
  await Bun.$`rm -rf .output`.quiet()
  await Bun.$`cp -r ${CACHED_OUTPUT_DIR} .output`.quiet()
}

export const clearFrontendCache = async (): Promise<void> => {
  await Bun.$`rm -rf ${CACHE_DIR}`.nothrow().quiet()
}

export const checkFrontendCache = async (): Promise<{ skipBuild: boolean; hash: string }> => {
  const currentHash = await getFrontendHash()
  const cachedHash = await getCachedHash()

  if (cachedHash && cachedHash === currentHash) {
    l(`  Frontend hash: ${currentHash} (cache hit)`)
    return { skipBuild: true, hash: currentHash }
  }

  if (cachedHash) {
    l(`  Frontend hash: ${currentHash} (cache miss - was ${cachedHash})`)
  } else {
    l(`  Frontend hash: ${currentHash} (no cache)`)
  }

  return { skipBuild: false, hash: currentHash }
}
