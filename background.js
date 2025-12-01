// background.js - Service Worker for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "smart-fill") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Send fill command to content script
      chrome.tabs.sendMessage(tabs[0].id, { action: "fillForm" });
    });
  }
});