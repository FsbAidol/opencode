#!/usr/bin/env node

/**
 * OpenCode Gwarden Mod - Interactive CLI Switcher
 * 
 * Allows users to choose AI model (DeepSeek V4 Flash Free, Gemini 4 Argon, etc.),
 * configure API key from https://gwarden.su/cabinet, test connections, and launch OpenCode.
 */

import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import {
  readStore,
  writeStore,
  maskKey,
  syncOpenCodeConfigs,
  GLOBAL_OPENCODE_JSON,
  LOCAL_OPENCODE_JSON,
  STORE_PATH,
  CONFIG_DIR,
} from "../src/config.js"
import {
  PRESET_MODELS,
  PROVIDER_ID,
  PROVIDER_NAME,
  DEFAULT_BASE_URL,
} from "../src/models.js"
import { testConnection, fetchCatalog } from "../src/api.js"

// ANSI color helpers
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgGreen: "\x1b[42m\x1b[30m",
}

function clearScreen() {
  output.write("\x1b[2J\x1b[0;0H")
}

function printBanner() {
  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════════════╗
║${c.bold}               🚀 OpenCode Custom AI Mod (Gwarden.su)                ${c.reset}${c.cyan}║
║  Выбор своей ИИ: Gemini 4 Argon & DeepSeek V4 Flash (Бесплатный)     ║
╚══════════════════════════════════════════════════════════════════════╝${c.reset}
`)
}

function printStatus(store) {
  const modelInfo = PRESET_MODELS[store.activeModel]
  const modelName = modelInfo ? `${modelInfo.name}` : store.activeModel
  const isFreeTag = modelInfo?.isFree ? ` ${c.bgGreen} БЕСПЛАТНЫЙ ${c.reset}` : ""
  const keyDisplay = store.apiKey ? `${c.green}${maskKey(store.apiKey)}${c.reset}` : `${c.red}[НЕ ЗАДАН]${c.reset}`

  console.log(`${c.bold}Текущие настройки:${c.reset}`)
  console.log(`  🔌 Провайдер:      ${c.bold}${PROVIDER_NAME}${c.reset} (${store.baseURL})`)
  console.log(`  🔑 API Ключ:       ${keyDisplay}`)
  console.log(`  🤖 Активная ИИ:    ${c.bold}${c.cyan}${modelName}${c.reset}${isFreeTag} (${PROVIDER_ID}/${store.activeModel})`)
  console.log(`  📁 Личный кабинет: ${c.dim}https://gwarden.su/cabinet${c.reset}`)
  console.log("──────────────────────────────────────────────────────────────────────")
}

async function handleSetKey(rl, store) {
  console.log(`\n${c.cyan}🔑 Настройка API ключа Gwarden${c.reset}`)
  console.log(`Ключ можно получить в Telegram-боте на сайте: ${c.bold}https://gwarden.su/cabinet${c.reset}`)
  console.log(`Текущий ключ: ${maskKey(store.apiKey)}`)

  const answer = await rl.question(`\nВведите ваш API ключ (начинается с GWAR-...) или Enter для отмены:\n> `)
  const trimmed = answer.trim()
  if (!trimmed) {
    console.log(`${c.yellow}Отменено.${c.reset}`)
    return
  }

  store.apiKey = trimmed
  await writeStore(store)
  await syncOpenCodeConfigs(store)
  console.log(`\n${c.green}✅ API ключ успешно сохранен!${c.reset}`)
}

async function handleSelectModel(rl, store, modelID) {
  store.activeModel = modelID
  if (!store.models.includes(modelID)) {
    store.models.push(modelID)
  }

  await writeStore(store)
  await syncOpenCodeConfigs(store)

  const name = PRESET_MODELS[modelID]?.name || modelID
  console.log(`\n${c.green}✅ Активная модель переключена на: ${c.bold}${name}${c.reset} (${PROVIDER_ID}/${modelID})`)
  console.log(`${c.dim}Конфигурация OpenCode автоматически обновлена.${c.reset}`)
}

async function handleCustomModel(rl, store) {
  console.log(`\n${c.cyan}✏️ Выбор произвольной модели${c.reset}`)
  console.log("Популярные модели в Gwarden:")
  console.log("  - deepseek-v4-flash  (Бесплатный, 1M контекст)")
  console.log("  - gemini-4-argon     (Google Gemini 4 Argon, 1M контекст)")
  console.log("  - deepseek-v4-pro    (DeepSeek V4 Pro, 1M контекст)")
  console.log("  - gemini-3.1-pro     (Google Gemini 3.1 Pro)")
  console.log("  - claude-fable-5-1   (Claude Fable 5.1)")
  console.log("  - qwen3.8-max        (Qwen 3.8 Max)")

  const answer = await rl.question(`\nВведите ID модели (или Enter для отмены):\n> `)
  const trimmed = answer.trim()
  if (!trimmed) {
    console.log(`${c.yellow}Отменено.${c.reset}`)
    return
  }

  await handleSelectModel(rl, store, trimmed)
}

