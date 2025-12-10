// Checkzy AI Content Script

// Icons (Simple SVGs)
const ICONS = {
    wand: `<svg width="20" height="20" viewBox="0 0 24 24" fill="url(#grad1)" stroke="none"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#8E2DE2;stop-opacity:1" /><stop offset="100%" style="stop-color:#4A00E0;stop-opacity:1" /></linearGradient></defs><path d="M12 2L14.4 7.2L20 9L14.4 10.8L12 16L9.6 10.8L4 9L9.6 7.2L12 2Z"></path><path d="M18 16L19.2 18.6L22 19.5L19.2 20.4L18 23L16.8 20.4L14 19.5L16.8 18.6L18 16Z"></path><path d="M5 16L5.8 17.6L7.5 18.2L5.8 18.8L5 20.5L4.2 18.8L2.5 18.2L4.2 17.6L5 16Z"></path></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    send: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    zap: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    smile: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
    briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
};

let shadowRoot: ShadowRoot | null = null;
let host: HTMLElement | null = null;
let wpToolbar: HTMLElement | null = null;
let dialog: HTMLElement | null = null;
let activeSelectionRange: Range | null = null;
let lastFocusedElement: HTMLElement | null = null; // Track focus for Insert
let currentResult = '';

// Cleanup old instances (Zombies)
function cleanUpOldUI() {
    try {
        const oldHost = document.getElementById('checkzy-host');
        if (oldHost) oldHost.remove();
    } catch (e) { }
}
cleanUpOldUI();

// Checker: is extension valid?
function isExtensionValid() {
    try {
        return !!chrome.runtime.getManifest();
    } catch (e) {
        return false;
    }
}

// Initialize Shadow DOM
function initUI() {
    if (host) return;
    if (!isExtensionValid()) return; // Stop if invalidated

    const target = document.body || document.documentElement;
    if (!target) {
        setTimeout(initUI, 500);
        return;
    }

    try {
        const newHost = document.createElement('div');
        newHost.id = 'checkzy-host';
        target.appendChild(newHost);
        host = newHost;
        shadowRoot = host.attachShadow({ mode: 'open' });

        // Inject Styles
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = chrome.runtime.getURL('ui.css');
        shadowRoot.appendChild(styleLink);
    } catch (e) {
        console.error('Checkzy: UI Injection failed', e);
        host = null;
    }
}

// Message Listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'OPEN_DIALOG') {
        if (!isExtensionValid()) return;
        const text = msg.text;
        if (text) {
            currentResult = text;
            (window as any)._checkzy_text = text;
            const selection = window.getSelection();
            let rect: DOMRect | null = null;
            if (selection && selection.rangeCount > 0) {
                rect = selection.getRangeAt(0).getBoundingClientRect();
            }
            if (!rect) rect = { bottom: window.innerHeight / 2, left: window.innerWidth / 2, top: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => { } };
            showDialog(rect);
        }
    }
});

// Selection Listener
document.addEventListener('selectionchange', debounce(handleSelection, 200));

function debounce(func: Function, wait: number) {
    let timeout: any;
    return function (...args: any) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function handleSelection() {
    if (!isExtensionValid()) return; // Stop

    setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        let text = '';
        let rect: DOMRect | null = null;

        // Important: Only reset captured element if we are actually selecting something new in the DOM 
        // that isn't our own shadow DOM.
        if (shadowRoot && shadowRoot.contains(active)) return;

        // 1. Input/Textarea
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            const el = active as HTMLInputElement | HTMLTextAreaElement;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            if (start !== null && end !== null && start !== end) {
                text = el.value.substring(start, end);
                const inputRect = el.getBoundingClientRect();
                rect = { bottom: inputRect.bottom, left: inputRect.left + 10, top: inputRect.top, right: inputRect.right, width: inputRect.width, height: inputRect.height, x: inputRect.x, y: inputRect.y, toJSON: () => { } };
                // Capture reference!
                lastFocusedElement = active;
                activeSelectionRange = null; // Clear range fallback if we have an element
            }
        }
        // 2. Body Text/ContentEditable
        else {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const anchor = selection.anchorNode;
                const parent = anchor?.parentElement;
                const isEditable = parent?.isContentEditable || (anchor instanceof HTMLElement && anchor.isContentEditable);
                if (isEditable) {
                    text = selection.toString();
                    if (selection.rangeCount > 0) {
                        activeSelectionRange = selection.getRangeAt(0).cloneRange();
                        rect = activeSelectionRange.getBoundingClientRect();
                        lastFocusedElement = active; // Also capture base element if possible
                    }
                }
            }
        }

        if (text && text.trim() && rect) {
            currentResult = text;
            (window as any)._checkzy_text = text;
            showToolbar(rect);
        } else {
            // Only hide if we clicked outside and aren't interacting with our own UI
            if (!active || (shadowRoot && !shadowRoot.contains(active))) {
                hideToolbar();
            }
        }
    }, 10);
}

function showToolbar(rectOrRange: any) {
    if (!shadowRoot) initUI();
    if (!host) return; // Wait for init
    if (dialog) return;

    if (!wpToolbar) {
        wpToolbar = document.createElement('div');
        wpToolbar.className = 'wp-toolbar';
        wpToolbar.innerHTML = `<button class="wp-icon-btn" id="wp-open-btn">${ICONS.wand}</button>`;
        shadowRoot!.appendChild(wpToolbar);
        wpToolbar.querySelector('#wp-open-btn')?.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            showDialog(); hideToolbar();
        });
    }

    let rect;
    if (rectOrRange.getBoundingClientRect) rect = rectOrRange.getBoundingClientRect();
    else rect = rectOrRange;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    wpToolbar.style.display = 'flex';
    wpToolbar.style.top = `${scrollTop + rect.bottom + 5}px`;
    wpToolbar.style.left = `${scrollLeft + rect.left}px`;
}

function hideToolbar() {
    if (wpToolbar) wpToolbar.style.display = 'none';
}

function showDialog(rectOverride?: DOMRect) {
    if (!shadowRoot) initUI();
    if (!host) return;
    if (dialog) return;

    dialog = document.createElement('div');
    dialog.className = 'wp-dialog';

    // Positioning
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    if (wpToolbar && wpToolbar.style.display !== 'none') {
        dialog.style.top = wpToolbar.style.top;
        dialog.style.left = wpToolbar.style.left;
    } else if (rectOverride) {
        dialog.style.top = `${scrollTop + rectOverride.bottom + 10}px`;
        dialog.style.left = `${scrollLeft + rectOverride.left}px`;
    } else if (activeSelectionRange) {
        const rect = activeSelectionRange.getBoundingClientRect();
        dialog.style.top = `${scrollTop + rect.bottom + 10}px`;
        dialog.style.left = `${scrollLeft + rect.left}px`;
    } else {
        dialog.style.top = `${scrollTop + 100}px`;
        dialog.style.left = `${scrollLeft + 100}px`;
    }

    renderPresetsState();
    shadowRoot!.appendChild(dialog);
}

function closeDialog() {
    if (dialog) { dialog.remove(); dialog = null; }
}

function renderPresetsState() {
    if (!dialog) return;
    dialog.innerHTML = `
        <div class="wp-header">
            <div class="wp-mac-buttons">
                <div class="wp-mac-dot wp-dot-red"></div>
                <div class="wp-mac-dot wp-dot-yellow"></div>
                <div class="wp-mac-dot wp-dot-green"></div>
            </div>
            <span class="wp-title">checkzy.ai</span>
        </div>
        <div class="wp-body">
            <div class="wp-preset-list">
                <div class="wp-preset-item" data-prompt="Humanize text">${ICONS.user} Humanize</div>
                <div class="wp-preset-item" data-prompt="Fix grammar">${ICONS.check} Fix grammar</div>
                <div class="wp-preset-item" data-prompt="Make it shorter">${ICONS.zap} Make it shorter</div>
                <div class="wp-preset-item" data-prompt="Write professionally">${ICONS.briefcase} Write professionally</div>
            </div>
        </div>
        <div class="wp-footer">
            <div class="wp-input-container">
                <input type="text" class="wp-prompt-input" placeholder="Refine response..." id="wp-custom-prompt">
                <button class="wp-send-btn">${ICONS.send}</button>
            </div>
            <div class="wp-model-select">
                <select class="wp-select" id="wp-model">
                    <option value="" disabled selected>Select AI</option>
                    <option value="gpt-4o">OpenAI</option>
                    <option value="gemini-1.5-flash">Gemini</option>
                    <option value="claude-3-haiku">Claude</option>
                </select>
            </div>
        </div>
    `;

    // Auto-select model from storage (async)
    chrome.storage.local.get(['openai_key', 'gemini_key', 'anthropic_key'], (res) => {
        const select = shadowRoot?.querySelector('#wp-model') as HTMLSelectElement;
        if (!select) return;

        // Smart default logic
        if (res.openai_key) { select.value = 'gpt-4o'; }
        else if (res.gemini_key) { select.value = 'gemini-1.5-flash'; }
        else if (res.anthropic_key) { select.value = 'claude-3-haiku'; }
        else { select.value = 'gpt-4o'; } // Fallback
    });

    bindDialogEvents();
}

function renderLoadingState() {
    if (!dialog) return;
    const body = dialog.querySelector('.wp-body')!;
    body.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">Thinking...</div>`;
}

