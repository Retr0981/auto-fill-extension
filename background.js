// AutoFill Pro Background Service Worker
console.log('🔧 AutoFill Pro v6.0 Background Service Worker Active');

// Keep service worker alive
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize storage with defaults
    chrome.storage.local.set({
      profile: createDefaultProfile(),
      settings: createDefaultSettings(),
      stats: createDefaultStats(),
      version: '6.0'
    });
    
    // Open popup on install
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

// Default profile creation
function createDefaultProfile() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    company: '',
    jobTitle: '',
    website: '',
    linkedin: '',
    github: '',
    experience: '',
    education: '',
    skills: '',
    salary: '',
    notice: '',
    gender: '',
    newsletter: '',
    remoteWork: '',
    terms: ''
  };
}

// Default settings
function createDefaultSettings() {
  return {
    autoFill: true,
    highlightFields: true,
    showNotifications: true,
    autoSubmit: false
  };
}

// Default stats
function createDefaultStats() {
  return {
    formsFilled: 0,
    fieldsFilled: 0,
    lastUsed: null
  };
}

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'smart-fill') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'AutoFill Pro',
        message: 'Cannot fill forms on this page'
      });
      return;
    }
    
    try {
      const { profile, settings } = await chrome.storage.local.get(['profile', 'settings']);
      
      if (!profile || Object.keys(profile).length === 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'AutoFill Pro',
          message: 'No profile data saved! Open the extension to add your info.'
        });
        return;
      }
      
      // Inject if needed and send message
      await injectContentScriptIfNeeded(tab.id);
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'smartFill',
        data: profile,
        settings: settings
      });
      
    } catch (error) {
      console.error('❌ Shortcut fill failed:', error);
    }
  }
});

// Inject content script with retry logic
async function injectContentScriptIfNeeded(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch {
    // Script not loaded, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['config.js', 'content.js']
    });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Runtime message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    'getProfile': () => chrome.storage.local.get(['profile']).then(r => sendResponse(r.profile || {})),
    'saveProfile': () => chrome.storage.local.set({ profile: request.data }).then(() => sendResponse({ success: true })),
    'getSettings': () => chrome.storage.local.get(['settings']).then(r => sendResponse(r.settings || {})),
    'saveSettings': () => chrome.storage.local.set({ settings: request.data }).then(() => sendResponse({ success: true }))
  };
  
  const handler = handlers[request.action];
  if (handler) {
    handler();
    return true;
  }
  
  sendResponse({ error: 'Unknown action' });
});

// Context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'autofill-form',
    title: 'AutoFill This Form',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'extract-form-data',
    title: 'Extract Form Data',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'autofill-form') {
    const { profile } = await chrome.storage.local.get(['profile']);
    if (profile) {
      await injectContentScriptIfNeeded(tab.id);
      chrome.tabs.sendMessage(tab.id, { action: 'smartFill', data: profile });
    }
  }
});