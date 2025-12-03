// Add this at the beginning of your initializePopup() function:
async function initializePopup() {
  console.log('⚙️ Initializing popup...');
  
  // Get current tab for validation
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  // Initialize UI
  loadProfile();
  initTabs();
  bindEvents();
  checkStoredCV();
  updateStatusIndicator();
  
  // Highlight Smart Fill button
  const smartFillBtn = document.getElementById('smart-fill-btn');
  if (smartFillBtn) {
    smartFillBtn.style.order = '-1'; // Move to front
    smartFillBtn.style.marginBottom = '15px';
    smartFillBtn.style.fontWeight = '700';
    smartFillBtn.style.boxShadow = '0 4px 15px rgba(66, 133, 244, 0.4)';
    smartFillBtn.innerHTML = '🚀 <strong>Smart Fill Current Form</strong>';
  }
  
  // Validate tab URL
  if (currentTab?.url?.startsWith('chrome://') || currentTab?.url?.startsWith('chrome-extension://')) {
    showStatus('⚠️ Limited functionality on this page', 'warning');
    if (smartFillBtn) smartFillBtn.disabled = true;
    document.getElementById('extract-browser-btn').disabled = true;
  }
  
  console.log('✅ Popup ready');
}

// Update the smartFillForm function to be more robust:
async function smartFillForm() {
  console.log('🖱️ Smart Fill button clicked');
  
  showStatus('⏳ Preparing form fill...', 'loading');
  
  try {
    // Get profile data
    const result = await chrome.storage.local.get(['profile']);
    const profile = result.profile;
    
    if (!profile || Object.keys(profile).length === 0) {
      showStatus('❌ No profile data! Save profile first.', 'error');
      return;
    }
    
    // Validate tab
    if (!currentTab || currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
      showStatus('❌ Cannot fill forms on this page', 'error');
      return;
    }
    
    showStatus('🚀 Injecting content script...', 'loading');
    
    // Try to inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content.js']
      });
      console.log('✅ Content script injected');
    } catch (injectError) {
      console.log('ℹ️ Content script may already be injected:', injectError.message);
    }
    
    // Wait a moment for script to initialize
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Ping test with timeout
    const pingPromise = chrome.tabs.sendMessage(currentTab.id, { action: 'ping' })
      .then(response => {
        console.log('✅ Content script responded:', response);
        return true;
      })
      .catch(error => {
        console.warn('⚠️ Ping failed, trying direct fill:', error);
        return false;
      });
    
    const pingResult = await Promise.race([
      pingPromise,
      new Promise(resolve => setTimeout(() => resolve(false), 1000))
    ]);
    
    if (!pingResult) {
      showStatus('⚠️ Content script not responding. Trying alternative method...', 'warning');
      
      // Try direct execution as fallback
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (profileData) => {
          // Simple direct fill as fallback
          const inputs = document.querySelectorAll('input, textarea, select');
          let filled = 0;
          
          inputs.forEach(input => {
            if (input.disabled || input.hidden || input.type === 'hidden') return;
            
            const name = (input.name || input.id || '').toLowerCase();
            for (const [key, value] of Object.entries(profileData)) {
              if (name.includes(key.toLowerCase()) && !input.value) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                filled++;
                break;
              }
            }
          });
          
          return { filled, total: inputs.length };
        },
        args: [profile]
      });
      
      showStatus('✅ Direct fill attempted (fallback mode)', 'success');
      return;
    }
    
    // Execute fill with timeout
    showStatus('🚀 Filling form fields...', 'loading');
    
    const fillPromise = chrome.tabs.sendMessage(currentTab.id, { 
      action: 'fillForm', 
      data: profile 
    });
    
    const fillResult = await Promise.race([
      fillPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Fill timeout')), 5000))
    ]);
    
    if (fillResult?.error) {
      throw new Error(fillResult.error);
    }
    
    if (fillResult) {
      const success = fillResult.filled > 0;
      const message = success 
        ? `✅ Filled ${fillResult.filled} fields in ${fillResult.forms || 1} forms (${fillResult.duration}ms)` 
        : `⚠️ No matches found (scanned ${fillResult.total} fields)`;
      showStatus(message, success ? 'success' : 'warning');
    }
    
    console.log('✅ Fill operation complete:', fillResult);
    
  } catch (error) {
    console.error('❌ Fill failed:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  }
}