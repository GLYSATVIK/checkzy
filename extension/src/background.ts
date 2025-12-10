// Background Service Worker

// Initialize Context Menu
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
                text: text
            });
        } catch (err) {
            // If message fails (e.g. content script not loaded), inject and retry
            console.log("Injection fallback triggered");
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            });
            // Initializing delay to let script load
            await new Promise(r => setTimeout(r, 100));
            await chrome.tabs.sendMessage(tab.id, {
                action: "OPEN_DIALOG",
                text: text
            });
        }
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'GENERATE') {
        handleGenerate(msg).then(sendResponse);
        return true; // async response
    }
});

async function handleGenerate(msg: any) {
    const { prompt, model, text } = msg;

    try {
        const keys = await chrome.storage.local.get(['openai_key', 'anthropic_key', 'gemini_key', 'straico_key', 'openrouter_key']);

        // Route to provider based on model prefix or name
        if (model.startsWith('gpt')) {
            return await callOpenAI(keys.openai_key, model, prompt, text);
        } else if (model.startsWith('claude')) {
            return await callAnthropic(keys.anthropic_key, model, prompt, text);
        } else if (model.startsWith('gemini')) {
            return await callGemini(keys.gemini_key, model, prompt, text);
        } else {
            // Default to OpenRouter for everything else? Or Check Straico?
            // For MVP, simplistic routing.
            return { error: 'Unknown model provider' };
        }
    } catch (e: any) {
        return { error: e.message || 'API Error' };
    }
}

// --- API Clients ---

async function callOpenAI(key: string, model: string, prompt: string, text: string) {
    if (!key) return { error: 'Missing OpenAI API Key' };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: `You are a text editing engine. "${prompt}". Return ONLY the final rewritten text. Do NOT include explanations, "Here is", quotes, or markdown. Just the raw text.` },
                { role: 'user', content: text }
            ]
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'OpenAI Error');
    }
    const data = await res.json();
    return { text: data.choices[0].message.content };
}

async function callAnthropic(key: string, model: string, prompt: string, text: string) {
    if (!key) return { error: 'Missing Anthropic API Key' };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
            model: model,
            max_tokens: 1024,
            system: `You are a text editing engine. "${prompt}". Return ONLY the final rewritten text. Do NOT include explanations, "Here is", quotes, or markdown. Just the raw text.`,
            messages: [{ role: 'user', content: text }]
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Anthropic Error');
    }
    const data = await res.json();
    return { text: data.content[0].text };
}

async function callGemini(key: string, model: string, prompt: string, text: string) {
    if (!key) return { error: 'Missing Gemini API Key' };

    const tryFetch = async (modelName: string) => {
        // Ensure model name doesn't have double 'models/' prefix
        const cleanName = modelName.replace(/^models\//, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent?key=${key}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Strict Prompt Tuning for Gemini
                contents: [{ parts: [{ text: `Task: ${prompt}. Text: "${text}". \n\nDirectives: Return ONLY the rewritten text. NO explanations. NO markdown blocks. NO "Here is". Just the result.` }] }]
            })
        });
        return res;
    };

    // 1. Try requested model
    let res = await tryFetch(model);

    // 2. Auto-discover allowed models if 404 (Not Found) or 503 (Overloaded)
    if (!res.ok && (res.status === 404 || res.status === 503)) {
        console.log(`[Checkzy] Gemini model ${model} status ${res.status}. Auto-discovering/switching models...`);

        // If overloaded, wait a bit before trying fallback
        if (res.status === 503) await new Promise(r => setTimeout(r, 1000));

        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (listRes.ok) {
                const listData = await listRes.json();
                // Find first model supporting generateContent
                // Prioritize 'gemini-1.5-flash' or 'gemini-pro' if available and not the one that just failed
                const models = listData.models || [];
                const validModel = models.find((m: any) =>
                    m.name !== `models/${model}` &&
                    m.supportedGenerationMethods?.includes('generateContent')
                );

                if (validModel) {
                    console.log(`[Checkzy] Falling back to: ${validModel.name}`);
                    res = await tryFetch(validModel.name);
                }
            }
        } catch (e) {
            console.error('[Checkzy] Model discovery failed', e);
        }
    }

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Gemini Error');
    }
    const data = await res.json();

    // Safety check for response structure
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Unexpected Gemini response format');
    }

    return { text: data.candidates[0].content.parts[0].text };
}