async function handleFetchCatalog(rl, store) {
  if (!store.apiKey) {
    console.log(`\n${c.red}❌ Сначала введите API ключ с сайта https://gwarden.su/cabinet${c.reset}`)
    return
  }

  console.log(`\n${c.cyan}🔄 Запрашиваем каталог моделей с ${store.baseURL}/models...${c.reset}`)
  const res = await fetchCatalog(store.baseURL, store.apiKey)

  if (!res.ok) {
    console.log(`${c.red}❌ Ошибка получения моделей: ${res.error}${c.reset}`)
    return
  }

  if (res.models.length === 0) {
    console.log(`${c.yellow}⚠️ Сервер вернул пустой список моделей.${c.reset}`)
    return
  }

  console.log(`\n${c.green}Найдено моделей: ${res.models.length}${c.reset}\n`)
  res.models.forEach((m, idx) => {
    const isCurrent = m.id === store.activeModel ? ` ${c.green}[АКТИВНА]${c.reset}` : ""
    console.log(`  [${idx + 1}] ${c.bold}${m.name}${c.reset} (ID: ${m.id})${isCurrent}`)
  })

  const pick = await rl.question(`\nВыберите номер модели для активации (или Enter для выхода):\n> `)
  const num = parseInt(pick.trim(), 10)
  if (!isNaN(num) && num >= 1 && num <= res.models.length) {
    const chosen = res.models[num - 1]
    store.catalog[chosen.id] = chosen.name
    await handleSelectModel(rl, store, chosen.id)
  }
}

async function handleTestConnection(store) {
  if (!store.apiKey) {
    console.log(`\n${c.red}❌ API ключ не задан! Получите его на https://gwarden.su/cabinet и введите в меню.${c.reset}`)
    return
  }

  console.log(`\n${c.cyan}📡 Проверка соединения с Gwarden AI...${c.reset}`)
  console.log(`  URL:    ${store.baseURL}`)
  console.log(`  Ключ:   ${maskKey(store.apiKey)}`)
  console.log(`  Модель: ${store.activeModel}`)

  const res = await testConnection(store.baseURL, store.apiKey, store.activeModel)
  if (res.ok) {
    console.log(`\n${c.green}✅ Соединение успешно установлено!${c.reset}`)
    console.log(`  Пинг:  ${res.latencyMs} мс`)
    console.log(`  Ответ: "${res.reply}"`)
    console.log(`  Токены работают корректно. Модель готова к работе!`)
  } else {
    console.log(`\n${c.red}❌ Ошибка подключения к API:${c.reset}`)
    console.log(`  ${res.error}`)
    console.log(`  Проверьте правильность ключа в кабинете: https://gwarden.su/cabinet`)
  }
}

async function handleInstallOpenCode(store) {
  console.log(`\n${c.cyan}⚙️ Настройка конфигурации OpenCode...${c.reset}`)
  const res = await syncOpenCodeConfigs(store, { writeLocal: true, writeGlobal: true })

  if (res.global) {
    console.log(`  ${c.green}✔${c.reset} Глобальный конфиг обновлен: ${c.dim}${GLOBAL_OPENCODE_JSON}${c.reset}`)
  }
  if (res.local) {
    console.log(`  ${c.green}✔${c.reset} Проектный конфиг обновлен:  ${c.dim}${LOCAL_OPENCODE_JSON}${c.reset}`)
  }

  console.log(`\n${c.green}✅ OpenCode полностью настроен на провайдер Gwarden (${store.activeModel})!${c.reset}`)
}

async function handleLaunchOpenCode(store) {
  await handleInstallOpenCode(store)
  console.log(`\n${c.cyan}🚀 Запуск OpenCode с моделью ${store.activeModel}...${c.reset}\n`)

  const env = {
    ...process.env,
    GWARDEN_API_KEY: store.apiKey || process.env.GWARDEN_API_KEY || "",
  }

  // Look for opencode binary or use npx @opencode/cli
  const child = spawn("npx", ["@opencode/cli"], {
    stdio: "inherit",
    env,
  })

  return new Promise(resolve => {
    child.on("exit", code => {
      console.log(`\n${c.dim}OpenCode завершил работу (код ${code}).${c.reset}`)
      resolve()
    })
  })
}

