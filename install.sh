#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  🚀 Установка Мода OpenCode: Gwarden AI Provider"
echo "  ⚡ Gemini 4 Argon & DeepSeek V4 Flash (Бесплатный)"
echo "============================================================"

# Проверка Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js не найден! Пожалуйста, установите Node.js (версии 18 или новее)."
  exit 1
fi

echo "📦 Установка зависимостей..."
npm install --silent

chmod +x bin/switch.js

echo "⚙️ Настройка конфигурации..."
node bin/switch.js --install

echo ""
echo "============================================================"
echo "✅ Установка успешно завершена!"
echo ""
echo "Способы запуска:"
echo "  1) Интерактивный выбор модели: npm start (или node bin/switch.js)"
echo "  2) Быстрый выбор DeepSeek:     node bin/switch.js --model deepseek-v4-flash"
echo "  3) Быстрый выбор Gemini Argon:  node bin/switch.js --model gemini-4-argon"
echo "  4) Внутри OpenCode TUI:        команда /gwarden"
echo ""
echo "Не забудьте указать ваш API ключ с https://gwarden.su/cabinet :"
echo "  export GWARDEN_API_KEY=\"GWAR-XXXX\""
echo "  или введите его через: npm start (пункт 4)"
echo "============================================================"
