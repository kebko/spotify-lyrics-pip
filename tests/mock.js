(() => {
  "use strict";
  const storageListeners = [];
  const messageListeners = [];
  const stored = {};
  const state = {
    stored, windows: [], requests: [], failOpen: false, failSave: false,
    failMessage: false, actionState: {}
  };
  globalThis.chrome = {
    action: {
      onClicked: { addListener: (listener) => { state.actionClick = listener; } },
      setBadgeText: async (value) => { state.actionState.badge = value.text; },
      setBadgeBackgroundColor: async (value) => { state.actionState.badgeColor = value.color; },
      setTitle: async (value) => { state.actionState.title = value.title; }
    },
    tabs: {
      sendMessage: async (_id, message) => {
        if (state.failMessage) throw new Error("Pestana no compatible");
        state.message(message);
      }
    },
    runtime: { onMessage: { addListener: (listener) => messageListeners.push(listener) } },
    storage: {
      onChanged: { addListener: (listener) => storageListeners.push(listener) },
      local: {
        get: async (key) => {
          if (state.getDelay) await new Promise((resolve) => setTimeout(resolve, state.getDelay));
          return { [key]: stored[key] };
        },
        set: async (values) => {
          if (state.failSave) throw new Error("Fallo simulado al guardar");
          for (const [key, value] of Object.entries(values)) {
            const oldValue = stored[key];
            stored[key] = structuredClone(value);
            storageListeners.forEach((listener) =>
              listener({ [key]: { oldValue, newValue: stored[key] } }, "local")
            );
          }
        }
      }
    }
  };
  state.message = (message) => messageListeners.forEach((listener) => listener(message, {}, () => {}));
  state.externalSettings = (value) => {
    stored.spotifyLyricsPipSettings = value;
    storageListeners.forEach((listener) =>
      listener({ spotifyLyricsPipSettings: { newValue: value } }, "local")
    );
  };
  globalThis.pipTestState = state;
  const lyricsButton = document.createElement("button");
  lyricsButton.dataset.testid = "lyrics-button";
  lyricsButton.textContent = "Letras Spotify simuladas";
  lyricsButton.dataset.active = "false";
  lyricsButton.setAttribute("aria-pressed", "false");
  state.lyricsClicks = 0;
  lyricsButton.addEventListener("click", () => {
    state.lyricsClicks++;
    if (state.ignoreLyricsClick) return;
    const active = lyricsButton.getAttribute("aria-pressed") !== "true";
    lyricsButton.dataset.active = String(active);
    lyricsButton.setAttribute("aria-pressed", String(active));
  });
  document.body.append(lyricsButton);
  if (document.documentElement.dataset.mockPip === "false") return;
  Object.defineProperty(window, "documentPictureInPicture", {
    configurable: true,
    value: {
      requestWindow: async (options) => {
        if (state.failOpen) throw new Error("Fallo simulado al abrir");
        state.requests.push(options);
        const frame = document.createElement("iframe");
        frame.title = "PiP simulado";
        if (state.restoredHeight) frame.style.height = `${state.restoredHeight}px`;
        document.body.append(frame);
        const events = new EventTarget();
        frame.contentWindow.addEventListener("resize", () => events.dispatchEvent(new Event("resize")));
        const pip = {
          document: frame.contentDocument,
          closed: false,
          addEventListener: events.addEventListener.bind(events),
          resizeTo(width, height) {
            state.lastResize = { width, height };
            const applyResize = () => {
              if (pip.closed) return;
              frame.style.width = `${width}px`;
              frame.style.height = `${height}px`;
              void frame.contentWindow.innerHeight;
              events.dispatchEvent(new Event("resize"));
              state.appliedResize = { width, height };
            };
            if (state.resizeDelay) setTimeout(applyResize, state.resizeDelay);
            else applyResize();
          },
          close() {
            if (pip.closed) return;
            pip.closed = true;
            events.dispatchEvent(new Event("pagehide"));
            frame.remove();
          }
        };
        state.windows.push(pip);
        return pip;
      }
    }
  });
})();
