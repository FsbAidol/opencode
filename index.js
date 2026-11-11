/**
 * OpenCode Gwarden Mod - Server Entrypoint
 * 
 * Registers Gwarden AI provider (https://gwarden.su/cabinet)
 * strictly with only 2 models:
 *  - Google Gemini 4 Argon
 *  - DeepSeek V4 Flash (Free)
 */

import { watch } from "node:fs"
import { Plugin } from "@opencode/plugin"
import { readStore, CONFIG_DIR } from "./src/config.js"
import { buildModelInfo, buildProviderInfo, PROVIDER_ID, DEFAULT_API_KEY } from "./src/models.js"

let isBooted = false

export default Plugin.define({
  id: "gwarden-mod",
  async setup(ctx) {
    if (isBooted) return
    if (!ctx?.provider?.transform) return
    isBooted = true

    let store = await readStore()

    const registerProvider = (editor, currentStore) => {
      const apiKey = currentStore.apiKey || DEFAULT_API_KEY
      const baseURL = currentStore.baseURL || "https://gwarden.su/v1"

      const providerInfo = buildProviderInfo(PROVIDER_ID, {
        baseURL,
        apiKey,
      })

      // Strictly and only the two user-requested models
      const modelInfos = [
        buildModelInfo(PROVIDER_ID, "deepseek-v4-flash"),
        buildModelInfo(PROVIDER_ID, "gemini-4-argon"),
      ]

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
      } catch {
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
