// AutoFill Pro v6.1 Background Service Worker
console.log('🔧 AutoFill Pro v6.1 Background Service Worker Active');

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set defaults
    await chrome.storage.local.set({
      profile: createDefaultProfile(),
      settings: createDefaultSettings(),
      stats: createDefaultStats(),
      version: '6.1'
    });
    
    // Open welcome page
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

function createDefaultProfile() {
  return {
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: '',
    company: '', jobTitle: '', website: '', linkedin: '', github: '',
    experience: '', education: '', skills: '', salary: '', notice: '',
    gender: '', newsletter: '', remoteWork: '', terms: ''
  };
}

function createDefaultSettings() {
  return {
    autoFill: true,
    highlightFields: true,
    showNotifications: true,
    autoSubmit: false
  };
}

function createDefaultStats() {
  return { formsFilled: 0, fieldsFilled: 0, lastUsed: null };
}

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'smart-fill') return;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'AutoFill Pro',
      message: 'Cannot fill forms on Chrome internal pages'
    });
    return;
  }
  
  try {
    const { profile, settings } = await chrome.storage.local.get(['profile', 'settings']);
    
    if (!profile || Object.values(profile).filter(v => v && v.trim()).length === 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'AutoFill Pro',
        message: 'No profile data saved! Open the extension to add your info.'
      });
      return;
    }
    
    // Inject content script if needed
    await injectContentScriptIfNeeded(tab.id);
    
    // Send fill command
    await chrome.tabs.sendMessage(tab.id, {
      action: 'smartFill',
      data: profile,
      settings: settings
    });
    
  } catch (error) {
    console.error('❌ Shortcut fill failed:', error);
  }
});

// Inject content script with retry
async function injectContentScriptIfNeeded(tabId) {
  try {
    // Test if script exists
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch {
    // Inject if not found
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    });
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Runtime message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    'getProfile': async () => {
      const result = await chrome.storage.local.get(['profile']);
      sendResponse(result.profile || {});
    },
    'saveProfile': async () => {
      await chrome.storage.local.set({ profile: request.data });
      sendResponse({ success: true });
    },
    'getSettings': async () => {
      const result = await chrome.storage.local.get(['settings']);
      sendResponse(result.settings || {});
    },
    'saveSettings': async () => {
      await chrome.storage.local.set({ settings: request.data });
      sendResponse({ success: true });
    }
  };
  
  const handler = handlers[request.action];
  if (handler) {
    handler();
    return true;
  }
  
  sendResponse({ error: 'Unknown action' });
  return false;
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