// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 AutoFill Pro v3.0 installed successfully');
  
  // Initialize storage with defaults
  chrome.storage.sync.get(['userData'], (result) => {
    if (!result.userData) {
      chrome.storage.sync.set({
        userData: {
          firstName: '', lastName: '', email: '', phone: '',
          address: '', city: '', country: '', zip: '',
          linkedin: '', portfolio: '', summary: '',
          degree: '', university: '', graduationYear: '',
          company: '', position: '', workStartDate: '', workEndDate: '',
          experience: '', skills: '', salary: '', birthDate: ''
        }
      });
    }
  });
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    
    if (command === 'smart-fill') {
      // Trigger smart fill
      chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
        chrome.storage.sync.get(['userData'], (syncResult) => {
          chrome.tabs.sendMessage(tabId, {
            action: "smartFill",
            data: syncResult.userData || {},
            cvData: result.cvFile,
            cvFileName: result.cvFileName,
            cvFileType: result.cvFileType
          });
        });
      });
      
      console.log('⌨️ Smart Fill triggered via keyboard shortcut');
      
    } else if (command === 'verify-fields') {
      // Trigger verification
      chrome.tabs.sendMessage(tabId, { action: "verifyFill" });
      console.log('⌨️ Verify Fields triggered via keyboard shortcut');
    }
  });
});

// Handle messages from content script (if needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "log") {
    console.log(`[Content Script] ${request.message}`);
  }
  return true; // Keep connection open for async
});

// Handle tab updates - re-inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Optional: Could re-initialize here if needed
  }
});