#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  🚀 Установка OpenCode (2 Модели: DeepSeek Flash & Gemini Argon)"
echo "  🔑 Ключ: GWAR-OYOQA2T1-KAWMDNLEYGFV-06VAB-A8GBB8-TYFNQ77N"
echo "============================================================"

# Проверка Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js не найден! Установите Node.js (v18+)."
  exit 1
fi

echo "📦 Установка зависимостей..."
npm install --silent

chmod +x bin/switch.js

echo "⚙️ Запись глобального и локального конфига OpenCode..."
node bin/switch.js --install

echo ""
echo "============================================================"
echo "✅ Готово! OpenCode настроен СТРОГО на 2 модели:"
echo "   1) ⚡ deepseek-v4-flash (Бесплатный)"
echo "   2) 🧠 gemini-4-argon    (Google Gemini 4 Argon)"
echo ""
echo "Команды для работы:"
echo "   - Меню выбора модели:      npm start"
echo "   - Переключить на DeepSeek: node bin/switch.js --model flash"
echo "   - Переключить на Gemini:   node bin/switch.js --model argon"
echo "   - Запустить OpenCode:      npx @opencode/cli"
echo "============================================================"
