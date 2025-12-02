// background.js - Service Worker with Robust Error Handling
console.log('🔧 Background Service Worker activated');

chrome.commands.onCommand.addListener((command) => {
  if (command === "smart-fill") {
    console.log('⌨️ Keyboard shortcut triggered');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      // Prevent execution on Chrome internal pages
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.warn('⚠️ Cannot fill forms on Chrome internal pages');
        return;
      }
      
      // Get profile data BEFORE sending message
      chrome.storage.local.get(['profile'], (result) => {
        if (!result.profile || Object.keys(result.profile).length === 0) {
          console.warn('⚠️ No profile data available for shortcut');
          chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'AutoFill Pro',
            message: 'No profile data saved! Open the extension to add your info.'
          });
          return;
        }
        
        console.log('📦 Shortcut data ready:', Object.keys(result.profile).join(', '));
        
        chrome.tabs.sendMessage(
          tab.id, 
          { action: "fillForm", data: result.profile }
        ).catch(err => {
          console.error('❌ Shortcut fill failed:', err.message);
          // Silent fail - don't spam user on every page
        });
      });
    });
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension started');
});

// Install handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 Extension installed/updated:', details.reason);
});