// Add these functions to popup.js

// Better status indicator
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-indicator');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = 'status-indicator';
  
  switch (type) {
    case 'success':
      statusEl.classList.add('status-indicator--success');
      break;
    case 'error':
      statusEl.classList.add('status-indicator--error');
      break;
    case 'warning':
      statusEl.classList.add('status-indicator--warning');
      break;
    case 'loading':
      statusEl.classList.add('status-indicator--loading');
      break;
    default:
      statusEl.classList.add('status-indicator--info');
  }
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        updateStatusIndicator();
      }
    }, 3000);
  }
}

// Enhanced smart fill with progress
async function smartFillForm() {
  console.log('🚀 Smart Fill initiated');
  
  // Visual feedback
  const button = document.getElementById('smart-fill-main-btn');
  const originalText = button.innerHTML;
  button.innerHTML = '⏳ Filling Forms...';
  button.disabled = true;
  
  showStatus('⏳ Scanning page for forms...', 'loading');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get profile data
    const { profile } = await chrome.storage.local.get(['profile']);
    if (!profile || Object.keys(profile).length === 0) {
      showStatus('❌ Please save your profile first!', 'error');
      button.innerHTML = originalText;
      button.disabled = false;
      return;
    }
    
    showStatus('🚀 Injecting form filler...', 'loading');
    
    // Execute content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (profileData) => {
        if (typeof window.smartFillAllForms === 'function') {
          return window.smartFillAllForms(profileData);
        }
        return { error: 'Function not available' };
      },
      args: [profile]
    });
    
    const result = results[0]?.result;
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    if (result?.totalFilled > 0) {
      showStatus(`✅ Filled ${result.totalFilled} fields across ${result.formsProcessed} forms!`, 'success');
      
      // Show detailed results
      if (result.details && result.details.length > 0) {
        console.log('📊 Fill details:', result);
        
        // Optionally show more details
        const detailText = result.details.map(d => 
          `${d.filled} of ${d.total} fields`
        ).join(', ');
        
        showStatus(`📝 Results: ${detailText}`, 'success');
      }
    } else {
      showStatus('⚠️ No matching form fields found', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Fill failed:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// Initialize with better UI
async function initializePopup() {
  console.log('⚡ Initializing AutoFill Pro');
  
  // Load theme
  loadTheme();
  
  // Load profile
  await loadProfile();
  
  // Initialize tabs
  initTabs();
  
  // Bind events
  bindEvents();
  
  // Update status
  updateStatusIndicator();
  
  // Check current page
  checkCurrentPage();
  
  console.log('✅ Popup ready');
}

// Check current page for forms
async function checkCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || tab.url.startsWith('chrome://')) {
    document.getElementById('smart-fill-main-btn').disabled = true;
    showStatus('⚠️ Cannot fill on this page', 'warning');
    return;
  }
  
  // Check if page has forms
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const forms = document.querySelectorAll('form, [role="form"]');
        const inputs = document.querySelectorAll('input, textarea, select');
        return {
          hasForms: forms.length > 0,
          formCount: forms.length,
          inputCount: inputs.length
        };
      }
    });
    
    const button = document.getElementById('smart-fill-main-btn');
    if (result.result.hasForms) {
      button.disabled = false;
      showStatus(`📋 ${result.result.formCount} form(s) detected`, 'info');
    } else if (result.result.inputCount > 0) {
      button.disabled = false;
      showStatus(`⌨️ ${result.result.inputCount} input field(s) found`, 'info');
    } else {
      button.disabled = true;
      showStatus('❌ No form fields detected', 'error');
    }
  } catch (error) {
    console.log('ℹ️ Page check failed:', error);
  }
}