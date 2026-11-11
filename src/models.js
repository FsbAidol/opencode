/**
 * Gwarden AI Models Definition
 * 
 * Pre-configured models supported by Gwarden (https://gwarden.su/cabinet).
 * Specially highlights DeepSeek V4 Flash (Free) and Google Gemini 4 Argon.
 */

export const PROVIDER_ID = "gwarden"
export const PROVIDER_NAME = "Gwarden AI"
export const DEFAULT_BASE_URL = "https://gwarden.su/v1"

export const PRESET_MODELS = {
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash (Бесплатный)",
    description: "Бесплатная модель DeepSeek с 1M контекстом. Высокая скорость, идеальна когда кончаются токены.",
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
    description: "Флагманская модель Google DeepMind с 1M контекстом. Рекордные показатели в разработке ПО и решении сложных задач.",
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
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "Флагманская модель линейки DeepSeek V4 с расширенным выводом (до 64k токенов) и 1M контекстом.",
    isFree: false,
    isRecommended: false,
    limit: {
      context: 1048576,
      output: 65536,
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
  },
  "gemini-3.1-pro": {
    id: "gemini-3.1-pro",
    name: "Google Gemini 3.1 Pro",
    description: "Надежная Pro-модель от Google для мультимодальных задач и анализа крупных кодовых баз.",
    isFree: false,
    isRecommended: false,
    limit: {
      context: 1048576,
      output: 65536,
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
  },
  "claude-fable-5-1": {
    id: "claude-fable-5-1",
    name: "Claude Fable 5.1",
    description: "Продвинутая модель от Anthropic для агентной работы, рефакторинга и следования инструкциям.",
    isFree: false,
    isRecommended: false,
    limit: {
      context: 1048576,
      output: 65536,
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
  },
  "qwen3.8-max": {
    id: "qwen3.8-max",
    name: "Qwen 3.8 Max",
    description: "Мощная модель от Alibaba для программирования на различных языках, контекст 1M.",
    isFree: false,
    isRecommended: false,
    limit: {
      context: 1048576,
      output: 32768,
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
  },
  "gwarden-ai": {
    id: "gwarden-ai",
    name: "Gwarden AI Coding Assistant",
    description: "Фирменный ассистент Gwarden для повседневного написания кода, 1M контекст.",
    isFree: false,
    isRecommended: false,
    limit: {
      context: 1048576,
      output: 32768,
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
export function buildModelInfo(providerID, modelID, customMeta = {}) {
  const preset = PRESET_MODELS[modelID] || {}
  const name = customMeta.name || preset.name || modelID
  const contextLimit = customMeta.limit?.context || preset.limit?.context || 1048576
  const outputLimit = customMeta.limit?.output || preset.limit?.output || 32768

  return {
    id: modelID,
    modelID,
    providerID: providerID || PROVIDER_ID,
    name,
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
      ...(preset.capabilities || {}),
      ...(customMeta.capabilities || {}),
    },
    variants: [],
    time: { released: 0 },
    cost: [],
    status: "active",
    enabled: true,
    limit: {
      context: contextLimit,
      output: outputLimit,
    },
  }
}

/**
 * Builds OpenCode compatible Provider.Info object.
 */
export function buildProviderInfo(providerID, options = {}) {
  const id = providerID || PROVIDER_ID
  const baseURL = options.baseURL || DEFAULT_BASE_URL
  const apiKey = options.apiKey || ""

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
