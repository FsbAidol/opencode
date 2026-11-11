/**
 * Gwarden AI Models Definition
 * 
 * Strictly configured for the 2 user-requested models:
 * 1. DeepSeek V4 Flash (Free)
 * 2. Google Gemini 4 Argon
 */

export const PROVIDER_ID = "gwarden"
export const PROVIDER_NAME = "Gwarden AI"
export const DEFAULT_BASE_URL = "https://gwarden.su/v1"
export const DEFAULT_API_KEY = "GWAR-OYOQA2T1-KAWMDNLEYGFV-06VAB-A8GBB8-TYFNQ77N"

export const PRESET_MODELS = {
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash (Бесплатный)",
    description: "Бесплатная модель DeepSeek с окном 1M токенов. Нулевой расход баланса, идеальна при нехватке токенов.",
    isFree: true,
    isRecommended: true,
    limit: {
      context: 1048576, // 1M tokens
      output: 32768,
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
  },
  "gemini-4-argon": {
    id: "gemini-4-argon",
    name: "Google Gemini 4 Argon",
    description: "Флагманская модель Google DeepMind с окном 1M токенов для сложной архитектуры и кодинга.",
    isFree: false,
    isRecommended: true,
    limit: {
      context: 1048576, // 1M tokens
      output: 65536,
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
  },
}

/**
 * Builds OpenCode compatible Model.Info object.
 */
export function buildModelInfo(providerID, modelID) {
  const preset = PRESET_MODELS[modelID] || PRESET_MODELS["deepseek-v4-flash"]
  const id = preset.id || modelID
  const name = preset.name || modelID

  return {
    id,
    modelID: id,
    providerID: providerID || PROVIDER_ID,
    name,
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
      ...(preset.capabilities || {}),
    },
    variants: [],
    time: { released: 0 },
    cost: [],
    status: "active",
    enabled: true,
    limit: {
      context: preset.limit.context,
      output: preset.limit.output,
    },
  }
}

/**
 * Builds OpenCode compatible Provider.Info object.
 */
export function buildProviderInfo(providerID, options = {}) {
  const id = providerID || PROVIDER_ID
  const baseURL = options.baseURL || DEFAULT_BASE_URL
  const apiKey = options.apiKey || DEFAULT_API_KEY

  const settings = { baseURL }
  if (apiKey) {
    settings.apiKey = apiKey
  }

  return {
    id,
    name: options.name || PROVIDER_NAME,
    activation: "enabled",
    package: "@opencode/ai/providers/openai-compatible",
    settings,
  }
}
