document.addEventListener('DOMContentLoaded', async () => {
    // Load Keys
    const keys = await chrome.storage.local.get(['openai_key', 'anthropic_key', 'gemini_key']);
    if (keys.openai_key) (document.getElementById('openai_key') as HTMLInputElement).value = keys.openai_key;
    if (keys.anthropic_key) (document.getElementById('anthropic_key') as HTMLInputElement).value = keys.anthropic_key;
    if (keys.gemini_key) (document.getElementById('gemini_key') as HTMLInputElement).value = keys.gemini_key;

    // Save Keys
    document.getElementById('save')?.addEventListener('click', async () => {
        const openai = (document.getElementById('openai_key') as HTMLInputElement).value.trim();
        const anthropic = (document.getElementById('anthropic_key') as HTMLInputElement).value.trim();
        const gemini = (document.getElementById('gemini_key') as HTMLInputElement).value.trim();

        await chrome.storage.local.set({
            openai_key: openai,
            anthropic_key: anthropic,
            gemini_key: gemini
        });

        const status = document.getElementById('status')!;
        status.textContent = 'Settings Saved!';
        setTimeout(() => status.textContent = '', 2000);
    });
});
