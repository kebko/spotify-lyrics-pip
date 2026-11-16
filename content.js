(() => {
  "use strict";
  if (document.getElementById("spotify-lyrics-pip-control")) return;

  const core = globalThis.SpotifyLyricsPiP;
  const STORAGE_KEY = "spotifyLyricsPipSettings";
  let settings = { ...core.DEFAULTS };
  let pipWindow = null;
  let opening = false;
  let observer = null;
  let lastRender = "";
  let pipLines = null;
  let pipStatus = null;
  let resizeTimer = null;
  let requestedFontSize = null;
  const forms = new Set();

  const host = document.createElement("div");
  host.id = "spotify-lyrics-pip-control";
  host.lang = "en";
  const shadow = host.attachShadow({ mode: "open" });
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `
    :host { all: initial; position: fixed; right: 18px; bottom: 104px;
      z-index: 2147483647; font: 13px system-ui, sans-serif; color: #fff; }
    :host([hidden]) { display: none !important; }
    .panel { max-width: 290px; padding: 8px; background: #181818;
      border: 1px solid #555; border-radius: 12px; box-shadow: 0 4px 18px #0006; }
    .buttons { display: flex; gap: 6px; }
    button, select { font: inherit; border: 1px solid #666; border-radius: 7px;
      padding: 6px 9px; color: #fff; background: #292929; cursor: pointer; }
    button.primary { background: #1ed760; color: #081c0d; font-weight: 700; }
    button:focus-visible, select:focus-visible { outline: 2px solid #1ed760; outline-offset: 2px; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    button.primary:disabled { cursor: wait; }
    form { display: grid; gap: 8px; padding-top: 10px; }
    label { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    [hidden] { display: none !important; }
    .status { margin: 8px 2px 2px; line-height: 1.4; }
  `;
  shadow.append(pageStyle);
  const panel = document.createElement("div");
  panel.className = "panel";
  const buttons = document.createElement("div");
  buttons.className = "buttons";
  const openButton = button(document, "Lyrics PiP", "primary");
  const settingsButton = button(document, "Settings");
  settingsButton.setAttribute("aria-expanded", "false");
  const hideButton = button(document, "Hide");
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("role", "status");
  status.hidden = true;
  const pageForm = settingsForm(document);
  pageForm.hidden = true;
  buttons.append(openButton, settingsButton, hideButton);
  panel.append(buttons, pageForm, status);
  shadow.append(panel);
  document.body.append(host);

  function button(doc, text, className = "") {
    const element = doc.createElement("button");
    element.type = "button";
    element.textContent = text;
    element.className = className;
    return element;
  }

  function report(message, error) {
    console.error(`Spotify Lyrics PiP: ${message}`, error);
    host.hidden = false;
    status.textContent = message;
    status.hidden = false;
  }

  function settingsForm(doc) {
    const form = doc.createElement("form");
    form.setAttribute("aria-label", "Lyrics settings");
    const fields = [
      ["lines", "Lines", core.LINE_COUNTS.map((value) => [value, String(value)])],
      ["theme", "Background", [["dark", "Dark"], ["light", "Light"], ["transparent", "Transparent"]]]
    ];
    for (const [name, title, choices] of fields) {
      const label = doc.createElement("label");
      label.append(doc.createTextNode(title));
      const select = doc.createElement("select");
      select.name = name;
      for (const [value, text] of choices) {
        const option = doc.createElement("option");
        option.value = String(value);
        option.textContent = text;
        select.append(option);
      }
      select.value = String(settings[name]);
      select.addEventListener("change", () => {
        settings = {
          ...settings,
          [name]: name === "theme" ? select.value : Number(select.value)
        };
        syncSettings();
        render();
        if (pipWindow && !pipWindow.closed && name === "lines") syncResizeFont();
        chrome.storage.local.set({ [STORAGE_KEY]: settings }).catch((error) =>
          report("Could not save settings.", error)
        );
      });
      label.append(select);
      form.append(label);
    }
    {
      const fontRow = doc.createElement("div");
      fontRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px";
      fontRow.append(doc.createTextNode("Font"));
      const controls = doc.createElement("div");
      controls.style.cssText = "display:flex;align-items:center;gap:4px";
      const minus = button(doc, "-");
      minus.dataset.fontStep = "-1";
      minus.setAttribute("aria-label", "Decrease font size");
      const value = doc.createElement("output");
      value.dataset.fontValue = "";
      value.setAttribute("aria-live", "polite");
      const plus = button(doc, "+");
      plus.dataset.fontStep = "1";
      plus.setAttribute("aria-label", "Increase font size");
      value.textContent = `${settings.fontSize}px`;
      minus.disabled = settings.fontSize <= 1;
      for (const control of [minus, plus]) {
        control.addEventListener("click", () => {
          if (requestedFontSize === null) updateActualFontSize();
          const displayedSize = Number((requestedFontSize ?? settings.fontSize).toFixed(2));
          const fontSize = Math.max(1, Number(control.dataset.fontStep) > 0
            ? Math.floor(displayedSize) + 1 : Math.ceil(displayedSize) - 1);
          settings = { ...settings, fontSize };
          if (!pipWindow || pipWindow.closed) delete settings.referenceHeight;
          syncSettings();
          render();
          if (pipWindow && !pipWindow.closed) {
            try {
              const view = pipWindow.document.defaultView;
              requestedFontSize = fontSize;
              pipWindow.resizeTo(view.outerWidth,
                Math.ceil(settings.lines * fontSize * 1.4) + 10 + Math.max(0, view.outerHeight - view.innerHeight));
              syncResizeFont();
            } catch (error) {
              requestedFontSize = null;
              report("Could not resize PiP. Resize the window manually.", error);
            }
          }
          chrome.storage.local.set({ [STORAGE_KEY]: settings }).catch((error) =>
            report("Could not save settings.", error));
        });
      }
      controls.append(minus, value, plus);
      fontRow.append(controls);
      form.insertBefore(fontRow, form.lastElementChild);
    }
    form.addEventListener("submit", (event) => event.preventDefault());
    forms.add(form);
    return form;
  }

  function syncSettings() {
    syncForms();
    if (pipWindow && !pipWindow.closed) {
      const root = pipWindow.document.documentElement;
      const changed = root.style.getPropertyValue("--line-count") !== String(settings.lines) ||
        root.style.getPropertyValue("--font-size") !== `${settings.fontSize}px`;
      root.dataset.theme = settings.theme;
      root.style.setProperty("--line-count", String(settings.lines));
      root.style.setProperty("--font-size", `${settings.fontSize}px`);
      if (changed) anchorFontSize();
    }
  }

  function syncForms() {
    for (const form of forms) {
      for (const select of form.querySelectorAll("select")) {
        select.value = String(settings[select.name]);
      }
      form.querySelector("[data-font-value]").textContent = `${Number(settings.fontSize.toFixed(2))}px`;
      form.querySelector('[data-font-step="-1"]').disabled = settings.fontSize <= 1;
      form.querySelector('[data-font-step="1"]').disabled = false;
    }
  }

  function updateActualFontSize() {
    if (!pipWindow || pipWindow.closed || !pipLines) return;
    let line = pipLines.querySelector(".line");
    const measureOnly = !line;
    if (measureOnly) {
      line = pipWindow.document.createElement("div");
      line.className = "line";
      pipLines.append(line);
    }
    let fontSize = parseFloat(pipWindow.document.defaultView.getComputedStyle(line).fontSize);
    if (measureOnly) line.remove();
    if (!Number.isFinite(fontSize) || fontSize < 1) {
      report("Could not read the current font size.", new Error("Invalid computed font size"));
      return;
    }
    if (Math.abs(fontSize - Math.round(fontSize)) < 0.001) fontSize = Math.round(fontSize);
    settings = { ...settings, fontSize,
      referenceHeight: Math.max(11, pipWindow.document.defaultView.innerHeight) };
    pipWindow.document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
    // Rebase without changing the current appearance or scale.
    anchorFontSize();
    syncForms();
  }

  function syncResizeFont() {
    if (requestedFontSize !== null) {
      settings = { ...settings, fontSize: requestedFontSize };
      anchorFontSize();
    }
    updateActualFontSize();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      if (requestedFontSize !== null) {
        settings = { ...settings, fontSize: requestedFontSize };
        anchorFontSize();
        updateActualFontSize();
      }
      requestedFontSize = null;
      chrome.storage.local.set({ [STORAGE_KEY]: settings }).catch((error) =>
        report("Could not save settings.", error));
    }, 200);
  }

  function anchorFontSize(height = pipWindow.document.defaultView.innerHeight) {
    pipWindow.document.documentElement.style.setProperty("--reference-height",
      String(Math.max(1, height - 10)));
    pipWindow.document.documentElement.style.setProperty("--font-scale",
      String(settings.fontSize / Math.max(1, height - 10)));
  }

  function render() {
    if (!pipWindow || pipWindow.closed || !pipLines) return;
    const snapshot = core.readLyrics(document);
    const rows = core.visibleLines(snapshot, settings.lines);
    const signature = JSON.stringify([snapshot.state, rows, settings]);
    if (signature === lastRender) return;
    lastRender = signature;
    pipLines.replaceChildren();
    pipStatus.hidden = snapshot.state === "ready";
    pipLines.hidden = snapshot.state !== "ready";
    pipStatus.textContent = snapshot.state === "unavailable"
      ? "Enable Lyrics in Spotify. Text cannot be shown if lyrics are unavailable."
      : "Waiting for the current line. Spotify must display synced lyrics.";
    for (const row of rows) {
      const line = pipWindow.document.createElement(row.current ? "strong" : "div");
      line.className = row.current ? "line current" : "line";
      line.textContent = row.text || "\u00a0";
      if (row.current) line.setAttribute("aria-current", "true");
      pipLines.append(line);
    }
  }

  function cleanup(closedWindow) {
    if (pipWindow !== closedWindow) return;
    if (resizeTimer !== null) {
      chrome.storage.local.set({ [STORAGE_KEY]: settings }).catch((error) =>
        report("Could not save settings.", error));
    }
    clearTimeout(resizeTimer);
    resizeTimer = null;
    requestedFontSize = null;
    observer?.disconnect();
    observer = null;
    for (const form of forms) {
      if (form.ownerDocument === closedWindow.document) forms.delete(form);
    }
    pipWindow = null;
    pipLines = null;
    pipStatus = null;
    lastRender = "";
    openButton.textContent = "Lyrics PiP";
  }

  function spotifyLyricsState(control = document.querySelector('button[data-testid="lyrics-button"]')) {
    const value = control?.getAttribute("aria-pressed") ??
      control?.getAttribute("data-active");
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  }

  function closeIfLyricsInactive() {
    if (opening || !pipWindow || pipWindow.closed || spotifyLyricsState() !== false) return;
    const currentWindow = pipWindow;
    currentWindow.close();
    cleanup(currentWindow);
  }

  async function setSpotifyLyrics(active, clickControl = true) {
    const selector = 'button[data-testid="lyrics-button"]';
    try {
      const control = document.querySelector(selector);
      if (!control) throw new Error("No se encuentra el boton lyrics-button");
      const current = spotifyLyricsState(control);
      if (current === active) return;
      if (current === null) throw new Error("Estado de Letras desconocido");
      if (control.disabled || control.getAttribute("aria-disabled") === "true") {
        throw new Error("Boton de Letras deshabilitado");
      }
      await new Promise((resolve, reject) => {
        const stateObserver = new MutationObserver(check);
        const timeout = setTimeout(() => {
          stateObserver.disconnect();
          reject(new Error("Spotify no confirmo el cambio de Letras"));
        }, 2000);
        function check() {
          if (spotifyLyricsState() !== active) return;
          clearTimeout(timeout);
          stateObserver.disconnect();
          resolve();
        }
        stateObserver.observe(document.body, {
          subtree: true, childList: true, attributes: true,
          attributeFilter: ["aria-pressed", "data-active"]
        });
        if (clickControl) control.click();
        check();
      });
    } catch (error) {
      report(active
        ? "Could not enable Lyrics in Spotify. Check the microphone button."
        : "Could not disable Lyrics in Spotify. Use the microphone button.", error);
    }
  }

  async function togglePiP(activateLyrics = true) {
    if (opening) return;
    if (pipWindow && !pipWindow.closed) {
      opening = true;
      openButton.disabled = true;
      status.hidden = true;
      const currentWindow = pipWindow;
      currentWindow.close();
      cleanup(currentWindow);
      await setSpotifyLyrics(false);
      opening = false;
      openButton.disabled = false;
      return;
    }
    if (!("documentPictureInPicture" in window)) {
      report("Chrome 116 or later on desktop is required to open this window.",
        new Error("Document Picture-in-Picture no disponible"));
      return;
    }
    opening = true;
    openButton.disabled = true;
    status.hidden = true;
    try {
      const initialHeight = settings.referenceHeight ??
        Math.max(64, Math.ceil(settings.lines * settings.fontSize * 1.4) + 8);
      // requestWindow must run before any await that could consume the user's activation.
      const opened = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: initialHeight
      });
      await settingsLoaded;
      pipWindow = opened;
      opened.addEventListener("pagehide", () => cleanup(opened), { once: true });
      const doc = opened.document;
      doc.title = "Lyrics PiP";
      doc.documentElement.lang = "en";
      const style = doc.createElement("style");
      style.textContent = `
        :root { color-scheme: dark; --line-count: 3; --font-size: 18px; --font-scale: .243243; --bg: #121212;
          --fg: #fff; --muted: #b3b3b3; }
        :root[data-theme="light"] { color-scheme: light; --bg: #fafafa;
          --fg: #111; --muted: #595959; }
        :root[data-theme="transparent"] { color-scheme: normal; --bg: transparent; }
        :root[data-theme="transparent"] .line,
        :root[data-theme="transparent"] .status { text-shadow: 0 1px 3px #000, 0 0 2px #000; }
        :root[data-theme="transparent"] form,
        :root[data-theme="transparent"] button,
        :root[data-theme="transparent"] select { background: #121212; }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--fg);
          font-family: system-ui, sans-serif; }
        main { min-height: 100vh; display: flex; flex-direction: column;
          justify-content: center; padding: 4px 6px; }
        .line { display: block; text-align: center;
          font-size: max(1px, min(
            calc((100vh - 10px) * var(--font-scale)),
            calc((100vh - 10px) / var(--line-count) / 1.4)));
          line-height: 1.4; color: var(--muted); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
        .current { color: var(--fg); font-weight: 750; }
        .status { text-align: center; font-size: 13px; line-height: 1.5;
          color: var(--muted); }
        .toolbar { position: fixed; top: 3px; right: 4px; opacity: 0; }
        body:hover .toolbar, .toolbar:focus-within { opacity: 1; }
        button, select { font: 12px system-ui, sans-serif; background: var(--bg);
          color: var(--fg); border: 1px solid var(--muted); border-radius: 5px;
          padding: 3px 6px; cursor: pointer; }
        button:focus-visible, select:focus-visible { outline: 2px solid #1ed760; }
        button:disabled { opacity: .6; cursor: not-allowed; }
        form { position: fixed; inset: 28px 8px auto; padding: 10px;
          background: var(--bg); border: 1px solid var(--muted); border-radius: 8px;
          display: grid; gap: 8px; }
        label { display: flex; justify-content: space-between; align-items: center;
          font-size: 13px; gap: 10px; }
        [hidden] { display: none !important; }
      `;
      doc.head.append(style);
      const main = doc.createElement("main");
      pipLines = doc.createElement("div");
      pipLines.setAttribute("aria-label", "Live lyrics");
      pipStatus = doc.createElement("div");
      pipStatus.className = "status";
      pipStatus.setAttribute("role", "status");
      const toolbar = doc.createElement("div");
      toolbar.className = "toolbar";
      const adjust = button(doc, "Settings");
      adjust.setAttribute("aria-expanded", "false");
      const form = settingsForm(doc);
      form.hidden = true;
      adjust.addEventListener("click", () => {
        form.hidden = !form.hidden;
        adjust.setAttribute("aria-expanded", String(!form.hidden));
      });
      toolbar.append(adjust);
      main.append(pipLines, pipStatus);
      doc.body.replaceChildren(main, toolbar, form);
      syncSettings();
      anchorFontSize(settings.referenceHeight ??
        Math.max(64, Math.ceil(settings.lines * settings.fontSize * 1.4) + 8));
      lastRender = "";
      render();
      opened.addEventListener("resize", () => {
        if (pipWindow === opened && !opened.closed) syncResizeFont();
      });
      syncResizeFont();
      observer = new MutationObserver((mutations) => {
        closeIfLyricsInactive();
        if (!pipWindow) return;
        const relevant = mutations.some(({ type, target }) =>
          type === "childList" ||
          target.nodeType === Node.TEXT_NODE ||
          (target instanceof Element && (
            target.matches(core.LINE_SELECTOR) ||
            target.closest(core.LINE_SELECTOR) ||
            target.querySelector(core.LINE_SELECTOR)
          ))
        );
        if (relevant) render();
      });
      observer.observe(document.body, {
        subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-current", "aria-pressed", "data-active", "data-testid"]
      });
      openButton.textContent = "Close PiP";
      await setSpotifyLyrics(true, activateLyrics);
    } catch (error) {
      if (pipWindow) {
        const failedWindow = pipWindow;
        failedWindow.close();
        cleanup(failedWindow);
      }
      report("Could not open PiP. Use desktop Chrome and click Lyrics PiP again; check browser permissions.", error);
    } finally {
      opening = false;
      openButton.disabled = false;
      closeIfLyricsInactive();
    }
  }

  openButton.addEventListener("click", () => togglePiP());
  // Capture the user's click before Spotify changes the button state or consumes activation.
  document.addEventListener("click", (event) => {
    if (!event.isTrusted || opening || (pipWindow && !pipWindow.closed)) return;
    const control = event.target instanceof Element
      ? event.target.closest('button[data-testid="lyrics-button"]')
      : null;
    if (!control || control.disabled || control.getAttribute("aria-disabled") === "true" ||
      spotifyLyricsState(control) !== false) return;
    void togglePiP(false);
  }, true);
  settingsButton.addEventListener("click", () => {
    pageForm.hidden = !pageForm.hidden;
    settingsButton.setAttribute("aria-expanded", String(!pageForm.hidden));
  });
  hideButton.addEventListener("click", () => { host.hidden = true; });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "spotify-lyrics-pip-show") {
      host.hidden = false;
      openButton.focus();
      sendResponse({ ok: true });
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    const value = changes[STORAGE_KEY].newValue;
    if (value === undefined) {
      settings = { ...core.DEFAULTS };
    } else if (core.validSettings(value)) {
      if (value.fontSize !== settings.fontSize || value.lines !== settings.lines) {
        requestedFontSize = null;
      }
      settings = { lines: value.lines, fontSize: value.fontSize, theme: value.theme,
        ...(value.referenceHeight === undefined ? {} : { referenceHeight: value.referenceHeight }) };
    } else {
      report("Saved settings are invalid.", new Error("Invalid settings"));
      return;
    }
    syncSettings();
    render();
  });
  const settingsLoaded = chrome.storage.local.get(STORAGE_KEY).then((stored) => {
    let value = stored[STORAGE_KEY];
    if (value === undefined) return;
    if (!core.validSettings(value)) {
      report("Saved settings are invalid. Select new settings.",
        new Error("Invalid settings"));
      return;
    }
    settings = { lines: value.lines, fontSize: value.fontSize, theme: value.theme,
      ...(value.referenceHeight === undefined ? {} : { referenceHeight: value.referenceHeight }) };
    syncSettings();
    render();
  }).catch((error) => report("Could not read saved settings.", error));
})();
