const form = document.querySelector("#reader-form");
const source = document.querySelector("#source");
const stop = document.querySelector("#stop");
const status = document.querySelector("#status");
const reading = document.querySelector("#reading");
const passage = document.querySelector("#passage");
const repeat = document.querySelector("#repeat");
const segmenter = new Intl.Segmenter("ru", { granularity: "word" });

let selectedText = "";
let playback;

function stopPlayback(message = "") {
  if (playback) {
    playback.request.abort();
    playback.audio.pause();
    playback.audio.removeAttribute("src");
    playback.audio.load();
    if (playback.url) URL.revokeObjectURL(playback.url);
    playback.word?.removeAttribute("aria-current");
    playback = undefined;
  }
  stop.disabled = true;
  status.textContent = message;
}

async function speak(text, word) {
  stopPlayback();
  const audio = new Audio();
  const request = new AbortController();
  const current = { audio, word, request };
  playback = current;
  word?.setAttribute("aria-current", "true");
  stop.disabled = false;
  status.textContent = "Preparando audio…";

  audio.addEventListener("playing", () => {
    if (playback === current) status.textContent = "Reproduciendo…";
  });
  audio.addEventListener("ended", () => {
    if (playback === current) stopPlayback();
  });
  audio.addEventListener("error", failed);
  function failed() {
    if (playback === current) stopPlayback("No se pudo reproducir el audio. Inténtalo de nuevo.");
  }

  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: text,
      signal: request.signal,
    });
    if (!response.ok) {
      const message = await response.text();
      if (playback === current) stopPlayback(message);
      return;
    }
    const wav = await response.blob();
    if (playback !== current) return;
    current.url = URL.createObjectURL(wav);
    audio.src = current.url;
    await audio.play();
  } catch {
    failed();
  }
}

function showPassage(text) {
  const content = document.createDocumentFragment();
  let firstWord;
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    if (!isWordLike) {
      content.append(segment);
      continue;
    }
    const word = document.createElement("span");
    word.className = "word";
    word.setAttribute("role", "button");
    word.tabIndex = firstWord ? -1 : 0;
    firstWord ??= word;
    word.textContent = segment;
    content.append(word);
  }
  passage.replaceChildren(content);
  selectedText = "";
  repeat.disabled = true;
  reading.hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = source.value;
  if (!text.trim()) return;
  showPassage(text);
  speak(text);
});

passage.addEventListener("click", (event) => {
  const word = event.target.closest(".word");
  if (word && window.getSelection().isCollapsed) speak(word.textContent, word);
});

passage.addEventListener("keydown", (event) => {
  const word = event.target.closest(".word");
  if (!word) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    speak(word.textContent, word);
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const next = event.key === "ArrowLeft" ? word.previousElementSibling : word.nextElementSibling;
    if (!next) return;
    event.preventDefault();
    word.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }
});

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (passage.contains(selection.anchorNode) && passage.contains(selection.focusNode)) {
    selectedText = selection.toString().trim();
    repeat.disabled = !selectedText;
  }
});

repeat.addEventListener("click", () => {
  if (selectedText) speak(selectedText);
});
stop.addEventListener("click", () => stopPlayback("Lectura detenida."));
