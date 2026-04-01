// ============================================================
// Client Configuration Loader
// public/config.json을 런타임에 로드합니다
// ============================================================

export interface ClientConfig {
  serverHost: string;
  serverPort: number;
  appTitle: string;
}

const DEFAULT_CONFIG: ClientConfig = {
  serverHost: '',      // 빈 문자열이면 상대 경로 사용 (Vite proxy)
  serverPort: 5181,
  appTitle: 'AICraft Figma Viewer',
};

let cachedConfig: ClientConfig | null = null;
let configPromise: Promise<ClientConfig> | null = null;

/**
 * config.json을 로드하고 캐시합니다
 * 여러 번 호출해도 한 번만 fetch합니다
 */
export async function loadConfig(): Promise<ClientConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (configPromise) {
    return configPromise;
  }

  const loadPromise = (async (): Promise<ClientConfig> => {
    try {
      const res = await fetch('/config.json');
      if (!res.ok) {
        console.warn('[Config] Failed to load config.json, using defaults');
        cachedConfig = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
      }
      const json = await res.json();
      const config: ClientConfig = {
        ...DEFAULT_CONFIG,
        ...json,
      };
      cachedConfig = config;
      console.log('[Config] Loaded:', config);
      return config;
    } catch (error) {
      console.warn('[Config] Error loading config.json, using defaults:', error);
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  })();

  configPromise = loadPromise;
  return loadPromise;
}

/**
 * 동기적으로 캐시된 config를 반환합니다
 * loadConfig()가 먼저 호출되어야 합니다
 */
export function getConfig(): ClientConfig {
  if (!cachedConfig) {
    console.warn('[Config] Config not loaded yet, returning defaults');
    return DEFAULT_CONFIG;
  }
  return cachedConfig;
}

/**
 * API Base URL을 반환합니다
 * serverHost가 비어있으면 상대 경로 /api 반환 (Vite proxy용)
 * serverHost가 있으면 http://host:port/api 형식 반환
 */
export function getApiBaseUrl(): string {
  const config = getConfig();
  if (!config.serverHost) {
    return '/api';
  }
  return `http://${config.serverHost}:${config.serverPort}/api`;
}
