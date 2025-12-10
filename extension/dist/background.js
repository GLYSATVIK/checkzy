(() => {
  // src/background.ts
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "checkzy-open",
        title: "Checkzy AI: Improve Text",
        contexts: ["selection"]
      });
    });
  });
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "checkzy-open" && tab?.id) {
      const text = info.selectionText;
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: "OPEN_DIALOG",
          text
        });
      } catch (err) {
        console.log("Injection fallback triggered");
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        await new Promise((r) => setTimeout(r, 100));
        await chrome.tabs.sendMessage(tab.id, {
          action: "OPEN_DIALOG",
          text
        });
      }
    }
  });
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "GENERATE") {
      handleGenerate(msg).then(sendResponse);
      return true;
    }
  });
  async function handleGenerate(msg) {
    const { prompt, model, text } = msg;
    try {
      const keys = await chrome.storage.local.get(["openai_key", "anthropic_key", "gemini_key", "straico_key", "openrouter_key"]);
      if (model.startsWith("gpt")) {
        return await callOpenAI(keys.openai_key, model, prompt, text);
      } else if (model.startsWith("claude")) {
        return await callAnthropic(keys.anthropic_key, model, prompt, text);
      } else if (model.startsWith("gemini")) {
        return await callGemini(keys.gemini_key, model, prompt, text);
      } else {
        return { error: "Unknown model provider" };
      }
    } catch (e) {
      return { error: e.message || "API Error" };
    }
  }
  async function callOpenAI(key, model, prompt, text) {
    if (!key)
      return { error: "Missing OpenAI API Key" };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: `You are a text editing engine. "${prompt}". Return ONLY the final rewritten text. Do NOT include explanations, "Here is", quotes, or markdown. Just the raw text.` },
          { role: "user", content: text }
        ]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "OpenAI Error");
    }
    const data = await res.json();
    return { text: data.choices[0].message.content };
  }
  async function callAnthropic(key, model, prompt, text) {
    if (!key)
      return { error: "Missing Anthropic API Key" };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: `You are a text editing engine. "${prompt}". Return ONLY the final rewritten text. Do NOT include explanations, "Here is", quotes, or markdown. Just the raw text.`,
        messages: [{ role: "user", content: text }]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Anthropic Error");
    }
    const data = await res.json();
    return { text: data.content[0].text };
  }
  async function callGemini(key, model, prompt, text) {
    if (!key)
      return { error: "Missing Gemini API Key" };
    const tryFetch = async (modelName) => {
      const cleanName = modelName.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent?key=${key}`;
      const res2 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Strict Prompt Tuning for Gemini
          contents: [{ parts: [{ text: `Task: ${prompt}. Text: "${text}". 

Directives: Return ONLY the rewritten text. NO explanations. NO markdown blocks. NO "Here is". Just the result.` }] }]
        })
      });
      return res2;
    };
    let res = await tryFetch(model);
    if (!res.ok && (res.status === 404 || res.status === 503)) {
      console.log(`[Checkzy] Gemini model ${model} status ${res.status}. Auto-discovering/switching models...`);
      if (res.status === 503)
        await new Promise((r) => setTimeout(r, 1e3));
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const models = listData.models || [];
          const validModel = models.find(
            (m) => m.name !== `models/${model}` && m.supportedGenerationMethods?.includes("generateContent")
          );
          if (validModel) {
            console.log(`[Checkzy] Falling back to: ${validModel.name}`);
            res = await tryFetch(validModel.name);
          }
        }
      } catch (e) {
        console.error("[Checkzy] Model discovery failed", e);
      }
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Gemini Error");
    }
    const data = await res.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Unexpected Gemini response format");
    }
    return { text: data.candidates[0].content.parts[0].text };
  }
})();
//# sourceMappingURL=background.js.map
