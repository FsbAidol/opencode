# 🚀 OpenCode Custom AI Mod (Только 2 Модели)

> OpenCode настроен **СТРОГО на 2 модели** через провайдера **[Gwarden AI](https://gwarden.su/cabinet)** с предустановленным API-ключом:
> `GWAR-OYOQA2T1-KAWMDNLEYGFV-06VAB-A8GBB8-TYFNQ77N`

В списке моделей и в выборе доступны **только**:
1. ⚡ **DeepSeek V4 Flash (Бесплатный)** (`gwarden/deepseek-v4-flash`) — 1 000 000 токенов контекста, бесплатный расход, решение проблемы с кончающимися токенами.
2. 🧠 **Google Gemini 4 Argon** (`gwarden/gemini-4-argon`) — 1 000 000 токенов контекста, флагман Google DeepMind для сложного кодинга и архитектуры.

Все сторонние модели и лишние провайдеры отключены (`enabled_providers: ["gwarden"]`).

---

## 💻 Установка на Linux (в терминале)

### Шаг 1. Клонирование и переход в папку
```bash
git clone https://github.com/FsbAidol/opencode.git
cd opencode
```

### Шаг 2. Автоматическая установка (в одну команду)
```bash
bash install.sh
```

Скрипт сам установит зависимости и применит настройки в `~/.config/opencode/opencode.json` и локальный `opencode.json`.

---

## 🎮 Быстрое переключение моделей

### Вариант 1: Через интерактивное меню (в 1 клик)
```bash
npm start
```
Откроется русскоязычное меню:
- Нажмите `[1]` для выбора бесплатного **DeepSeek V4 Flash**
- Нажмите `[2]` для выбора **Google Gemini 4 Argon**
- Нажмите `[3]` для запуска OpenCode

### Вариант 2: Мгновенные команды в терминале
```bash
# Переключиться на бесплатный DeepSeek V4 Flash:
node bin/switch.js --model flash

# Переключиться на Google Gemini 4 Argon:
node bin/switch.js --model argon

# Посмотреть активную модель:
node bin/switch.js --status

# Запустить OpenCode:
npx @opencode/cli
```

### Вариант 3: Внутри OpenCode (TUI)
В строке ввода OpenCode введите:
```text
/gwarden
```
и выберите нужную модель стрелочками!

---

## ⚙️ Файл конфигурации `opencode.json`

Файл уже сконфигурирован в корне проекта и в `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "enabled_providers": [
    "gwarden"
  ],
  "model": "gwarden/deepseek-v4-flash",
  "small_model": "gwarden/deepseek-v4-flash",
  "provider": {
    "gwarden": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Gwarden AI",
      "options": {
        "baseURL": "https://gwarden.su/v1",
        "apiKey": "GWAR-OYOQA2T1-KAWMDNLEYGFV-06VAB-A8GBB8-TYFNQ77N"
      },
      "models": {
        "deepseek-v4-flash": {
          "name": "DeepSeek V4 Flash (Бесплатный)",
          "limit": { "context": 1048576, "output": 32768 }
        },
        "gemini-4-argon": {
          "name": "Google Gemini 4 Argon",
          "limit": { "context": 1048576, "output": 65536 }
        }
      }
    }
  }
}
```

---

## 📊 Характеристики 2-х моделей

| Параметр | DeepSeek V4 Flash | Google Gemini 4 Argon |
| :--- | :--- | :--- |
| **Стоимость** | **Бесплатный (Free)** | По тарифу кабинета |
| **Окно контекста** | **1 048 576 токенов (1M)** | **1 048 576 токенов (1M)** |
| **Макс. вывод** | 32 768 токенов | 65 536 токенов |
| **Назначение** | Повседневный кодинг, когда кончились токены | Сложная логика, флагманский анализ |
| **Поддержка инструментов (Tools)** | ✅ Да | ✅ Да |
