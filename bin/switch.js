#!/usr/bin/env node

/**
 * OpenCode Gwarden Mod - Interactive CLI Switcher
 * 
 * Configured strictly for the 2 models:
 * 1. DeepSeek V4 Flash (Free)
 * 2. Google Gemini 4 Argon
 */

import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { spawn } from "node:child_process"
import {
  readStore,
  writeStore,
  maskKey,
  syncOpenCodeConfigs,
  GLOBAL_OPENCODE_JSON,
  LOCAL_OPENCODE_JSON,
} from "../src/config.js"
import {
  PRESET_MODELS,
  PROVIDER_ID,
  PROVIDER_NAME,
  DEFAULT_API_KEY,
} from "../src/models.js"

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bgGreen: "\x1b[42m\x1b[30m",
}

function clearScreen() {
  output.write("\x1b[2J\x1b[0;0H")
}

function printBanner() {
  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════════════╗
║${c.bold}            🚀 OpenCode Gwarden Mod (2 Модели: 1M Context)            ${c.reset}${c.cyan}║
║  1. ⚡ DeepSeek V4 Flash (Бесплатный)  |  2. 🧠 Google Gemini 4 Argon ║
╚══════════════════════════════════════════════════════════════════════╝${c.reset}
`)
}

function printStatus(store) {
  const modelInfo = PRESET_MODELS[store.activeModel]
  const modelName = modelInfo ? `${modelInfo.name}` : store.activeModel
  const isFreeTag = modelInfo?.isFree ? ` ${c.bgGreen} БЕСПЛАТНЫЙ ${c.reset}` : ""
  const keyDisplay = `${c.green}${maskKey(store.apiKey)}${c.reset}`

  console.log(`${c.bold}Текущая конфигурация:${c.reset}`)
  console.log(`  🔌 Провайдер:      ${c.bold}${PROVIDER_NAME}${c.reset} (${store.baseURL})`)
  console.log(`  🔑 API Ключ:       ${keyDisplay}`)
  console.log(`  🤖 Активная ИИ:    ${c.bold}${c.cyan}${modelName}${c.reset}${isFreeTag} (${PROVIDER_ID}/${store.activeModel})`)
  console.log(`  📁 Кабинет:        ${c.dim}https://gwarden.su/cabinet${c.reset}`)
  console.log("──────────────────────────────────────────────────────────────────────")
}

async function handleSelectModel(rl, store, modelID) {
  store.activeModel = modelID
  await writeStore(store)
  await syncOpenCodeConfigs(store)

  const name = PRESET_MODELS[modelID]?.name || modelID
  console.log(`\n${c.green}✅ Выбрана модель: ${c.bold}${name}${c.reset} (${PROVIDER_ID}/${modelID})`)
  console.log(`${c.dim}Конфиг OpenCode обновлен. В списке моделей только ваши 2 ИИ.${c.reset}`)
}

async function handleInstallOpenCode(store) {
  console.log(`\n${c.cyan}⚙️ Применение конфигурации OpenCode...${c.reset}`)
  const res = await syncOpenCodeConfigs(store, { writeLocal: true, writeGlobal: true })

  if (res.global) {
    console.log(`  ${c.green}✔${c.reset} Глобальный конфиг: ${c.dim}${GLOBAL_OPENCODE_JSON}${c.reset}`)
  }
  if (res.local) {
    console.log(`  ${c.green}✔${c.reset} Локальный конфиг:  ${c.dim}${LOCAL_OPENCODE_JSON}${c.reset}`)
  }

  console.log(`\n${c.green}✅ OpenCode настроен на ${store.activeModel} с ключом Gwarden!${c.reset}`)
}

async function handleLaunchOpenCode(store) {
  await handleInstallOpenCode(store)
  console.log(`\n${c.cyan}🚀 Запуск OpenCode (${store.activeModel})...${c.reset}\n`)

  const env = {
    ...process.env,
    GWARDEN_API_KEY: store.apiKey,
  }

  const child = spawn("npx", ["@opencode/cli"], {
    stdio: "inherit",
    env,
  })

  return new Promise(resolve => {
    child.on("exit", code => {
      console.log(`\n${c.dim}OpenCode завершен (код ${code}).${c.reset}`)
      resolve()
    })
  })
}

// Process command-line flags
async function parseArgs() {
  const args = process.argv.slice(2)
  let store = await readStore()
  let changed = false
  let shouldExit = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--model" || arg === "-m") {
      const model = args[++i]
      if (model === "gemini" || model === "argon" || model === "gemini-4-argon") {
        store.activeModel = "gemini-4-argon"
        changed = true
      } else if (model === "deepseek" || model === "flash" || model === "deepseek-v4-flash") {
        store.activeModel = "deepseek-v4-flash"
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
  --model, -m <flash|argon>   Выбрать модель (deepseek-v4-flash или gemini-4-argon)
  --key, -k <key>             Установить API ключ
  --status                    Показать текущую модель
  --install                   Записать конфиги
  --launch                    Запустить OpenCode
`)
      process.exit(0)
    }
  }

  if (changed) {
    await writeStore(store)
    await syncOpenCodeConfigs(store)
    console.log(`${c.green}✔ Настройки сохранены:${c.reset} Модель = ${store.activeModel}`)
    if (shouldExit) process.exit(0)
  }
}

async function main() {
  await parseArgs()

  const rl = readline.createInterface({ input, output })

  let running = true
  while (running) {
    const store = await readStore()

    clearScreen()
    printBanner()
    printStatus(store)

    console.log(`${c.bold}Выберите действие:${c.reset}`)
    console.log(`  ${c.cyan}[1]${c.reset} ⚡ ${c.bold}DeepSeek V4 Flash${c.reset} (Бесплатный / 1M токенов / экономия токенов)`)
    console.log(`  ${c.cyan}[2]${c.reset} 🧠 ${c.bold}Google Gemini 4 Argon${c.reset} (Google DeepMind / 1M токенов / сложный кодинг)`)
    console.log(`  ${c.cyan}[3]${c.reset} 🚀 Запустить OpenCode с выбранной моделью`)
    console.log(`  ${c.cyan}[4]${c.reset} ⚙️ Переустановить конфиги в OpenCode`)
    console.log(`  ${c.cyan}[0]${c.reset} 🚪 Выход`)

    const choice = await rl.question(`\nВыберите пункт [0-4]: `)
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

      case "3":
        await handleLaunchOpenCode(store)
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "4":
        await handleInstallOpenCode(store)
        await rl.question(`\nНажмите Enter для продолжения...`)
        break

      case "0":
      case "q":
      case "exit":
        running = false
        console.log(`\n${c.green}Готово!${c.reset}\n`)
        break

      default:
        console.log(`\n${c.yellow}Неверный ввод.${c.reset}`)
        await new Promise(r => setTimeout(r, 600))
        break
    }
  }

  rl.close()
}

main().catch(err => {
  console.error("Ошибка:", err)
  process.exit(1)
})
