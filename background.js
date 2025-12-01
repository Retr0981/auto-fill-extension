// background.js - Service Worker

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🎯 AutoFill Pro v5.0 - AI Powered');
  
  // Initialize storage
  await chrome.storage.sync.set({
    userData: {},
    dataSources: { manual: false, ocr: false, browser: false, lastUpdated: null },
    stats: { formsFilled: 0, fieldsFilled: 0, lastFormType: null }
  });
  
  // Create context menu
  chrome.contextMenus.create({
    id: "smartFillContext",
    title: "🎯 Smart Fill Form",
    contexts: ["all"]
  });
});

// Context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "smartFillContext") {
    await executeSmartFill(tab);
  }
});

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'smart-fill') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && !tab.url.startsWith('chrome://')) {
      await executeSmartFill(tab);
    }
  }
});

// Execute smart fill
async function executeSmartFill(tab) {
  try {
    // Ensure scripts are injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['config.js', 'content.js']
    });
    
    // Get data
    const [syncResult, localResult] = await Promise.all([
      chrome.storage.sync.get(['userData']),
      chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'])
    ]);
    
    const data = syncResult.userData || {};
    
    if (!data.email && !data.firstName) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'AutoFill Pro',
        message: 'No profile data! Open extension to add data.'
      });
      return;
    }
    
    // Detect form type
    const formType = tab.url.toLowerCase().includes('job') || tab.url.toLowerCase().includes('apply') 
      ? 'jobApplication' : null;
    
    // Execute
    await chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: data,
      fieldMappings: FIELD_ALIASES,
      cvData: localResult.cvFile,
      cvFileName: localResult.cvFileName,
      cvFileType: localResult.cvFileType,
      formType: formType,
      intelligentMode: true
    });
    
    console.log('✅ Smart fill executed');
  } catch (error) {
    console.error('❌ Smart fill failed:', error);
  }
}

// Message router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "log") {
    console.log(`[Content] ${request.message}`, request.data || '');
  } else if (request.action === "error") {
    console.error(`[Content] ${request.message}`, request.data || '');
  }
  return true;
});