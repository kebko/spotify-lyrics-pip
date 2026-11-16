"use strict";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "spotify-lyrics-pip-show" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "Show the Lyrics PiP control in Spotify"
    });
  } catch (error) {
    console.warn("Spotify Lyrics PiP: could not connect to Spotify.", error);
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#b3261e" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "Open open.spotify.com and reload the tab to use Lyrics PiP."
    });
  }
});
