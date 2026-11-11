/**
 * OpenCode Gwarden Mod - Server Entrypoint
 * 
 * Registers Gwarden AI provider (https://gwarden.su/cabinet)
 * with Google Gemini 4 Argon and DeepSeek V4 Flash (Free) in OpenCode.
 */

import { watch } from "node:fs"
import { Plugin } from "@opencode/plugin"
import { readStore, writeStore, STORE_PATH, CONFIG_DIR } from "./src/config.js"
import { buildModelInfo, buildProviderInfo, PROVIDER_ID, PRESET_MODELS } from "./src/models.js"
import { fetchCatalog } from "./src/api.js"

let isBooted = false

export default Plugin.define({
  id: "gwarden-mod",
  async setup(ctx) {
    if (isBooted) return
    if (!ctx?.provider?.transform) return
    isBooted = true

    let store = await readStore()

    // Helper to register models into OpenCode's ProviderEditor
    const registerProvider = (editor, currentStore) => {
      const apiKey = currentStore.apiKey || process.env.GWARDEN_API_KEY || ""
      const baseURL = currentStore.baseURL || "https://gwarden.su/v1"

      const providerInfo = buildProviderInfo(PROVIDER_ID, {
        baseURL,
        apiKey,
      })

      // Collect all model IDs to register
      const modelIds = Array.from(new Set([
        "deepseek-v4-flash",
        "gemini-4-argon",
        ...(currentStore.models || []),
        ...(Object.keys(currentStore.customModels || {})),
      ]))

      const modelInfos = modelIds.map(mId => {
        const custom = currentStore.customModels?.[mId] || {}
        return buildModelInfo(PROVIDER_ID, mId, custom)
      })

      try {
        const existing = editor.get(PROVIDER_ID)
        if (existing) {
          editor.update(PROVIDER_ID, p => {
            p.settings = providerInfo.settings
            p.activation = "enabled"
          })
          editor.models.set(PROVIDER_ID, modelInfos)
        } else {
          editor.add({
            info: providerInfo,
            models: modelInfos,
          })
        }
      } catch (err) {
        // Fallback for editor implementations without get/update
        try {
          editor.add({
            info: providerInfo,
            models: modelInfos,
          })
        } catch (addErr) {
          console.error("[gwarden-mod] Ошибка регистрации провайдера:", addErr.message)
        }
      }
    }

    try {
      await ctx.provider.transform(editor => {
        registerProvider(editor, store)
      })
    } catch (err) {
      console.error("[gwarden-mod] Transform failed:", err?.message || err)
    }

    // Background update: if API key is present and catalog hasn't been fetched today
    if (store.apiKey && (!store.lastCatalogFetch || Date.now() - store.lastCatalogFetch > 24 * 3600 * 1000)) {
      fetchCatalog(store.baseURL, store.apiKey).then(async res => {
        if (res.ok && res.models.length > 0) {
          const newCatalog = { ...store.catalog }
          for (const m of res.models) {
            newCatalog[m.id] = m.name
          }
          store.catalog = newCatalog
          store.lastCatalogFetch = Date.now()
          await writeStore(store)
        }
      }).catch(() => {})
    }

    // Watch for changes in gwarden.json to hot-reload provider
    let debounceTimer
    try {
      watch(CONFIG_DIR, async (_event, filename) => {
        if (filename && filename !== "gwarden.json" && filename !== "gwarden.json.tmp") return
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
          store = await readStore()
          if (typeof ctx.provider?.reload === "function") {
            try {
              await ctx.provider.reload()
            } catch {
              // Ignore reload errors
            }
          }
        }, 150)
      })
    } catch {
      // Non-fatal if fs watch fails
    }
  },
})
