function smartFillForm() {
  console.log('🖱️ Smart Fill button clicked');
  
  chrome.storage.local.get(['profile'], (result) => {
    if (!result.profile || Object.keys(result.profile).length === 0) {
      showStatus('❌ No profile data! Save profile first.', 'error');
      return;
    }
    
    showStatus('🚀 Analyzing form...', 'loading');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      // Prevent filling on restricted pages
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        showStatus('❌ Cannot fill forms on this page', 'error');
        return;
      }
      
      console.log('📄 Sending to tab:', tab.id, tab.url);
      
      // Ping to ensure content script is ready
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Content script error:', chrome.runtime.lastError.message);
          showStatus('❌ Please refresh the page and try again', 'error');
          return;
        }
        
        // Now send the fill command
        showStatus('🚀 Filling form...', 'loading');
        
        chrome.tabs.sendMessage(tab.id, { action: 'fillForm', data: result.profile }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Fill failed:', chrome.runtime.lastError.message);
            showStatus(`❌ Error: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }
          
          if (response?.error) {
            console.error('❌ Fill error:', response.error);
            showStatus(`❌ Error: ${response.error}`, 'error');
            return;
          }
          
          console.log('✅ Fill successful:', response);
          if (response) {
            const success = response.filled > 0;
            const message = success 
              ? `✅ Filled ${response.filled}/${response.total} fields!` 
              : `⚠️ No matches found (checked ${response.total} fields)`;
            showStatus(message, success ? 'success' : 'warning');
          }
        });
      });
    });
  });
}