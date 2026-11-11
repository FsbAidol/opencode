/**
 * OpenCode Gwarden Mod - TUI Entrypoint
 * 
 * Provides interactive /gwarden command inside OpenCode terminal UI
 * for switching between DeepSeek V4 Flash (Free) and Gemini 4 Argon.
 */

import { Plugin } from "@opencode/plugin/tui"
import { readStore, writeStore, maskKey, syncOpenCodeConfigs } from "./src/config.js"
import { PRESET_MODELS, PROVIDER_ID } from "./src/models.js"

export default Plugin.define({
  id: "gwarden-mod",
  setup(ctx) {
    if (!ctx?.keymap?.layer || !ctx?.ui?.dialog) return

    ctx.keymap.layer(() => ({
      commands: [
        {
          id: "gwarden.menu",
          title: "Gwarden AI: Выбор ИИ (DeepSeek Flash / Gemini Argon)",
          description: "Быстрое переключение между DeepSeek V4 Flash и Google Gemini 4 Argon",
          palette: true,
          slash: {
            name: "gwarden",
            aliases: ["model", "ai"],
          },
          run: async () => {
            await handleMainMenu(ctx)
          },
        },
      ],
    }))
  },
})

async function handleMainMenu(ctx) {
  const store = await readStore()
  const keyDisplay = maskKey(store.apiKey)

  const choice = await ctx.ui.dialog.select({
    title: `🤖 Gwarden AI (Активно: ${store.activeModel})`,
    placeholder: "Выберите ИИ...",
    options: [
      {
        title: "⚡ DeepSeek V4 Flash (Бесплатный)",
        value: "select_deepseek",
        description: "1M контекст | Нулевая стоимость | Идеально когда кончаются токены",
        category: "Выбор ИИ",
      },
      {
        title: "🧠 Google Gemini 4 Argon",
        value: "select_gemini",
        description: "1M контекст | Флагман Google DeepMind для сложного кодинга",
        category: "Выбор ИИ",
      },
      {
        title: `🔑 API Ключ: ${keyDisplay}`,
        value: "change_key",
        description: "Изменить ключ GWAR-... (кабинет: https://gwarden.su/cabinet)",
        category: "Настройки",
      },
    ],
  })

  if (!choice) return

  switch (choice) {
    case "select_deepseek":
      await switchActiveModel(ctx, "deepseek-v4-flash")
      break

    case "select_gemini":
      await switchActiveModel(ctx, "gemini-4-argon")
      break

    case "change_key": {
      const newKey = await ctx.ui.dialog.prompt({
        title: "API ключ Gwarden (GWAR-...)",
        description: "Личный кабинет: https://gwarden.su/cabinet",
        placeholder: "GWAR-...",
        value: store.apiKey,
      })
      if (newKey !== undefined && newKey.trim()) {
        store.apiKey = newKey.trim()
        await writeStore(store)
        await syncOpenCodeConfigs(store)
        ctx.ui.toast?.show({
          title: "API ключ сохранен",
          message: `Установлен ключ: ${maskKey(store.apiKey)}`,
          variant: "success",
        })
      }
      break
    }
  }
}

async function switchActiveModel(ctx, modelID) {
  const store = await readStore()
  store.activeModel = modelID

  await writeStore(store)
  await syncOpenCodeConfigs(store)

  const displayName = PRESET_MODELS[modelID]?.name || modelID

  ctx.ui.toast?.show({
    title: "Модель изменена!",
    message: `Активная ИИ: ${displayName} (${PROVIDER_ID}/${modelID})`,
    variant: "success",
  })
}
