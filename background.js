// background.js - Enhanced Service Worker with AI Features

// Import configuration (will be available from config.js)
let fieldAliases = {};

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🎯 AutoFill Pro v5.0 - AI Powered');
  
  // Initialize storage with structure
  await chrome.storage.sync.set({
    userData: {},
    dataSources: {
      manual: false,
      ocr: false,
      browser: false,
      lastUpdated: null
    },
    stats: {
      formsFilled: 0,
      fieldsFilled: 0,
      lastFormType: null
    }
  });
  
  // Create context menu
  chrome.contextMenus.create({
    id: "smartFillContext",
    title: "🎯 Smart Fill Form",
    contexts: ["all"]
  });
  
  // Inject content script into existing tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    if (tab.url && !tab.url.startsWith('chrome://')) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['config.js', 'content.js']
      }).catch(() => {}); // Ignore errors
    }
  });
});

// Context menu handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "smartFillContext") {
    await executeSmartFill(tab);
  }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'smart-fill') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && !tab.url.startsWith('chrome://')) {
      await executeSmartFill(tab);
    }
  }
});

// Execute smart fill with error handling
async function executeSmartFill(tab) {
  try {
    // Ensure scripts are injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['config.js', 'content.js']
    });
    
    // Get data from storage
    const [syncResult, localResult] = await Promise.all([
      chrome.storage.sync.get(['userData', 'dataSources']),
      chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'])
    ]);
    
    const data = syncResult.userData || {};
    
    if (!data.email && !data.firstName) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'AutoFill Pro',
        message: 'No profile data! Open extension to add data.'
      });
      return;
    }
    
    // Detect form type before sending
    const response = await chrome.tabs.sendMessage(tab.id, { action: "detectFormType" });
    const formType = response?.formType;
    
    // Send smart fill command
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
    
    // Update stats
    await updateStats(formType);
    
    console.log('✅ Smart fill executed successfully');
  } catch (error) {
    console.error('❌ Smart fill failed:', error);
    
    // Retry with injection
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.location.reload();
        }
      });
      
      setTimeout(() => executeSmartFill(tab), 1000);
    } catch (e) {
      console.error('❌ Recovery failed:', e);
    }
  }
}

// Update statistics
async function updateStats(formType) {
  const stats = await chrome.storage.sync.get(['stats']);
  const currentStats = stats.stats || { formsFilled: 0, fieldsFilled: 0 };
  
  currentStats.formsFilled++;
  currentStats.lastFormType = formType;
  currentStats.lastFilled = new Date().toISOString();
  
  await chrome.storage.sync.set({ stats: currentStats });
}

// Message router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "log") {
    console.log(`[Content] ${request.message}`, request.data || '');
  } else if (request.action === "error") {
    console.error(`[Content] ${request.message}`, request.data || '');
  } else if (request.action === "getFieldMappings") {
    sendResponse({ fieldMappings: FIELD_ALIASES });
  } else if (request.action === "detectFormType") {
    // Simple detection for background
    const url = sender.tab.url;
    if (url.includes('job') || url.includes('career') || url.includes('apply')) {
      sendResponse({ formType: 'jobApplication' });
    } else {
      sendResponse({ formType: null });
    }
  }
  return true;
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 AutoFill Pro service worker ready');
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Pre-inject for faster response
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['config.js', 'content.js']
    }).catch(() => {});
  }
});