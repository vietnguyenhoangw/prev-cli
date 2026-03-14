export interface PrevConfig {
  theme: 'light' | 'dark' | 'system'
  contentWidth: 'constrained' | 'full'
  hidden: string[]
  include: string[]
  exclude: string[]
  order: Record<string, string[]>
  port?: number
}

export const defaultConfig: PrevConfig = {
  theme: 'system',
  contentWidth: 'constrained',
  hidden: [],
  include: [],
  exclude: [],
  order: {},
  port: undefined
}

export function validateConfig(raw: unknown): PrevConfig {
  const config = { ...defaultConfig }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>

    if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') {
      config.theme = obj.theme
    }

    if (obj.contentWidth === 'constrained' || obj.contentWidth === 'full') {
      config.contentWidth = obj.contentWidth
    }

    if (Array.isArray(obj.hidden)) {
      config.hidden = obj.hidden.filter((h): h is string => typeof h === 'string')
    }

    if (Array.isArray(obj.include)) {
      config.include = obj.include.filter((i): i is string => typeof i === 'string')
    }

    if (Array.isArray(obj.exclude)) {
      config.exclude = obj.exclude.filter((e): e is string => typeof e === 'string')
    }

    if (obj.order && typeof obj.order === 'object') {
      config.order = {}
      for (const [key, value] of Object.entries(obj.order)) {
        if (Array.isArray(value)) {
          config.order[key] = value.filter((v): v is string => typeof v === 'string')
        }
      }
    }

    if (typeof obj.port === 'number' && obj.port > 0 && obj.port < 65536) {
      config.port = obj.port
    }
  }

  return config
}
