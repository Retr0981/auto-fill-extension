chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 AutoFill Pro v4.0 with OCR installed');
  
  // Initialize default data
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

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    
    if (command === 'smart-fill') {
      chrome.storage.sync.get(['userData'], (syncResult) => {
        chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (localResult) => {
          const data = syncResult.userData || {};
          
          if (!data.email && !data.firstName) {
            console.warn('No user data available for smart fill');
            return;
          }
          
          chrome.tabs.sendMessage(tabId, {
            action: "smartFill",
            data: data,
            cvData: localResult.cvFile,
            cvFileName: localResult.cvFileName,
            cvFileType: localResult.cvFileType
          });
        });
      });
      
    } else if (command === 'verify-fields') {
      chrome.tabs.sendMessage(tabId, { action: "verifyFill" });
    }
  });
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('AutoFill Pro service worker started');
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "log") {
    console.log(`[Content] ${request.message}`);
  }
  return true;
});