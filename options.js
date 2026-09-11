import { loadApiKey } from "./lib/storage.js";
import { bindKeyForm } from "./lib/settings.js";

const form = document.getElementById("form");
const input = document.getElementById("api-key");
const clearBtn = document.getElementById("clear");
const statusEl = document.getElementById("status");
const showKeyToggle = document.getElementById("show-key");

async function hydrate() {
  const key = await loadApiKey();
  input.value = key;
}

bindKeyForm({
  form,
  input,
  clearBtn,
  statusEl,
  showKeyToggle: showKeyToggle instanceof HTMLInputElement ? showKeyToggle : null,
});

hydrate();
