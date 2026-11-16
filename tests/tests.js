(async () => {
  "use strict";
  const core = globalThis.SpotifyLyricsPiP;
  const mock = globalThis.pipTestState;
  const fixture = document.getElementById("fixture");
  const output = document.getElementById("results");
  const results = [];
  const errors = [];
  const shadow = document.getElementById("spotify-lyrics-pip-control").shadowRoot;
  const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
  async function waitUntil(predicate) {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error("Timed out waiting for update");
      await tick();
    }
  }
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  async function test(name, run) {
    try {
      await run();
      results.push(`PASS ${name}`);
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
      results.push(`FAIL ${name}: ${error.message}`);
    }
    output.textContent = results.join("\n");
  }
  function populate({ active = 1, wrapped = false, knownRoot = true } = {}) {
    fixture.replaceChildren();
    const root = document.createElement("div");
    if (knownRoot) root.dataset.testid = "lyrics-container";
    for (let index = 0; index < 5; index++) {
      const line = document.createElement("div");
      line.className = "lyrics-lyricsContent-text";
      line.textContent = `Texto sintetico ${index}`;
      if (index === active) line.classList.add("lyrics-lyricsContent-active");
      if (wrapped) {
        const wrapper = document.createElement("div");
        wrapper.append(line);
        root.append(wrapper);
      } else {
        root.append(line);
      }
    }
    fixture.append(root);
    return Array.from(root.querySelectorAll(core.LINE_SELECTOR));
  }
  function currentPip() {
    return mock.windows.at(-1);
  }
  function populateObservedLayout() {
    fixture.replaceChildren();
    const viewport = document.createElement("div");
    viewport.setAttribute("data-overlayscrollbars-viewport", "scrollbarHidden overflowXHidden overflowYScroll");
    const root = document.createElement("div");
    for (let index = 0; index < 5; index++) {
      const line = document.createElement("div");
      line.dir = "auto";
      line.dataset.testid = "lyrics-line";
      line.className = "MFEBmMwUCW5Qmg8VwGim " + (index < 2
        ? "NToFVceZLenbhmfcDb3s JraMqx9ZQax6C3ZIaMn2"
        : index === 2 ? "xp5WpqjB3u9hFHWKn2aE" : "tixQoLB1xUrPglVJ91J4");
      const text = document.createElement("div");
      text.className = "tUO1WBVA3vpkKoCsTCU_";
      text.textContent = index < 2 ? "" : `Texto sintetico ${index}`;
      line.append(text);
      root.append(line);
    }
    viewport.append(root);
    fixture.append(viewport);
    return Array.from(root.children);
  }
  function rows() {
    return Array.from(currentPip().document.querySelectorAll(".line"));
  }
  await tick();
  await test("Configuracion valida y rechazo de valores fuera de rango", () => {
    assert(core.validSettings(core.DEFAULTS), "Defaults invalidos");
    for (const fontSize of [1, 7.25, 25, 100]) {
      assert(core.validSettings({ ...core.DEFAULTS, fontSize }), "Rechaza fuente valida");
    }
    for (const value of [null, {}, { lines: 2, fontSize: 18, theme: "dark" },
      { lines: 3, fontSize: "18", theme: "dark" }, { lines: 3, fontSize: 0, theme: "dark" },
      { lines: 3, fontSize: Infinity, theme: "dark" },
      { lines: 3, fontSize: NaN, theme: "dark" },
      { lines: 3, fontSize: 12, theme: "dark", referenceHeight: 10 },
      { lines: 3, fontSize: 12, theme: "dark", referenceHeight: Infinity },
      { lines: 3, fontSize: 18, theme: "unknown" }]) {
      assert(!core.validSettings(value), "Acepta configuracion invalida");
    }
  });
  await test("Tres filas: anterior, actual y siguiente", () => {
    populate();
    const snapshot = core.readLyrics(document);
    const result = core.visibleLines(snapshot, 3);
    assert(snapshot.current === 1 && result.length === 3, "Indice o numero incorrecto");
    assert(result.map((line) => line.text).join("|") ===
      "Texto sintetico 0|Texto sintetico 1|Texto sintetico 2", "Contenido incorrecto");
    assert(result[1].current && !result[0].current && !result[2].current, "Negrita incorrecta");
  });
  await test("Bordes y cantidades 1, 3, 5 y 7", () => {
    for (const current of [0, 4]) {
      populate({ active: current });
      for (const count of core.LINE_COUNTS) {
        const result = core.visibleLines(core.readLyrics(document), count);
        assert(result.length === count, "No mantiene filas");
        assert(result[Math.floor(count / 2)].text === `Texto sintetico ${current}`,
          "Actual no centrada");
        assert(result.filter((line) => line.current).length === 1, "Actual duplicada");
      }
    }
  });
  await test("Estados highlight acumulados y salto hacia atras", () => {
    const lines = populate({ active: -1 });
    lines[0].classList.add("lyrics-lyricsContent-highlight");
    lines[1].classList.add("lyrics-lyricsContent-highlight");
    assert(core.readLyrics(document).current === 1, "No usa ultimo highlight");
    lines[1].classList.remove("lyrics-lyricsContent-highlight");
    assert(core.readLyrics(document).current === 0, "Conserva estado anterior");
  });
  await test("Marcador en wrapper sin contenedor conocido", () => {
    const lines = populate({ active: -1, wrapped: true, knownRoot: false });
    lines[2].parentElement.setAttribute("aria-current", "true");
    const snapshot = core.readLyrics(document);
    assert(snapshot.current === 2 && snapshot.lines.length === 5, "Wrapper mal detectado");
  });
  await test("DOM fullscreen moderno sin duplicar texto anidado", () => {
    const lines = populate({ active: -1, knownRoot: false });
    for (const [index, line] of lines.entries()) {
      line.className = index < 3 ? "EhKgYshvOwpSrTv399Mw" : "otra-clase";
      line.dataset.testid = "fullscreen-lyric";
      const text = document.createElement("span");
      text.className = "lyrics-lyricsContent-text";
      text.textContent = line.textContent;
      line.replaceChildren(text);
    }
    const snapshot = core.readLyrics(document);
    assert(snapshot.current === 2 && snapshot.lines.length === 5, "Estado moderno incorrecto");
    assert(snapshot.lines[2] === "Texto sintetico 2", "Texto duplicado");
  });
  await test("Un solo panel aunque existan dos copias visibles", () => {
    populate();
    const duplicate = fixture.firstElementChild.cloneNode(true);
    fixture.append(duplicate);
    const snapshot = core.readLyrics(document);
    assert(snapshot.lines.length === 5 && snapshot.current === 1, "Mezcla paneles");
  });
  await test("No inventa actual; ignora panel oculto", () => {
    populate({ active: -1 });
    assert(core.readLyrics(document).state === "waiting", "Inventa indice");
    fixture.firstElementChild.hidden = true;
    assert(core.readLyrics(document).state === "unavailable", "Lee letras ocultas");
    fixture.replaceChildren();
    assert(core.readLyrics(document).state === "unavailable", "Conserva letras eliminadas");
  });
  await test("Regresion: DOM aportado por el usuario con lyrics-line y clase actual", () => {
    const lines = populateObservedLayout();
    const snapshot = core.readLyrics(document);
    assert(snapshot.state === "ready" && snapshot.current === 2, "No reconoce la clase actual real");
    const result = core.visibleLines(snapshot, 3);
    assert(result[0].text === "" && result[1].text === "Texto sintetico 2" &&
      result[1].current && result[2].text === "Texto sintetico 3", "Filas incorrectas");
    lines[2].classList.replace("xp5WpqjB3u9hFHWKn2aE", "tixQoLB1xUrPglVJ91J4");
    assert(core.readLyrics(document).state === "waiting", "Confunde futuras con actual");
  });
  await test("Apertura y renderizado PiP con texto seguro", async () => {
    const lines = populate();
    lines[1].textContent = "<img src=x onerror=alert(1)>";
    shadow.querySelector(".primary").click();
    await tick();
    assert(mock.requests.at(-1).width === 360 &&
      mock.requests.at(-1).height === Math.max(64, Math.ceil(core.DEFAULTS.lines * core.DEFAULTS.fontSize * 1.4) + 8),
      "Dimension inicial incorrecta");
    assert(rows().length === 3, "Numero de filas incorrecto");
    assert(rows()[1].tagName === "STRONG", "Actual no es strong");
    assert(rows()[1].textContent === "<img src=x onerror=alert(1)>", "Texto alterado");
    assert(!currentPip().document.querySelector("img"), "Interpreta texto como HTML");
    assert(document.querySelector('[data-testid="lyrics-button"]').getAttribute("aria-pressed") === "true",
      "Abrir PiP no activa Letras");
  });
  await test("Margenes PiP compactos sin recortar las tres filas", () => {
    const doc = currentPip().document;
    const view = doc.defaultView;
    const main = doc.querySelector("main");
    const style = view.getComputedStyle(main);
    assert(style.paddingTop === "4px" && style.paddingBottom === "4px" &&
      style.paddingLeft === "6px" && style.paddingRight === "6px",
      "Margenes no compactos");
    const contentHeight = rows().reduce((total, row) => total + row.getBoundingClientRect().height, 0);
    assert(contentHeight + 8 <= view.innerHeight, "La altura disponible recorta filas");
  });
  await test("Ajustes: una sola fila Fuente por formulario en Spotify y PiP", () => {
    for (const form of [shadow.querySelector("form"), currentPip().document.querySelector("form")]) {
      assert(form.querySelectorAll("[data-font-value]").length === 1, "Valor Fuente duplicado");
      assert(form.querySelectorAll('[data-font-step="-1"]').length === 1, "Boton menos duplicado");
      assert(form.querySelectorAll('[data-font-step="1"]').length === 1, "Boton mas duplicado");
      assert(form.querySelectorAll("select").length === 2, "Selectores Lineas y Fondo alterados");
    }
  });
  await test("Resize vertical: fuente crece y disminuye sin recortar filas", async () => {
    const doc = currentPip().document;
    const view = doc.defaultView;
    const frame = view.frameElement;
    const originalHeight = frame.style.height;
    for (const count of core.LINE_COUNTS) {
      mock.externalSettings({ lines: count, fontSize: 18, theme: "dark" });
      const referenceHeight = Number(doc.documentElement.style.getPropertyValue("--reference-height"));
      let previousSize = 0;
      for (const height of [64, 84, 156, 300]) {
        frame.style.height = `${height}px`;
        await tick();
        const viewportHeight = view.innerHeight;
        const size = parseFloat(view.getComputedStyle(rows()[0]).fontSize);
        const expected = Math.min(18 * (viewportHeight - 10) / referenceHeight,
          (viewportHeight - 10) / count / 1.4);
        assert(Math.abs(size - expected) < 0.02, "Fuente no respeta tamaño y espacio");
        assert(size > previousSize, `Fuente no crece al ampliar: ${count} filas a ${height}px`);
        previousSize = size;
        assert(rows().length === count, "Resize altera numero de filas");
        for (const row of rows()) {
          const rect = row.getBoundingClientRect();
          assert(rect.top >= 4 && rect.bottom <= viewportHeight - 4,
            `Fila recortada: ${count} filas a ${height}px`);
        }
        assert(doc.documentElement.scrollHeight <= viewportHeight, "Aparece scroll vertical");
      }
      frame.style.height = "64px";
      await tick();
      assert(view.innerHeight === 64, "Viewport simulado no se ha redimensionado");
      assert(parseFloat(view.getComputedStyle(rows()[0]).fontSize) <= previousSize,
        "Fuente no disminuye al encoger");
    }
    frame.style.height = originalHeight;
    mock.externalSettings({ lines: 3, fontSize: 18, theme: "dark" });
    await tick();
  });
  await test("Fuente real de 8, 9 y 10px aunque PiP no pueda encogerse", async () => {
    const doc = currentPip().document;
    const view = doc.defaultView;
    for (const fontSize of [10, 9, 8, 24]) {
      mock.externalSettings({ lines: 3, fontSize, theme: "dark" });
      assert(Math.abs(parseFloat(view.getComputedStyle(rows()[0]).fontSize) - fontSize) < 0.02,
        `Fuente real distinta de ${fontSize}px`);
      const form = doc.querySelector("form");
      if (fontSize === 1) {
        const selector = fontSize === 8 ? '[data-font-step="-1"]' : '[data-font-step="1"]';
        assert(view.getComputedStyle(form.querySelector(selector)).cursor === "not-allowed",
          "Cursor de espera en limite PiP");
        assert(getComputedStyle(shadow.querySelector(selector)).cursor === "not-allowed",
          "Cursor de espera en limite Spotify");
      }
    }
    mock.externalSettings({ lines: 3, fontSize: 18, theme: "dark" });
  });
  await test("Actualizacion por clase, texto y cambio de cancion", async () => {
    let lines = fixture.querySelectorAll(core.LINE_SELECTOR);
    lines[1].classList.remove("lyrics-lyricsContent-active");
    lines[2].classList.add("lyrics-lyricsContent-active");
    await tick();
    assert(rows()[1].textContent === "Texto sintetico 2", "No sigue clase actual");
    lines[2].firstChild.data = "Texto modificado";
    await tick();
    assert(rows()[1].textContent === "Texto modificado", "No sigue characterData");
    populate({ active: 3 });
    await tick();
    assert(rows()[1].textContent === "Texto sintetico 3", "Conserva cancion anterior");
  });
  await test("Desactivar y reactivar Letras con PiP abierto", async () => {
    fixture.firstElementChild.style.display = "none";
    await tick();
    assert(currentPip().document.querySelector(".status").textContent.includes("Enable Lyrics"),
      "No informa panel oculto");
    assert(currentPip().document.querySelectorAll(".line").length === 0, "Texto obsoleto");
    fixture.firstElementChild.style.display = "";
    await tick();
    assert(rows()[1].textContent === "Texto sintetico 3", "No recupera panel");
  });
  await test("Regresion PiP: sigue avance, retroceso y sustitucion del DOM real", async () => {
    const lines = populateObservedLayout();
    await tick();
    assert(rows().length === 3 && rows()[1].textContent === "Texto sintetico 2" &&
      rows()[1].tagName === "STRONG", "PiP no muestra la actual real");
    lines[2].classList.replace("xp5WpqjB3u9hFHWKn2aE", "NToFVceZLenbhmfcDb3s");
    lines[3].classList.replace("tixQoLB1xUrPglVJ91J4", "xp5WpqjB3u9hFHWKn2aE");
    await tick();
    assert(rows()[1].textContent === "Texto sintetico 3", "PiP no avanza");
    lines[3].classList.replace("xp5WpqjB3u9hFHWKn2aE", "tixQoLB1xUrPglVJ91J4");
    lines[2].classList.replace("NToFVceZLenbhmfcDb3s", "xp5WpqjB3u9hFHWKn2aE");
    await tick();
    assert(rows()[1].textContent === "Texto sintetico 2", "PiP no retrocede");
    populateObservedLayout();
    await tick();
    assert(rows()[1].textContent === "Texto sintetico 2", "PiP no sigue panel sustituido");
    populate({ active: 3 });
    await tick();
  });
  await test("Ajustes guardados y compartidos con PiP", async () => {
    const select = shadow.querySelector('select[name="lines"]');
    select.value = "5";
    select.dispatchEvent(new Event("change"));
    await tick();
    assert(rows().length === 5, "No aplica filas");
    assert(mock.stored.spotifyLyricsPipSettings.lines === 5, "No guarda");
    currentPip().document.querySelector('[data-font-step="1"]').click();
    await tick();
    assert(mock.stored.spotifyLyricsPipSettings.fontSize === 19, "No incrementa 1px");
    assert(mock.lastResize.height > 0, "No ajusta altura PiP");
    mock.externalSettings({ lines: 1, fontSize: 20, theme: "light" });
    await tick();
    assert(rows().length === 1, "No aplica cambios externos");
    assert(currentPip().document.documentElement.dataset.theme === "light", "Tema incorrecto");
    assert(currentPip().document.documentElement.style.getPropertyValue("--line-count") === "1",
      "Numero de filas para fuente adaptable incorrecto");
    assert(shadow.querySelector('[data-font-value]').textContent === "20px", "Formulario desincronizado");
  });
  await test("Background Transparent compartido, guardado y restaurado", async () => {
    const doc = currentPip().document;
    const select = shadow.querySelector('select[name="theme"]');
    assert(core.validSettings({ ...core.DEFAULTS, theme: "transparent" }), "Rechaza Transparent");
    assert(select.querySelector('option[value="transparent"]').textContent === "Transparent",
      "Falta opcion");
    const before = parseFloat(doc.defaultView.getComputedStyle(rows()[0]).fontSize);
    select.value = "transparent";
    select.dispatchEvent(new Event("change"));
    await tick();
    assert(doc.querySelector('select[name="theme"]').value === "transparent", "No sincroniza PiP");
    assert(mock.stored.spotifyLyricsPipSettings.theme === "transparent", "No guarda");
    assert(doc.defaultView.getComputedStyle(doc.body).backgroundColor === "rgba(0, 0, 0, 0)",
      "Contenido no transparente");
    assert(doc.defaultView.getComputedStyle(doc.querySelector("form")).backgroundColor === "rgb(18, 18, 18)",
      "Ajustes ilegibles");
    assert(Math.abs(parseFloat(doc.defaultView.getComputedStyle(rows()[0]).fontSize) - before) < 0.02,
      "Tema cambia fuente");
    currentPip().close();
    shadow.querySelector(".primary").click();
    await tick();
    const reopened = currentPip().document;
    assert(reopened.documentElement.dataset.theme === "transparent", "No restaura tema");
    const pipSelect = reopened.querySelector('select[name="theme"]');
    pipSelect.value = "dark";
    pipSelect.dispatchEvent(new Event("change"));
    await tick();
    assert(select.value === "dark" &&
      reopened.defaultView.getComputedStyle(reopened.body).backgroundColor === "rgb(18, 18, 18)",
      "No restaura fondo oscuro");
    mock.externalSettings({ lines: 1, fontSize: 20, theme: "light" });
  });
  await test("Botones de fuente: minimo 1px y sin limite de 24px", async () => {
    mock.externalSettings({ lines: 3, fontSize: 8, theme: "dark" });
    assert(!shadow.querySelector('[data-font-step="-1"]').disabled, "Impide menos de 8");
    shadow.querySelector('[data-font-step="1"]').click();
    await tick();
    assert(mock.stored.spotifyLyricsPipSettings.fontSize === 9, "Paso no es 1px");
    shadow.querySelector('[data-font-step="-1"]').click();
    await tick();
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - 8) < 0.02, "No decrementa");
    const view = currentPip().document.defaultView;
    view.frameElement.style.height = "200px";
    void view.innerHeight;
    await tick();
    mock.externalSettings({ lines: 3, fontSize: 24, theme: "dark" });
    assert(!shadow.querySelector('[data-font-step="1"]').disabled, "Impide mas de 24");
    shadow.querySelector('[data-font-step="1"]').click();
    await tick();
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - 25) < 0.02, "No supera 24");
    mock.externalSettings({ lines: 1, fontSize: 1, theme: "dark" });
    assert(shadow.querySelector('[data-font-step="-1"]').disabled, "Permite menos de 1");
    mock.externalSettings({ lines: 1, fontSize: 7.25, theme: "dark" });
    shadow.querySelector('[data-font-step="-1"]').click();
    await tick();
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - 7) < 0.02, "No baja al entero anterior");
    mock.externalSettings({ lines: 1, fontSize: 7.25, theme: "dark" });
    currentPip().document.querySelector('[data-font-step="1"]').click();
    await tick();
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - 8) < 0.02, "No sube al entero siguiente");
    currentPip().document.querySelector('[data-font-step="1"]').click();
    await tick();
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - 9) < 0.02, "No incrementa entero");
    mock.externalSettings({ lines: 1, fontSize: 20, theme: "light" });
  });
  await test("Botones decimales con resize tardio y clics rapidos", async () => {
    const doc = currentPip().document;
    const view = doc.defaultView;
    mock.resizeDelay = 80;
    try {
      for (const [start, steps, expected] of [
        [12.4, [1], 13], [12.4, [-1], 12],
        [12.4, [1, 1], 14], [12.4, [-1, -1], 11],
        [12.4, [1, -1], 12], [12.9999, [1], 14], [13.0001, [-1], 12]
      ]) {
        view.frameElement.style.height = "200px";
        void view.innerHeight;
        mock.externalSettings({ lines: 3, fontSize: start, theme: "dark" });
        mock.appliedResize = null;
        for (const step of steps) {
          doc.querySelector(`[data-font-step="${step}"]`).click();
        }
        await waitUntil(() => mock.appliedResize?.height === mock.lastResize.height);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const actual = parseFloat(view.getComputedStyle(rows()[0]).fontSize);
        assert(Math.abs(actual - expected) < 0.001, `Fuente ${actual}, esperaba ${expected}`);
        assert(shadow.querySelector("[data-font-value]").textContent === `${expected}px` &&
          doc.querySelector("[data-font-value]").textContent === `${expected}px`, "Vuelve a decimales");
        assert(mock.stored.spotifyLyricsPipSettings.fontSize === expected, "Guarda decimal tras resize");
      }
    } finally {
      delete mock.resizeDelay;
      mock.externalSettings({ lines: 1, fontSize: 20, theme: "light" });
    }
  });
  await test("Resize sincroniza valor real y almacenamiento sin alterar la escala", async () => {
    const doc = currentPip().document;
    const view = doc.defaultView;
    const frame = view.frameElement;
    frame.style.height = "320px";
    void view.innerHeight;
    view.dispatchEvent(new Event("resize"));
    await waitUntil(() => {
      const actual = parseFloat(view.getComputedStyle(rows()[0]).fontSize);
      return Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - actual) < 0.02 &&
        shadow.querySelector("[data-font-value]").textContent === `${Number(actual.toFixed(2))}px`;
    });
    const actual = parseFloat(view.getComputedStyle(rows()[0]).fontSize);
    assert(shadow.querySelector("[data-font-value]").textContent === `${Number(actual.toFixed(2))}px`,
      "Valor no sincronizado en Spotify");
    assert(doc.querySelector("[data-font-value]").textContent === `${Number(actual.toFixed(2))}px`,
      "Valor no sincronizado en PiP");
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - actual) < 0.02,
      "No guarda tamaño real");
    frame.style.height = "160px";
    void view.innerHeight;
    view.dispatchEvent(new Event("resize"));
    const finalSize = parseFloat(view.getComputedStyle(rows()[0]).fontSize);
    currentPip().close();
    assert(Math.abs(mock.stored.spotifyLyricsPipSettings.fontSize - finalSize) < 0.02,
      "Cerrar antes del debounce pierde el tamaño");
    shadow.querySelector(".primary").click();
    await tick();
    const reopened = currentPip().document;
    const reopenedSize = parseFloat(reopened.defaultView.getComputedStyle(rows()[0]).fontSize);
    assert(shadow.querySelector("[data-font-value]").textContent === `${Number(reopenedSize.toFixed(2))}px`,
      "Reabrir no sincroniza la fuente restaurada");
  });
  await test("Resize actualiza Font mientras espera letras sincronizadas", async () => {
    populate({ active: -1 });
    await tick();
    const doc = currentPip().document;
    const view = doc.defaultView;
    const before = parseFloat(doc.documentElement.style.getPropertyValue("--font-size"));
    const height = view.innerHeight;
    view.frameElement.style.height = `${height * 2}px`;
    void view.innerHeight;
    view.dispatchEvent(new Event("resize"));
    const after = parseFloat(doc.documentElement.style.getPropertyValue("--font-size"));
    assert(after > before && rows().length === 0, "No ajusta fuente sin lineas o deja una linea de prueba");
    assert(shadow.querySelector("[data-font-value]").textContent === `${Number(after.toFixed(2))}px` &&
      doc.querySelector("[data-font-value]").textContent === `${Number(after.toFixed(2))}px`,
      "Formularios desincronizados sin letras");
    populate({ active: 3 });
    await tick();
  });
  await test("Ocultar control e invocar icono", () => {
    Array.from(shadow.querySelectorAll("button")).find((item) => item.textContent === "Hide").click();
    const host = document.getElementById("spotify-lyrics-pip-control");
    assert(host.hidden && host.getClientRects().length === 0 && !currentPip().closed,
      "Ocultar no oculta visualmente el control o cierra PiP");
    mock.message({ type: "spotify-lyrics-pip-show" });
    assert(!host.hidden && host.getClientRects().length > 0, "Icono no restaura control");
  });
  await test("Cerrar y reabrir; observador desconectado", async () => {
    const oldPip = currentPip();
    oldPip.close();
    assert(shadow.querySelector(".primary").textContent === "Lyrics PiP", "No limpia boton");
    populate({ active: 0 });
    await tick();
    shadow.querySelector(".primary").click();
    await tick();
    assert(currentPip() !== oldPip && rows()[0].textContent === "Texto sintetico 0",
      "No reabre con estado nuevo");
    shadow.querySelector(".primary").click();
    assert(currentPip().closed, "Boton no cierra");
    await tick();
    assert(document.querySelector('[data-testid="lyrics-button"]').dataset.active === "false",
      "Cerrar PiP no desactiva Letras");
  });
  await test("Fallo PiP visible y recuperable", async () => {
    const clicks = mock.lyricsClicks;
    mock.failOpen = true;
    shadow.querySelector(".primary").click();
    await tick();
    assert(!shadow.querySelector(".status").hidden &&
      shadow.querySelector(".status").textContent.includes("Could not open"), "Error silencioso");
    assert(!shadow.querySelector(".primary").disabled, "Boton bloqueado");
    assert(mock.lyricsClicks === clicks, "Fallo de apertura cambia Letras");
    mock.failOpen = false;
    shadow.querySelector(".primary").click();
    await tick();
    assert(!currentPip().closed, "No recupera tras fallo");
    currentPip().close();
  });
  await test("Fallo al guardar visible", async () => {
    mock.failSave = true;
    const select = shadow.querySelector('select[name="lines"]');
    select.value = "3";
    select.dispatchEvent(new Event("change"));
    await tick();
    assert(shadow.querySelector(".status").textContent.includes("Could not save"),
      "Error al guardar silencioso");
    mock.failSave = false;
  });
  await test("Icono: comunica error en otra pestana y recupera titulo", async () => {
    mock.failMessage = true;
    await mock.actionClick({ id: 7 });
    assert(mock.actionState.badge === "!" && mock.actionState.title.includes("reload"),
      "Error del icono no visible");
    mock.failMessage = false;
    document.getElementById("spotify-lyrics-pip-control").hidden = true;
    await mock.actionClick({ id: 7 });
    assert(mock.actionState.badge === "" && mock.actionState.title.includes("Show the"),
      "No restaura titulo y badge");
    assert(!document.getElementById("spotify-lyrics-pip-control").hidden, "No muestra control");
  });
  await test("API ausente: error visible sin bloquear boton", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "documentPictureInPicture");
    delete window.documentPictureInPicture;
    shadow.querySelector(".primary").click();
    await tick();
    assert(shadow.querySelector(".status").textContent.includes("Chrome 116") &&
      !shadow.querySelector(".primary").disabled, "Fallo de compatibilidad silencioso");
    Object.defineProperty(window, "documentPictureInPicture", descriptor);
  });
  await test("Letras ya activadas: no invierte el estado; X nativa no desactiva", async () => {
    const control = document.querySelector('[data-testid="lyrics-button"]');
    control.dataset.active = "true";
    control.setAttribute("aria-pressed", "true");
    const clicks = mock.lyricsClicks;
    shadow.querySelector(".primary").click();
    await tick();
    assert(mock.lyricsClicks === clicks && control.dataset.active === "true", "Desactiva al abrir");
    currentPip().close();
    assert(mock.lyricsClicks === clicks && control.dataset.active === "true", "X modifica Letras");
  });
  await test("Cerrar con Letras ya desactivadas no las activa", async () => {
    shadow.querySelector(".primary").click();
    await tick();
    const control = document.querySelector('[data-testid="lyrics-button"]');
    control.dataset.active = "false";
    control.setAttribute("aria-pressed", "false");
    const clicks = mock.lyricsClicks;
    shadow.querySelector(".primary").click();
    await tick();
    assert(mock.lyricsClicks === clicks && control.dataset.active === "false", "Cerrar activa Letras");
  });
  await test("Desactivar desde Spotify cierra PiP sin volver a activar Letras", async () => {
    shadow.querySelector(".primary").click();
    await tick();
    const control = document.querySelector('[data-testid="lyrics-button"]');
    control.click();
    const clicks = mock.lyricsClicks;
    await tick();
    assert(currentPip().closed && mock.lyricsClicks === clicks && control.dataset.active === "false",
      "No cierra PiP o vuelve a pulsar Spotify");
    assert(shadow.querySelector(".primary").textContent === "Lyrics PiP", "No restaura control");
  });
  await test("Cambio solo de aria-pressed o data-active tambien cierra PiP", async () => {
    const control = document.querySelector('[data-testid="lyrics-button"]');
    for (const attribute of ["aria-pressed", "data-active"]) {
      shadow.querySelector(".primary").click();
      await tick();
      if (attribute === "data-active") control.removeAttribute("aria-pressed");
      control.setAttribute(attribute, "false");
      const clicks = mock.lyricsClicks;
      await tick();
      assert(currentPip().closed && mock.lyricsClicks === clicks, `No detecta ${attribute}`);
      control.setAttribute("aria-pressed", "false");
      control.dataset.active = "false";
    }
  });
  await test("Sustitucion de boton: cierra si es inactivo, no si falta", async () => {
    shadow.querySelector(".primary").click();
    await tick();
    const control = document.querySelector('[data-testid="lyrics-button"]');
    control.remove();
    await tick();
    assert(!currentPip().closed, "Interpreta ausencia como inactividad");
    const replacement = control.cloneNode(true);
    replacement.dataset.active = "false";
    replacement.setAttribute("aria-pressed", "false");
    document.body.append(replacement);
    await tick();
    assert(currentPip().closed, "No detecta boton sustituido");
    replacement.remove();
    control.dataset.active = "false";
    control.setAttribute("aria-pressed", "false");
    document.body.append(control);
  });
  await test("Boton ausente conserva PiP; boton deshabilitado e inactivo cierra con aviso", async () => {
    const control = document.querySelector('[data-testid="lyrics-button"]');
    control.remove();
    shadow.querySelector(".primary").click();
    await tick();
    assert(!currentPip().closed && shadow.querySelector(".status").textContent.includes("enable Lyrics"),
      "Boton ausente no informa error o cierra PiP");
    currentPip().close();
    document.body.append(control);
    control.disabled = true;
    const clicks = mock.lyricsClicks;
    shadow.querySelector(".primary").click();
    await tick();
    assert(mock.lyricsClicks === clicks && shadow.querySelector(".status").textContent.includes("enable Lyrics"),
      "Boton deshabilitado no informa error");
    assert(currentPip().closed, "Conserva PiP con Letras desactivadas");
    currentPip().close();
    control.disabled = false;
  });
  await test("Spotify no confirma cambio: error y boton recuperable", async () => {
    mock.ignoreLyricsClick = true;
    shadow.querySelector(".primary").click();
    await new Promise((resolve) => setTimeout(resolve, 2100));
    assert(!shadow.querySelector(".primary").disabled &&
      shadow.querySelector(".status").textContent.includes("enable Lyrics"), "Fallo silencioso o bloqueo");
    assert(currentPip().closed, "Fallo de activacion conserva PiP con Letras desactivadas");
    mock.ignoreLyricsClick = false;
    currentPip().close();
  });
  await test("Activacion programatica sin gesto no abre PiP", () => {
    const control = document.querySelector('[data-testid="lyrics-button"]');
    const requests = mock.requests.length;
    control.click();
    assert(mock.requests.length === requests && currentPip().closed,
      "Click sintetico abre PiP sin gesto");
    control.click();
  });
  await test("Reabrir PiP adapta la fuente a la altura restaurada por Chrome", async () => {
    for (const height of [84, 300, 64]) {
      mock.externalSettings({ lines: 3, fontSize: 12, theme: "dark" });
      mock.restoredHeight = height;
      shadow.querySelector(".primary").click();
      await tick();
      const doc = currentPip().document;
      const view = doc.defaultView;
      const requestedHeight = mock.requests.at(-1).height;
      const expected = Math.min(12 * (height - 10) / (requestedHeight - 10), (height - 10) / 3 / 1.4);
      assert(Math.abs(parseFloat(view.getComputedStyle(rows()[0]).fontSize) - expected) < 0.02,
        "Fuente no se adapta al tamaño restaurado");
      assert(view.innerHeight === height, "Cambia el tamaño restaurado");
      currentPip().close();
    }
    delete mock.restoredHeight;
  });
  await test("Reaperturas conservan fuente y escalan desde la altura guardada", async () => {
    mock.externalSettings({ lines: 3, fontSize: 9.25, theme: "dark", referenceHeight: 300 });
    try {
      for (const height of [300, 300, 150, 300]) {
        mock.restoredHeight = height;
        shadow.querySelector(".primary").click();
        await tick();
        const doc = currentPip().document;
        const actual = parseFloat(doc.defaultView.getComputedStyle(rows()[0]).fontSize);
        const expected = 9.25 * (height - 10) / 290;
        assert(Math.abs(actual - expected) < 0.02, "Fuente deriva al reabrir");
        assert(shadow.querySelector("[data-font-value]").textContent === `${Number(actual.toFixed(2))}px`,
          "Font no coincide con fuente restaurada");
        currentPip().close();
        assert(mock.stored.spotifyLyricsPipSettings.referenceHeight === height, "No guarda altura de referencia");
      }
    } finally {
      if (!currentPip().closed) currentPip().close();
      delete mock.restoredHeight;
    }
  });
  await test("Nueva pestaña espera ajustes antes de escalar la fuente restaurada", async () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    try {
      const doc = frame.contentDocument;
      const view = frame.contentWindow;
      doc.body.innerHTML = '<div class="lyrics-lyricsContent-text lyrics-lyricsContent-active">Synthetic line</div>';
      async function load(path) {
        const script = doc.createElement("script");
        script.src = new URL(path, document.baseURI).href;
        const loaded = new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Cannot load ${path}`));
        });
        doc.head.append(script);
        await loaded;
      }
      await load("mock.js");
      const state = view.pipTestState;
      state.stored.spotifyLyricsPipSettings = {
        lines: 3, fontSize: 8.5, theme: "light", referenceHeight: 300
      };
      state.restoredHeight = 300;
      state.getDelay = 150;
      await load("../lyrics.js");
      await load("../content.js");
      const controls = doc.getElementById("spotify-lyrics-pip-control").shadowRoot;
      controls.querySelector(".primary").click();
      await waitUntil(() => controls.querySelector(".primary").textContent === "Close PiP");
      const pip = state.windows.at(-1);
      const actual = parseFloat(pip.document.defaultView.getComputedStyle(pip.document.querySelector(".line")).fontSize);
      assert(Math.abs(actual - 8.5) < 0.02, "Abrir usa defaults o pierde referencia guardada");
      assert(pip.document.documentElement.dataset.theme === "light", "Ignora ajustes al abrir");
      pip.close();
    } finally {
      frame.remove();
    }
  });
  const summary = `${results.length - errors.length}/${results.length} pruebas correctas`;
  output.textContent += `\n\n${summary}`;
  document.title = errors.length ? `FAIL: ${summary}` : `PASS: ${summary}`;
  globalThis.pipTestResults = { total: results.length, failures: errors, results };
})();
