# Spotify Lyrics PiP

A Manifest V3 extension for **desktop Chrome 116 or later**. It copies
only the text Spotify Web already displays in Lyrics. It does not modify Spotify,
call APIs, download songs, or search for lyrics on external services.

## Installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder
   (`spotify-lyrics-pip`, the one containing `manifest.json`).
4. Open <https://open.spotify.com/> or reload the tab if it is already open.
5. Play a song.
6. Click the green **Lyrics PiP** button at the bottom right of Spotify.
   It automatically enables Lyrics if they are disabled.
   You can also use Spotify's Lyrics button directly: enabling it
   with a click (or the keyboard) opens PiP.

### Updating to 1.0.17

Background includes **Transparent** in both settings forms. The HTML content
does not paint a background, and lyrics retain light text with a shadow;
settings keep a dark background for readability. The selection is saved locally.
Chrome may composite the native PiP window over an opaque background: this option
does not guarantee that the desktop or other applications will be visible behind it,
and does not change the native window frame.

The buttons preserve the requested integer while Chrome finishes resizing
the window, even with rapid clicks. They do not release the reference size
on the first frame, which may arrive before the resize. Small numerical errors
in CSS calculations near integers are normalized.

Font displays the actual text size during resizing (up to two decimal places)
in both forms and saves it when resizing finishes. The buttons start from that
actual size, with no upper limit and a minimum of 1 px. For fractional values,
the first + click moves up to the next integer and - moves down to the previous
integer; subsequent clicks change the size by 1 px.
Closing PiP immediately after resizing also saves the size.
Font updates even while Spotify is waiting for the current line.
The previous 8-24 px range and migration from 28 to 24 px no longer apply.

When PiP reopens, the font automatically scales to the height restored by Chrome,
using the height saved alongside the font size as its reference.
At the same height, the font size is preserved rather than increasing on each reopening.
The extension waits for settings to load before calculating the scale. It does not
change the restored window size. Using the buttons still sets a new reference size.

Manual resizing increases and decreases the font proportionally.
The buttons set a new reference size and resize the window;
even if Chrome enforces a minimum height, they allow sizes such as 8 or 9 px.
From that reference height, resizing scales the text without cutting off rows.
Manually enlarging the window can increase the font beyond the selected value.

The interface is in English: **Lyrics PiP**, **Close PiP**, **Settings**, **Hide**,
**Lines**, **Font**, **Background**, **Dark**, **Light**, and **Transparent**.
Messages and accessibility labels are also in English. Song lyrics are not translated.

Disabled font buttons show a not-allowed cursor rather than a wait cursor.
The actual font respects the selected size even if Chrome prevents the window
from shrinking: 8, 9, and 10 px are distinct sizes. The font shrinks if there
is not enough room for the rows.

The duplicate Font row in Settings is fixed: it is created only once per form,
both in Spotify and in PiP.

The size selector is replaced with **- 18px +**, with **1 px** steps,
a **1 px** minimum, and no upper limit. Both forms save and share the value.
Clicking a button requests a height based on the rows and font size while
preserving the PiP window's width. Programmatic resizing requires Chrome 121 or later.
Chrome may enforce a minimum window size, but this does not increase the selected font.
Fractional sizes produced by resizing are displayed; the buttons move them to integers.

Enabling Lyrics with Spotify's button opens PiP using that same user gesture.
No additional click on Lyrics PiP is required. Disabling Lyrics still closes PiP
automatically. The extension does not intercept or cancel Spotify's original action.
Programmatic changes without a user gesture, and Lyrics already enabled when the
page loads, do not open PiP: Chrome requires user activation.

Disabling Lyrics with Spotify's button automatically closes PiP without clicking
that button again. The extension also detects when the button is replaced with
another button in the disabled state. A missing button is not treated as disabled,
and PiP is not closed while Lyrics are being enabled. If activation fails and
Spotify confirms the disabled state, PiP closes and the error message remains visible.

**Lyrics PiP** enables Lyrics if needed, once the window has opened.
**Close PiP** closes the window and disables Lyrics, even if you enabled them
manually. The extension checks `aria-pressed` or `data-active` on the
`data-testid="lyrics-button"` button before clicking it and confirms the change.
If the button is unavailable or Spotify does not respond, an error is shown.
If PiP fails to open, Lyrics are left unchanged. The native X only closes PiP
and does not change Lyrics.

