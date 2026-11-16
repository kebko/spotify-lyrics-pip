(() => {
  "use strict";

  const LINE_SELECTOR = '[class*="lyrics-lyricsContent-text"], [data-testid="lyrics-line"], ' +
    '[data-testid="fullscreen-lyric"]';
  const DEFAULTS = Object.freeze({ lines: 3, fontSize: 12, theme: "dark" });
  const LINE_COUNTS = [1, 3, 5, 7];
  const FONT_SIZES = Array.from({ length: 17 }, (_, index) => index + 8);

  function validSettings(value) {
    return value !== null && typeof value === "object" &&
      LINE_COUNTS.includes(value.lines) &&
      Number.isFinite(value.fontSize) && value.fontSize >= 1 &&
      (value.referenceHeight === undefined ||
        (Number.isFinite(value.referenceHeight) && value.referenceHeight > 10)) &&
      ["dark", "light", "transparent"].includes(value.theme);
  }

  function hasState(line, pattern, attribute) {
    for (let node = line; node && node !== line.parentElement?.parentElement; node = node.parentElement) {
      if (Array.from(node.classList).some((name) => pattern.test(name))) return true;
      if (attribute && attribute(node)) return true;
    }
    return false;
  }

  function readLyrics(doc) {
    const lines = Array.from(doc.querySelectorAll(LINE_SELECTOR)).filter((line) =>
      !line.parentElement?.closest(LINE_SELECTOR) &&
      line.getClientRects().length > 0 &&
      line.checkVisibility({ checkVisibilityCSS: true })
    );
    if (!lines.length) return { state: "unavailable", lines: [], current: -1 };

    // Limit the selection to one visible lyrics panel, not a second sidebar copy.
    const explicitCurrent = lines.find((line) =>
      hasState(line, /(?:^|-)lyricsContent-active(?:$|_)/, (node) =>
        ["true", "step"].includes(node.getAttribute("aria-current")) ||
        node.getAttribute("data-active") === "true"
      ) ||
      // Observed in Spotify's lyrics-line layout; passed and future lines use other classes.
      (line.matches('[data-testid="lyrics-line"]') &&
        line.classList.contains("xp5WpqjB3u9hFHWKn2aE"))
    );
    const highlights = lines.filter((line) =>
      hasState(line, /(?:^|-)lyricsContent-highlight(?:$|_)/) ||
      // Spotify also ships hashed classes in its fullscreen lyrics layout.
      (line.matches('[data-testid="fullscreen-lyric"]') &&
        hasState(line, /^EhKgYshvOwpSrTv399Mw$/))
    );
    const anchor = explicitCurrent || highlights.at(-1) || lines[0];
    let root = anchor.closest(
      '[data-testid="lyrics-container"], [data-testid="lyrics-content"], ' +
      '[class*="lyrics-lyricsContent-lyrics"], [class*="lyrics-lyricsContent-content"]'
    );
    if (!root) {
      root = anchor.parentElement;
      while (root.parentElement && !lines.every((line) => root.contains(line))) {
        root = root.parentElement;
      }
    }
    const panelLines = lines.filter((line) => root.contains(line));
    const current = panelLines.indexOf(explicitCurrent || highlights.at(-1));
    return {
      state: current < 0 ? "waiting" : "ready",
      lines: panelLines.map((line) => line.textContent.replace(/\s+/g, " ").trim()),
      current
    };
  }

  function visibleLines(snapshot, count) {
    if (snapshot.state !== "ready") return [];
    const radius = Math.floor(count / 2);
    return Array.from({ length: count }, (_, slot) => {
      const index = snapshot.current + slot - radius;
      return {
        text: snapshot.lines[index] ?? "",
        current: index === snapshot.current
      };
    });
  }

  globalThis.SpotifyLyricsPiP = Object.freeze({
    DEFAULTS, LINE_COUNTS, FONT_SIZES, LINE_SELECTOR, validSettings, readLyrics, visibleLines
  });
})();
