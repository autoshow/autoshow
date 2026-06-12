export const DEFAULT_DOCKER_HOST_PORT = 4321
export const DOCKER_HOST_PORT_ENV = 'AUTOSHOW_DOCKER_HOST_PORT'

type DockerPortSource = 'default' | 'env' | 'auto'

export interface DockerComposeRuntimeEnv {
  accessUrl: string
  composeEnv: Record<string, string>
}

export interface DockerRuntimeConfig extends DockerComposeRuntimeEnv {
  hostPort: number
  portSource: DockerPortSource
}

const normalizeSpawnEnv = (env: NodeJS.ProcessEnv): Record<string, string> => {
  const normalizedEnv: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      normalizedEnv[key] = value
    }
  }

  return normalizedEnv
}

export const parseDockerHostPort = (rawValue: string | undefined): number | undefined => {
  const trimmedValue = rawValue?.trim()

  if (!trimmedValue) {
    return undefined
  }

  const parsedPort = Number(trimmedValue)

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`${DOCKER_HOST_PORT_ENV} must be an integer between 1 and 65535`)
  }

  return parsedPort
}

export const buildDockerComposeEnv = (env: NodeJS.ProcessEnv, hostPort: number): DockerComposeRuntimeEnv => {
  const composeEnv = normalizeSpawnEnv(env)
  composeEnv[DOCKER_HOST_PORT_ENV] = String(hostPort)

  return {
    accessUrl: `http://localhost:${hostPort}`,
    composeEnv,
  }
}

const isPortAvailable = async (port: number): Promise<boolean> => {
  let server: ReturnType<typeof Bun.serve> | undefined

  try {
    server = Bun.serve({
      fetch: () => new Response('ok'),
      hostname: '0.0.0.0',
      port,
    })

    return true
  } catch {
    return false
  } finally {
    server?.stop(true)
  }
}

export const findAvailableDockerHostPort = async (
  startPort: number = DEFAULT_DOCKER_HOST_PORT + 1
): Promise<number> => {
  for (let port = startPort; port <= 65535; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }

  throw new Error('No available host port found for Docker')
}

export const resolveDockerRuntimeConfig = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<DockerRuntimeConfig> => {
  const configuredHostPort = parseDockerHostPort(env[DOCKER_HOST_PORT_ENV])
  let hostPort = configuredHostPort ?? DEFAULT_DOCKER_HOST_PORT
  let portSource: DockerPortSource = configuredHostPort ? 'env' : 'default'

  if (!(await isPortAvailable(hostPort))) {
    if (configuredHostPort) {
      throw new Error(
        `Host port ${hostPort} is already in use. Stop the conflicting process or choose another port with ${DOCKER_HOST_PORT_ENV}=4322 bun as docker up`
      )
    }

    hostPort = await findAvailableDockerHostPort(DEFAULT_DOCKER_HOST_PORT + 1)
    portSource = 'auto'
  }

  return {
    hostPort,
    portSource,
    ...buildDockerComposeEnv(env, hostPort),
  }
}
