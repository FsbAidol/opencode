/**
 * OpenCode Gwarden Mod - TUI Entrypoint
 * 
 * Provides interactive /gwarden command inside OpenCode terminal UI.
 */

import { Plugin } from "@opencode/plugin/tui"
import { readStore, writeStore, maskKey, syncOpenCodeConfigs } from "./src/config.js"
import { PRESET_MODELS, PROVIDER_ID } from "./src/models.js"
import { testConnection, fetchCatalog } from "./src/api.js"

export default Plugin.define({
  id: "gwarden-mod",
  setup(ctx) {
    if (!ctx?.keymap?.layer || !ctx?.ui?.dialog) return

    ctx.keymap.layer(() => ({
      commands: [
        {
          id: "gwarden.menu",
          title: "Gwarden AI: Выбор модели и провайдера",
          description: "Переключение между бесплатным DeepSeek V4 Flash, Gemini 4 Argon и настройка API",
          palette: true,
          slash: {
            name: "gwarden",
            aliases: ["ai-mod", "switch-model"],
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
  let store = await readStore()

  const currentModelName = PRESET_MODELS[store.activeModel]?.name || store.activeModel
  const keyDisplay = maskKey(store.apiKey)

  const choice = await ctx.ui.dialog.select({
    title: `🤖 Gwarden AI (Активно: ${store.activeModel})`,
    placeholder: "Выберите действие...",
    options: [
      {
        title: "⚡ DeepSeek V4 Flash (Бесплатный)",
        value: "select_deepseek",
        description: "1M контекст | Бесплатный тариф | Рекомендуется при нехватке токенов",
        category: "Выбор ИИ",
      },
      {
        title: "🧠 Google Gemini 4 Argon",
        value: "select_gemini",
        description: "1M контекст | Флагман Google DeepMind для сложного кодинга",
        category: "Выбор ИИ",
      },
      {
        title: "✏️ Ввести название другой модели",
        value: "select_custom",
        description: "Указать произвольный ID модели из gwarden.su",
        category: "Выбор ИИ",
      },
      {
        title: "🔄 Загрузить модели из кабинета gwarden.su",
        value: "refresh_models",
        description: "Получить актуальный список через API (https://gwarden.su/v1/models)",
        category: "Модели",
      },
      {
        title: `🔑 API Ключ: ${keyDisplay}`,
        value: "change_key",
        description: "Ввести или изменить ключ GWAR-... (получить: https://gwarden.su/cabinet)",
        category: "Настройки",
      },
      {
        title: "📡 Проверить соединение с Gwarden API",
        value: "test_connection",
        description: "Тест подключения и ответа текущей модели",
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

    case "select_custom": {
      const input = await ctx.ui.dialog.prompt({
        title: "Введите ID модели",
        description: "Например: deepseek-v4-pro, claude-fable-5-1, qwen3.8-max",
        placeholder: "model-id",
      })
      if (input && input.trim()) {
        await switchActiveModel(ctx, input.trim())
      }
      break
    }

    case "change_key": {
      const newKey = await ctx.ui.dialog.prompt({
        title: "API ключ Gwarden (GWAR-...)",
        description: "Скопируйте ключ из личного кабинета: https://gwarden.su/cabinet",
        placeholder: "GWAR-XXXXXXXXXXXXXXXX",
        value: store.apiKey,
      })
      if (newKey !== undefined) {
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

    case "test_connection": {
      if (!store.apiKey) {
        await ctx.ui.dialog.alert({
          title: "API ключ не настроен",
          message: "Сначала укажите API ключ из личного кабинета https://gwarden.su/cabinet",
        })
        return
      }

      ctx.ui.toast?.show({
        title: "Проверка связи...",
        message: `Отправка запроса к ${store.baseURL}...`,
        variant: "info",
      })

      const res = await testConnection(store.baseURL, store.apiKey, store.activeModel)
      if (res.ok) {
        await ctx.ui.dialog.alert({
          title: "✅ Подключение успешно!",
          message: `Модель: ${store.activeModel}\nЗадержка: ${res.latencyMs} мс\nОтвет: "${res.reply}"`,
        })
      } else {
        await ctx.ui.dialog.alert({
          title: "❌ Ошибка подключения",
          message: `Не удалось связаться с Gwarden:\n${res.error}`,
        })
      }
      break
    }

    case "refresh_models": {
      if (!store.apiKey) {
        await ctx.ui.dialog.alert({
          title: "Требуется API ключ",
          message: "Для загрузки списка моделей укажите API ключ с https://gwarden.su/cabinet",
        })
        return
      }

      ctx.ui.toast?.show({
        title: "Загрузка моделей...",
        message: "Опрашиваем https://gwarden.su/v1/models...",
        variant: "info",
      })

      const res = await fetchCatalog(store.baseURL, store.apiKey)
      if (!res.ok) {
        await ctx.ui.dialog.alert({
          title: "Ошибка получения моделей",
          message: res.error,
        })
        return
      }

      if (res.models.length === 0) {
        await ctx.ui.dialog.alert({
          title: "Список пуст",
          message: "Сервер вернул пустой список моделей.",
        })
        return
      }

      // Present the fetched models in dialog select
      const modelChoice = await ctx.ui.dialog.select({
        title: `Доступные модели на gwarden.su (${res.models.length})`,
        placeholder: "Поиск модели...",
        options: res.models.map(m => ({
          title: m.name,
          value: m.id,
          description: `ID: ${m.id}`,
        })),
      })

      if (modelChoice) {
        await switchActiveModel(ctx, modelChoice)
      }
      break
    }
  }
}

async function switchActiveModel(ctx, modelID) {
  const store = await readStore()
  store.activeModel = modelID

  if (!store.models.includes(modelID)) {
    store.models.push(modelID)
  }

  await writeStore(store)
  await syncOpenCodeConfigs(store)

  const displayName = PRESET_MODELS[modelID]?.name || modelID

  ctx.ui.toast?.show({
    title: "Модель изменена!",
    message: `Текущая модель OpenCode: ${displayName} (${PROVIDER_ID}/${modelID})`,
    variant: "success",
  })
}