function renderResultState(text: string) {
    if (!dialog) return;
    currentResult = text;
    const body = dialog.querySelector('.wp-body')!;
    body.innerHTML = `
        <div class="wp-result-area">
            <div class="wp-result-text">${text}</div>
            <button class="wp-insert-btn">${ICONS.check} Insert</button>
        </div>
    `;
    body.querySelector('.wp-insert-btn')?.addEventListener('click', () => {
        replaceSelection(text);
        closeDialog();
    });
}

function renderError(msg: string) {
    if (!dialog) return;
    const body = dialog.querySelector('.wp-body')!;
    body.innerHTML = `<div style="padding:20px; color:red;">Error: ${msg}</div>`;
}

function bindDialogEvents() {
    if (!dialog) return;
    dialog.querySelector('.wp-dot-red')?.addEventListener('click', closeDialog);

    // Presets
    dialog.querySelectorAll('.wp-preset-item').forEach(el => {
        el.addEventListener('click', () => {
            const prompt = el.getAttribute('data-prompt');
            if (prompt) generateText(prompt);
        });
    });

    // Input
    const input = dialog.querySelector('#wp-custom-prompt') as HTMLInputElement;
    const sendBtn = dialog.querySelector('.wp-send-btn');
    const handleSend = () => { if (input.value.trim()) generateText(input.value.trim()); };

    sendBtn?.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });
}

