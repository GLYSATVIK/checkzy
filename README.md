# Checkzy AI - Your Glossy AI Writing Assistant ✨

Checkzy is a modern, premium Chrome Extension that brings AI writing powers directly to any text field on the web. With a "Glossy Mac-style" aesthetic, it looks and feels like a native tool.

## Features 🚀

- **✨ Contextual Magic**: Select any text to see the Sparkle button.
- **🛠️ Smart Presets**:
  - **Humanize**: Make AI text sound natural.
  - **Fix Grammar**: Polish your writing instantly.
  - **Make it Shorter**: Concise editing.
  - **Write Professionally**: Tone adjustment for work.
- **🤖 Multi-Model Support**: Use your own API keys for **OpenAI (GPT-4o)**, **Google Gemini**, or **Anthropic Claude**.
- **💎 Premium UI**: Glassmorphism design, smooth animations, and a seamless "Apple-like" experience.
- **🎯 Robust Insert**: Intelligently "locks on" to your text input, ensuring the AI result pastes back correctly even if you switch focus.

---

## Installation 💿

1. **Build the Project** (if you haven't already):
   Ensure you have Node.js installed.
   ```bash
   cd extension
   node build.js
   ```
   This creates a `dist` folder with the ready-to-use extension.

2. **Load into Chrome**:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked**.
   - Select the `extension/dist` folder inside this project directory.

---

## Configuration ⚙️

Before using Checkzy, you need to provide your AI API keys. Your keys are stored locally on your device and never shared.

1. Click the **Checkzy icon** in your browser toolbar (or pin it first).
2. The **Settings Window** will open (Checkzy.ai).
3. Enter your keys:
   - **OpenAI API Key**: Starts with `sk-...`
   - **Anthropic API Key**: Starts with `sk-ant-...`
   - **Gemini API Key**: Starts with `AIza...`
4. Click **Save Changes**. The traffic light status will turn green.

*Note: You only need one key to get started, but adding multiple lets you switch models on the fly.*

---

## Usage 💡

1. **Highlight Text**: Select any text in a text box, email, or document online.
2. **Click the Sparkle ✨**: A small floating button will appear near your selection.
3. **Choose an Action**:
   - Click a preset like **Humanize** or **Fix Grammar**.
   - Or type your own instruction (e.g., "Translate to Spanish") in the input bar and hit Enter.
4. **Insert**: Once the AI generates a response, click **Insert** to replace your original text with the polished version.

---

## Privacy 🔒

- **Local Storage**: API keys are stored in your browser's local storage (`chrome.storage.local`).
- **Direct Communication**: The extension communicates directly with the AI providers. No intermediate servers collect your data.