// Process command-line arguments (non-interactive mode)
async function parseArgs() {
  const args = process.argv.slice(2)
  let store = await readStore()
  let changed = false
  let shouldExit = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--model" || arg === "-m") {
      const model = args[++i]
      if (model) {
        store.activeModel = model
        changed = true
      }
      shouldExit = true
    } else if (arg === "--key" || arg === "-k") {
      const key = args[++i]
      if (key) {
        store.apiKey = key
        changed = true
      }
      shouldExit = true
    } else if (arg === "--check") {
      await handleTestConnection(store)
      process.exit(0)
    } else if (arg === "--status") {
      printBanner()
      printStatus(store)
      process.exit(0)
    } else if (arg === "--install") {
      await handleInstallOpenCode(store)
      process.exit(0)
    } else if (arg === "--launch") {
      await handleLaunchOpenCode(store)
      process.exit(0)
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Использование:
  node bin/switch.js [флаги]
  npm start

Флаги:
  --model, -m <id>   Установить активную модель (deepseek-v4-flash, gemini-4-argon)
  --key, -k <key>    Установить API ключ (GWAR-XXXX с https://gwarden.su/cabinet)
  --check            Проверить соединение с API
  --status           Показать текущий статус и модель
  --install          Применить настройки в opencode.json
  --launch           Применить настройки и запустить OpenCode
  --help, -h         Показать эту справку
`)
      process.exit(0)
    }
  }

  if (changed) {
    await writeStore(store)
    await syncOpenCodeConfigs(store)
    console.log(`${c.green}✔ Настройки сохранены:${c.reset} Модель = ${store.activeModel}, Ключ = ${maskKey(store.apiKey)}`)
    if (shouldExit) process.exit(0)
  }
}

// Main interactive loop
async function main() {
  await parseArgs()

  const rl = readline.createInterface({ input, output })

  let running = true
  while (running) {
    const store = await readStore()

    clearScreen()
    printBanner()
    printStatus(store)

    console.log(`${c.bold}Меню действий:${c.reset}`)
    console.log(`  ${c.cyan}[1]${c.reset} ⚡ ${c.bold}DeepSeek V4 Flash${c.reset} (Бесплатный / 1M токенов / экономия токенов)`)
    console.log(`  ${c.cyan}[2]${c.reset} 🧠 ${c.bold}Google Gemini 4 Argon${c.reset} (Google DeepMind / 1M токенов / кодинг)`)
    console.log(`  ${c.cyan}[3]${c.reset} 📋 Ввести другую модель или просмотреть каталог gwarden.su`)
    console.log(`  ${c.cyan}[4]${c.reset} 🔑 Указать / изменить API ключ (https://gwarden.su/cabinet)`)
    console.log(`  ${c.cyan}[5]${c.reset} 📡 Проверить соединение с сервером Gwarden`)
    console.log(`  ${c.cyan}[6]${c.reset} ⚙️ Применить настройки в OpenCode (~/.config/opencode/opencode.json)`)
    console.log(`  ${c.cyan}[7]${c.reset} 🚀 Запустить OpenCode с выбранной моделью`)
    console.log(`  ${c.cyan}[0]${c.reset} 🚪 Выход`)

    const choice = await rl.question(`\nВыберите пункт [0-7]: `)
    const action = choice.trim()

    switch (action) {
      case "1":
        await handleSelectModel(rl, store, "deepseek-v4-flash")
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "2":
        await handleSelectModel(rl, store, "gemini-4-argon")
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "3": {
        const sub = await rl.question(`\n[1] Ввести ID вручную\n[2] Загрузить список с gwarden.su\nВыберите [1-2]: `)
        if (sub.trim() === "2") {
          await handleFetchCatalog(rl, store)
        } else {
          await handleCustomModel(rl, store)
        }
        await rl.question(`\nНажмите Enter для продолжения...`)
        break
      }

      case "4":
        await handleSetKey(rl, store)
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "5":
        await handleTestConnection(store)
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "6":
        await handleInstallOpenCode(store)
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "7":
        await handleLaunchOpenCode(store)
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "0":
      case "q":
      case "exit":
        running = false
        console.log(`\n${c.green}Удачи в разработке с OpenCode!${c.reset}\n`)
        break

      default:
        console.log(`\n${c.yellow}Неверный ввод. Попробуйте еще раз.${c.reset}`)
        await new Promise(r => setTimeout(r, 800))
        break
    }
  }

  rl.close()
}

main().catch(err => {
  console.error("Ошибка:", err)
  process.exit(1)
})
