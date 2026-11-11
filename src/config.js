/**
 * Configuration & State Management for Gwarden AI Mod (2 Models Only)
 */

import os from "node:os"
import path from "node:path"
import { existsSync } from "node:fs"
import { readFile, writeFile, rename, mkdir } from "node:fs/promises"
import {
  DEFAULT_BASE_URL,
  DEFAULT_API_KEY,
  PRESET_MODELS,
  PROVIDER_ID,
  PROVIDER_NAME,
} from "./models.js"

export const CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR
  ? path.resolve(process.env.OPENCODE_CONFIG_DIR)
  : path.join(os.homedir(), ".config", "opencode")

export const STORE_PATH = path.join(CONFIG_DIR, "gwarden.json")
export const GLOBAL_OPENCODE_JSON = path.join(CONFIG_DIR, "opencode.json")
export const LOCAL_OPENCODE_JSON = path.resolve(process.cwd(), "opencode.json")

/**
 * Masks an API key for safe display.
 */
export function maskKey(key) {
  if (!key) return "(не задан)"
  const trimmed = String(key).trim()
  if (trimmed.length <= 12) return "****"
  return `${trimmed.slice(0, 9)}...${trimmed.slice(-8)}`
}

/**
 * Reads the persistent mod store (~/.config/opencode/gwarden.json).
 */
export async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf8")
    const parsed = JSON.parse(raw)
    return {
      apiKey: parsed.apiKey || process.env.GWARDEN_API_KEY || DEFAULT_API_KEY,
      baseURL: parsed.baseURL || DEFAULT_BASE_URL,
      activeModel: parsed.activeModel === "gemini-4-argon" ? "gemini-4-argon" : "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "gemini-4-argon"],
      lastUpdated: parsed.lastUpdated || 0,
    }
  } catch {
    return {
      apiKey: process.env.GWARDEN_API_KEY || DEFAULT_API_KEY,
      baseURL: DEFAULT_BASE_URL,
      activeModel: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "gemini-4-argon"],
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
    apiKey: store.apiKey || DEFAULT_API_KEY,
    baseURL: store.baseURL || DEFAULT_BASE_URL,
    activeModel: store.activeModel || "deepseek-v4-flash",
    models: ["deepseek-v4-flash", "gemini-4-argon"],
    lastUpdated: Date.now(),
  }
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8")
  await rename(tmp, STORE_PATH)
  return data
}

/**
 * Generates OpenCode config JSON structure with strictly the 2 models.
 * "enabled_providers": ["gwarden"] ensures OpenCode only displays these 2 models!
 */
export function generateOpenCodeConfig(store, existingConfig = {}) {
  const apiKey = store.apiKey || DEFAULT_API_KEY
  const baseURL = store.baseURL || DEFAULT_BASE_URL
  const activeModel = store.activeModel === "gemini-4-argon" ? "gemini-4-argon" : "deepseek-v4-flash"

  const providerModels = {
    "deepseek-v4-flash": {
      name: "DeepSeek V4 Flash (Бесплатный)",
      limit: {
        context: 1048576,
        output: 32768,
      },
    },
    "gemini-4-argon": {
      name: "Google Gemini 4 Argon",
      limit: {
        context: 1048576,
        output: 65536,
      },
    },
  }

  return {
    $schema: "https://opencode.ai/config.json",
    enabled_providers: [PROVIDER_ID],
    model: `${PROVIDER_ID}/${activeModel}`,
    small_model: `${PROVIDER_ID}/deepseek-v4-flash`,
    provider: {
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
 * Updates both global and local opencode.json files.
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
