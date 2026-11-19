import { errorMessage } from "./domain.js";
import { parseSkipList } from "./guard.js";
import {
  clearApiKey,
  loadSettings,
  saveApiKey,
  saveSettings,
} from "./storage.js";

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
  });
}

/**
 * Wire the shared Options / popup lookup settings form (badge mode and the
 * skip list). Call the returned `hydrate` whenever the form becomes visible.
 * @param {{
 *   form: HTMLFormElement,
 *   skipInput: HTMLTextAreaElement,
 *   statusEl: HTMLElement,
 * }} args
 * @returns {{ hydrate: () => Promise<void> }}
 */
export function bindLookupPrefsForm({ form, skipInput, statusEl }) {
  /** @returns {HTMLInputElement[]} */
  const modeInputs = () =>
    Array.from(form.querySelectorAll('input[name="badge-mode"]'));

  /** @param {import('./guard.js').LookupSettings} settings */
  const show = (settings) => {
    for (const input of modeInputs()) {
      input.checked = input.value === settings.badgeMode;
    }
    skipInput.value = settings.skipHosts.join("\n");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const typed = skipInput.value.split(/[\s,]+/).filter(Boolean).length;
    const checked = modeInputs().find((input) => input.checked);
    const saved = await saveSettings({
      badgeMode: checked?.value === "click" ? "click" : "auto",
      skipHosts: parseSkipList(skipInput.value),
    });
    show(saved);
    statusEl.textContent =
      saved.skipHosts.length < typed
        ? "Saved. Duplicate or unreadable entries were removed."
        : "Saved.";
  });

  return {
    hydrate: async () => {
      show(await loadSettings());
      statusEl.textContent = "";
    },
  };
}
