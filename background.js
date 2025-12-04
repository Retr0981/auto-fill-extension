// Background service worker with comprehensive error handling
console.log('🔧 AutoFill Pro Background Service Worker activated');

let keepAliveInterval;

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`📦 AutoFill Pro ${details.reason}`);
  
  if (details.reason === 'install') {
    chrome.storage.local.set({
      'profile': {
        firstName: '', lastName: '', email: '', phone: '', address: '', city: '',
        state: '', zipCode: '', country: '', company: '', jobTitle: '', website: '',
        linkedin: '', github: '', experience: '', education: '', skills: '',
        salary: '', notice: ''
      },
      'version': '5.3',
      'settings': {
        autoFill: true, autoSubmit: false, highlightFields: true,
        showNotifications: true, autoUploadCV: true, smartDropdownSelection: true
      }
    });
    
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "smart-fill") {
    console.log('⌨️ Smart Fill shortcut triggered');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url) {
        console.warn('⚠️ No active tab found');
        return;
      }
      
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.warn('⚠️ Cannot fill forms on Chrome internal pages');
        return;
      }
      
      const result = await chrome.storage.local.get(['profile', 'settings']);
      const profile = result.profile;
      const settings = result.settings || {};
      
      if (!profile || Object.keys(profile).length === 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'AutoFill Pro',
          message: 'No profile data saved! Open the extension to add your info.'
        });
        return;
      }
      
      console.log('📦 Profile data loaded for shortcut:', Object.keys(profile).length, 'fields');
      
      await chrome.tabs.sendMessage(tab.id, { 
        action: "smartFill", 
        data: profile,
        settings: settings,
        source: "shortcut"
      }).catch(async (err) => {
        console.error('❌ Shortcut fill failed:', err.message);
        
        if (err.message.includes('receiving end does not exist')) {
          console.log('🔄 Injecting content script...');
          
          // FIX: Inject config.js BEFORE content.js
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['config.js']
          });
          
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await chrome.tabs.sendMessage(tab.id, { 
            action: "smartFill", 
            data: profile,
            settings: settings,
            source: "shortcut_retry"
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Shortcut handler error:', error);
    }
  }
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request.action);
  
  switch (request.action) {
    case 'getProfile':
      chrome.storage.local.get(['profile'], (result) => {
        sendResponse(result.profile || {});
      });
      break;
      
    case 'saveProfile':
      chrome.storage.local.set({ profile: request.data }, () => {
        sendResponse({ success: true });
      });
      break;
      
    case 'getSettings':
      chrome.storage.local.get(['settings'], (result) => {
        sendResponse(result.settings || {});
      });
      break;
      
    case 'saveSettings':
      chrome.storage.local.set({ settings: request.data }, () => {
        sendResponse({ success: true });
      });
      break;
      
    case 'checkPage':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url && !tab.url.startsWith('chrome://')) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const forms = document.querySelectorAll('form, [role="form"]').length;
              const inputs = document.querySelectorAll('input, textarea, select').length;
              const fileInputs = document.querySelectorAll('input[type="file"]').length;
              const selectFields = document.querySelectorAll('select').length;
              return { hasForms: forms > 0, formCount: forms, inputCount: inputs, fileInputs: fileInputs, selectFields: selectFields };
            }
          }).then((results) => {
            sendResponse(results[0]?.result || { hasForms: false, formCount: 0, inputCount: 0, fileInputs: 0, selectFields: 0 });
          }).catch(() => {
            sendResponse({ hasForms: false, formCount: 0, inputCount: 0, fileInputs: 0, selectFields: 0 });
          });
        } else {
          sendResponse({ hasForms: false, formCount: 0, inputCount: 0, fileInputs: 0, selectFields: 0 });
        }
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension startup');
  keepAliveInterval = setInterval(() => {
    // Keep alive ping
  }, 10000);
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('💤 Extension suspending');
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autofill-form",
    title: "AutoFill Form with Profile & CV",
    contexts: ["page"]
  });
  
  chrome.contextMenus.create({
    id: "extract-form-data",
    title: "Extract Form Data from Page",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "autofill-form") {
    const result = await chrome.storage.local.get(['profile', 'settings']);
    if (result.profile) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "smartFill", 
        data: result.profile,
        settings: result.settings || {},
        source: "context_menu"
      });
    }
  }
});