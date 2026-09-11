import { errorMessage } from "./domain.js";
import { clearApiKey, saveApiKey } from "./storage.js";

/**
 * @param {string} key
 * @returns {Promise<{ ok: true, message: string } | { ok: false, message: string }>}
 */
export async function saveValidatedApiKey(key) {
  const trimmed = key.trim();
  if (!trimmed) {
    return { ok: false, message: errorMessage({ kind: "missing_key" }) };
  }

  /** @type {import('./domain.js').FetchResult | undefined} */
  let result;
  try {
    result = await chrome.runtime.sendMessage({
      type: "key.validate",
      key: trimmed,
    });
  } catch {
    return {
      ok: false,
      message: errorMessage({
        kind: "network",
        detail: "Could not reach the lookup service.",
      }),
    };
  }

  if (!result || !result.ok) {
    const error = result?.error || {
      kind: "network",
      detail: "Could not validate the API key.",
    };
    return { ok: false, message: errorMessage(error) };
  }

  await saveApiKey(trimmed);
  chrome.runtime.sendMessage({ type: "badge.refresh" });
  return { ok: true, message: "Saved locally." };
}

/**
 * Wire the shared Options / popup key form.
 * @param {{
 *   form: HTMLFormElement,
 *   input: HTMLInputElement,
 *   clearBtn: HTMLElement,
 *   statusEl: HTMLElement,
 *   showKeyToggle: HTMLInputElement | null,
 *   onSaved?: () => void | Promise<void>,
 * }} args
 */
export function bindKeyForm({
  form,
  input,
  clearBtn,
  statusEl,
  showKeyToggle,
  onSaved,
}) {
  if (showKeyToggle) {
    showKeyToggle.addEventListener("change", () => {
      input.type = showKeyToggle.checked ? "text" : "password";
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.classList.remove("is-error");
    statusEl.textContent = "Checking key…";
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true;
    }
    try {
      const result = await saveValidatedApiKey(input.value);
      statusEl.textContent = result.message;
      statusEl.classList.toggle("is-error", !result.ok);
      if (result.ok && onSaved) {
        await onSaved();
      }
    } finally {
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false;
      }
    }
  });

  clearBtn.addEventListener("click", async () => {
    await clearApiKey();
    input.value = "";
    statusEl.classList.remove("is-error");
    statusEl.textContent = "Cleared.";
    chrome.runtime.sendMessage({ type: "badge.refresh" });
  });
}