async function generateText(prompt: string) {
    const text = (window as any)._checkzy_text || '';
    if (!text) return;

    if (!isExtensionValid()) { alert('Extension invalid. Please refresh page.'); return; }

    renderLoadingState();

    const modelSelect = shadowRoot?.querySelector('#wp-model') as HTMLSelectElement;
    // Default logic if nothing selected (should happen via storage check, but just in case)
    let model = modelSelect?.value;
    if (!model) { // try one more fallback if selection didn't update in time
        model = 'gpt-4o';
    }

    try {
        const res = await chrome.runtime.sendMessage({
            action: 'GENERATE',
            prompt: prompt,
            model: model,
            text: text
        });
        if (res.error) renderError(res.error);
        else renderResultState(res.text);
    } catch (e: any) {
        if (e.message && e.message.includes('invalidated')) renderError('Context Invalidated. Refresh page.');
        else renderError(e.message);
    }
}

function replaceSelection(text: string) {
    // 1. Try to use stored element reference (most robust for inputs)
    let targetEl = lastFocusedElement;

    // If not found or disconnected, try to look at current active element
    if (!targetEl || !document.contains(targetEl)) {
        targetEl = document.activeElement as HTMLElement;
    }

    if (targetEl && (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA')) {
        const el = targetEl as HTMLInputElement;

        try {
            // Restore focus to the input to ensure setRangeText processes correctly
            el.focus();

            if (typeof el.selectionStart === 'number') {
                const start = el.selectionStart || 0;
                const end = el.selectionEnd || 0;
                el.setRangeText(text, start, end, 'select');
            } else {
                // Fallback if selection API missing
                el.value = text;
            }
            // Trigger events to notify frameworks (React, etc.)
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
            console.error('Checkzy Insert Failed:', e);
        }

    } else if (activeSelectionRange) {
        // 2. ContentEditable fallback
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(activeSelectionRange);
            if (document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, text);
            } else {
                activeSelectionRange.deleteContents();
                activeSelectionRange.insertNode(document.createTextNode(text));
            }
        }
    }
}
