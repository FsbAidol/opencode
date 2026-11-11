/**
 * Configuration & State Management for Gwarden AI Mod
 */

import os from "node:os"
import path from "node:path"
import { existsSync } from "node:fs"
import { readFile, writeFile, rename, mkdir } from "node:fs/promises"
import { DEFAULT_BASE_URL, PRESET_MODELS, PROVIDER_ID, PROVIDER_NAME } from "./models.js"

export const CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR
  ? path.resolve(process.env.OPENCODE_CONFIG_DIR)
  : path.join(os.homedir(), ".config", "opencode")

export const STORE_PATH = path.join(CONFIG_DIR, "gwarden.json")
export const GLOBAL_OPENCODE_JSON = path.join(CONFIG_DIR, "opencode.json")
export const LOCAL_OPENCODE_JSON = path.resolve(process.cwd(), "opencode.json")

/**
 * Masks an API key for safe terminal/log display.
 */
export function maskKey(key) {
  if (!key) return "(не задан)"
  const trimmed = String(key).trim()
  if (trimmed.length <= 8) return "****"
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`
}

/**
 * Reads the persistent mod store (~/.config/opencode/gwarden.json).
 */
export async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf8")
    const parsed = JSON.parse(raw)
    return {
      apiKey: parsed.apiKey || process.env.GWARDEN_API_KEY || "",
      baseURL: parsed.baseURL || DEFAULT_BASE_URL,
      activeModel: parsed.activeModel || "deepseek-v4-flash",
      models: Array.isArray(parsed.models) && parsed.models.length > 0
        ? parsed.models
        : ["deepseek-v4-flash", "gemini-4-argon"],
      customModels: parsed.customModels && typeof parsed.customModels === "object"
        ? parsed.customModels
        : {},
      catalog: parsed.catalog && typeof parsed.catalog === "object"
        ? parsed.catalog
        : {},
      lastUpdated: parsed.lastUpdated || 0,
    }
  } catch {
    return {
      apiKey: process.env.GWARDEN_API_KEY || "",
      baseURL: DEFAULT_BASE_URL,
      activeModel: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "gemini-4-argon"],
      customModels: {},
      catalog: {},
      lastUpdated: 0,
    }
  }
}

/**
 * Atomically writes to ~/.config/opencode/gwarden.json.
 */
export async function writeStore(store) {
  await mkdir(CONFIG_DIR, { recursive: true })
  const tmp = `${STORE_PATH}.tmp`
  const data = {
    ...store,
    lastUpdated: Date.now(),
  }
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8")
  await rename(tmp, STORE_PATH)
  return data
}

/**
 * Generates OpenCode config JSON structure compatible with both v1 and v2 schemas.
 */
export function generateOpenCodeConfig(store, existingConfig = {}) {
  const apiKey = store.apiKey ? store.apiKey : "{env:GWARDEN_API_KEY}"
  const baseURL = store.baseURL || DEFAULT_BASE_URL
  const activeModel = store.activeModel || "deepseek-v4-flash"

  const modelsList = Array.from(new Set([
    "deepseek-v4-flash",
    "gemini-4-argon",
    ...(store.models || []),
    ...(Object.keys(store.customModels || {})),
  ]))

  // Models object for provider config
  const providerModels = {}
  for (const mId of modelsList) {
    const preset = PRESET_MODELS[mId] || store.customModels?.[mId] || {}
    const name = preset.name || store.catalog?.[mId] || mId
    const context = preset.limit?.context || 1048576
    const output = preset.limit?.output || 32768

    providerModels[mId] = {
      name,
      limit: {
        context,
        output,
      },
    }
  }

  // Preserve existing providers if any
  const existingProvider = existingConfig.provider && typeof existingConfig.provider === "object"
    ? existingConfig.provider
    : {}
  const existingProviders = existingConfig.providers && typeof existingConfig.providers === "object"
    ? existingConfig.providers
    : {}

  return {
    $schema: "https://opencode.ai/config.json",
    ...existingConfig,
    model: `${PROVIDER_ID}/${activeModel}`,
    provider: {
      ...existingProvider,
      [PROVIDER_ID]: {
        npm: "@ai-sdk/openai-compatible",
        name: PROVIDER_NAME,
        options: {
          baseURL,
          apiKey,
        },
        models: providerModels,
      },
    },
    providers: {
      ...existingProviders,
      [PROVIDER_ID]: {
        name: PROVIDER_NAME,
        package: "@opencode/ai/providers/openai-compatible",
        settings: {
          baseURL,
          apiKey,
        },
        models: providerModels,
      },
    },
  }
}

/**
 * Updates an opencode.json file at a given path.
 */
export async function writeOpenCodeConfigFile(filePath, store) {
  let existing = {}
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(await readFile(filePath, "utf8"))
    } catch {
      existing = {}
    }
  }

  const updated = generateOpenCodeConfig(store, existing)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(updated, null, 2), "utf8")
  return updated
}

/**
 * Updates both global and local opencode.json files if applicable.
 */
export async function syncOpenCodeConfigs(store, { writeLocal = true, writeGlobal = true } = {}) {
  const results = { global: false, local: false }

  if (writeGlobal) {
    try {
      await writeOpenCodeConfigFile(GLOBAL_OPENCODE_JSON, store)
      results.global = true
    } catch (err) {
      console.error(`Ошибка записи глобального конфига ${GLOBAL_OPENCODE_JSON}:`, err.message)
    }
  }

  if (writeLocal) {
    try {
      await writeOpenCodeConfigFile(LOCAL_OPENCODE_JSON, store)
      results.local = true
    } catch (err) {
      console.error(`Ошибка записи локального конфига ${LOCAL_OPENCODE_JSON}:`, err.message)
    }
  }

  return results
}