Since 1.0.3, the font automatically grows or shrinks with the PiP height so that
all rows fit completely, including when the number of lines changes.
The extension does not lock Chrome's native resize border. **Font** determines
the initially requested height; the buttons also adjust the height while PiP is open.
Chrome may reuse the previous window size, in which case the font adapts to it.

Version 1.0.2 reduces PiP's inner padding to **4 px at the top/bottom and 6 px on each side**
and requests an initial height suited to the rows. Chrome may enforce a minimum
size or reuse the previous size: manually reduce the height if the window
is still too large. The native frame and title bar cannot be reduced by the extension.

Version 1.0.1 fixes the persistent "Waiting for the current line" message in
Spotify's observed `data-testid="lyrics-line"` layout. The current line uses
the `xp5WpqjB3u9hFHWKn2aE` class; past and future lines have different classes.
The fix is tested using that structure and synthetic text.

If you use this folder directly, click **Reload** on the extension's card
in `chrome://extensions`, then **reload the Spotify tab**.
If you installed a copy extracted from the ZIP, replace its files with the new
ones before reloading. Close and reopen PiP.

The floating window stays on top of other applications. You can move and resize
it using Chrome's native controls. Spotify must remain open with Lyrics enabled,
although you can switch tabs or applications.
Chrome requires a click inside Spotify to open PiP: it cannot open automatically
just because Lyrics become enabled.

## Settings

- **3 lines** by default: previous, current **in bold**, next.
- Choose **1, 3, 5, or 7 lines**, a font size starting at **1 px**, and a dark,
  light, or transparent background (HTML content). Settings are saved locally
  and shared across tabs.
- When resizing vertically, the font adjusts automatically without a fixed
  8-24 px limit. A very short window may produce small text.
- Use **Settings** in Spotify or in the PiP window itself (the button appears
  when you hover over the window or focus it with Tab).
- The window only displays lyrics; it does not include artwork or playback controls.
  Long lines are truncated with an ellipsis to preserve the number of rows:
  increase the width or reduce the height (and therefore the font size) to see them in full.
- Empty rows are reserved at the beginning and end to keep the current line centered.
- **Hide** hides the Spotify control without closing PiP. The extension icon
  shows the control again. **Close PiP** or the native X closes the window.

## Limitations and privacy

- Requires **synced** lyrics to be available for your song/account/region.
  It does not calculate timings or invent a current line if Spotify does not mark one.
- Disabling Lyrics, switching to a song without lyrics, or removing the panel
  shows a message instead of retaining the previous text.
- Reads Spotify's DOM selectors (`lyrics-lyricsContent-text`, `lyrics-line`,
  `fullscreen-lyric`, `active` / `highlight` states, known active classes from
  both layouts, and semantic attributes when available).
  If Spotify changes its interface, `lyrics.js` may need updating.
- PiP uses the Document Picture-in-Picture API, not a regular popup window.
  Chrome determines the minimum size and may close PiP when the source tab
  is closed or reloaded. Only one Document PiP window is allowed at a time.
- Synchronization follows actual DOM updates, including when pausing, seeking
  forward, or seeking backward. If Spotify stops updating lyrics in the background,
  the extension cannot reconstruct them on its own.
- Only requests the `storage` permission and runs on `https://open.spotify.com/*`.
  Lyrics are not saved or transmitted over the network.
- This is not an official extension and is not affiliated with Spotify.

## Local checks

Open `tests/index.html` in a browser. It uses synthetic text, not song lyrics,
and checks line selection, DOM changes, settings, and lifecycle behavior
with a simulated PiP API. These tests do not replace manual testing with
a Spotify session and a real PiP window.

Open `tests/native.html` and click **Lyrics PiP** to test the native PiP API
with synthetic text, without signing in to Spotify. Only storage is simulated.
Use desktop Chrome, not VS Code's integrated browser: it may expose the API
but reject opening the native window.

To check the real workflow: open PiP with Lyrics enabled, pause and resume,
seek to another position, change songs, disable/re-enable Lyrics, change
settings, and close/reopen PiP. Also check switching applications.
