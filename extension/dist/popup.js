(() => {
  // src/popup.ts
  document.addEventListener("DOMContentLoaded", async () => {
    const keys = await chrome.storage.local.get(["openai_key", "anthropic_key", "gemini_key"]);
    if (keys.openai_key)
      document.getElementById("openai_key").value = keys.openai_key;
    if (keys.anthropic_key)
      document.getElementById("anthropic_key").value = keys.anthropic_key;
    if (keys.gemini_key)
      document.getElementById("gemini_key").value = keys.gemini_key;
    document.getElementById("save")?.addEventListener("click", async () => {
      const openai = document.getElementById("openai_key").value.trim();
      const anthropic = document.getElementById("anthropic_key").value.trim();
      const gemini = document.getElementById("gemini_key").value.trim();
      await chrome.storage.local.set({
        openai_key: openai,
        anthropic_key: anthropic,
        gemini_key: gemini
      });
      const status = document.getElementById("status");
      status.textContent = "Settings Saved!";
      setTimeout(() => status.textContent = "", 2e3);
    });
  });
})();
//# sourceMappingURL=popup.js.map
