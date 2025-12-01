chrome.commands.onCommand.addListener((command) => {
  if (command === "smart-fill") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "fillForm" });
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "smartFill",
    title: "Smart Fill Form",
    contexts: ["editable"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "smartFill") {
    chrome.tabs.sendMessage(tab.id, { action: "fillForm" });
  }
});