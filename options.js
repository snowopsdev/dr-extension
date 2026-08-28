import { clearApiKey, loadApiKey, saveApiKey } from "./lib/storage.js";

const form = document.getElementById("form");
const input = document.getElementById("api-key");
const clearBtn = document.getElementById("clear");
const statusEl = document.getElementById("status");

async function hydrate() {
  const key = await loadApiKey();
  input.value = key;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveApiKey(input.value);
  statusEl.textContent = "Saved.";
  chrome.runtime.sendMessage({ type: "badge.refresh" });
});

clearBtn.addEventListener("click", async () => {
  await clearApiKey();
  input.value = "";
  statusEl.textContent = "Cleared.";
  chrome.runtime.sendMessage({ type: "badge.refresh" });
});

hydrate();
