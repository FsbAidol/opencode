/**
 * Gwarden AI API Utilities
 * 
 * Interacts with https://gwarden.su/v1 (OpenAI-compatible endpoints).
 */

import { DEFAULT_BASE_URL } from "./models.js"

/**
 * Normalizes base URL so it does not end with trailing slash.
 */
export function normalizeBaseURL(url) {
  if (!url) return DEFAULT_BASE_URL
  return String(url).trim().replace(/\/+$/, "")
}

/**
 * Fetches available models from Gwarden endpoint (GET /models).
 */
export async function fetchCatalog(baseURL = DEFAULT_BASE_URL, apiKey = "") {
  const root = normalizeBaseURL(baseURL)
  const url = `${root}/models`

  const headers = {
    Accept: "application/json",
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey.trim()}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    const rawList = Array.isArray(json) ? json : json?.data ?? json?.models ?? []

    const models = []
    const seen = new Set()

    for (const item of rawList) {
      const id = typeof item === "string" ? item : String(item?.id ?? item?.name ?? "")
      if (!id || seen.has(id)) continue
      seen.add(id)

      const name = typeof item === "string" ? id : String(item?.name ?? item?.display_name ?? id)
      models.push({
        id,
        name,
        raw: item,
      })
    }

    return { ok: true, models }
  } catch (err) {
    clearTimeout(timeoutId)
    return { ok: false, error: err.message || String(err), models: [] }
  }
}

/**
 * Tests connection to Gwarden by sending a minimal chat completion request.
 */
export async function testConnection(baseURL = DEFAULT_BASE_URL, apiKey = "", modelID = "deepseek-v4-flash") {
  const root = normalizeBaseURL(baseURL)
  const url = `${root}/chat/completions`

  if (!apiKey || !apiKey.trim()) {
    return {
      ok: false,
      error: "API ключ не указан. Получите ключ на https://gwarden.su/cabinet",
    }
  }

  const startTime = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: modelID,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      let detail = ""
      try {
        const errJson = await res.json()
        detail = errJson?.error?.message || errJson?.message || JSON.stringify(errJson)
      } catch {
        detail = await res.text()
      }
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}: ${detail || res.statusText}`,
        latencyMs,
      }
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? ""

    return {
      ok: true,
      status: res.status,
      latencyMs,
      reply: content.trim(),
    }
  } catch (err) {
    clearTimeout(timeoutId)
    return {
      ok: false,
      error: err.name === "AbortError" ? "Превышен таймаут ответа (15 сек)" : (err.message || String(err)),
      latencyMs: Date.now() - startTime,
    }
  }
}
