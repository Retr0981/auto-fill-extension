// popup.js - Complete UI Controller with Error Handling
console.log('🎯 AutoFill Pro popup initialized');

// Global state
let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializePopup();
  } catch (error) {
    console.error('❌ Fatal popup error:', error);
    showStatus(`❌ Initialization failed: ${error.message}`, 'error');
  }
});

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
  
  // Validate tab URL
  if (currentTab?.url?.startsWith('chrome://') || currentTab?.url?.startsWith('chrome-extension://')) {
    showStatus('⚠️ Limited functionality on this page', 'warning');
    document.getElementById('smart-fill-btn').disabled = true;
    document.getElementById('extract-browser-btn').disabled = true;
  }
  
  console.log('✅ Popup ready');
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      
      // Update button states
      tabButtons.forEach(btn => btn.setAttribute('aria-selected', 'false'));
      button.setAttribute('aria-selected', 'true');
      
      // Update panel states
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.setAttribute('aria-hidden', 'true');
      });
      document.getElementById(target).setAttribute('aria-hidden', 'false');
      
      // Update CV status when switching to CV tab
      if (target === 'cv-panel') {
        checkStoredCV();
      }
    });
  });
}

function bindEvents() {
  const bindings = [
    { id: 'save-profile-btn', handler: saveProfile, event: 'click' },
    { id: 'smart-fill-btn', handler: smartFillForm, event: 'click' },
    { id: 'reset-all-btn', handler: resetAll, event: 'click' },
    { id: 'cv-file-input', handler: handleCVUpload, event: 'change' },
    { id: 'preview-cv-btn', handler: previewCV, event: 'click' },
    { id: 'extract-cv-btn', handler: extractFromCV, event: 'click' },
    { id: 'extract-browser-btn', handler: extractFromBrowser, event: 'click' }
  ];

  bindings.forEach(({ id, handler, event }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
      console.log(`✅ Bound ${event} to #${id}`);
    } else {
      console.error(`❌ Element #${id} not found`);
    }
  });
}

function getProfileData() {
  const data = {};
  const fields = document.querySelectorAll('#profile-panel input[type="text"], #profile-panel input[type="email"], #profile-panel input[type="tel"]');
  
  fields.forEach(field => {
    const value = field.value.trim();
    if (value) {
      data[field.id] = value;
    }
  });
  
  return data;
}

function saveProfile() {
  const profile = getProfileData();
  
  if (Object.keys(profile).length === 0) {
    showStatus('⚠️ Please fill at least one field', 'warning');
    return;
  }
  
  // Convert boolean-like strings to actual booleans
  Object.keys(profile).forEach(key => {
    const value = profile[key].toLowerCase();
    if (value === 'true' || value === 'false') {
      profile[key] = value === 'true';
    }
  });
  
  chrome.storage.local.set({ profile }, () => {
    if (chrome.runtime.lastError) {
      showStatus(`❌ Save failed: ${chrome.runtime.lastError.message}`, 'error');
      return;
    }
    
    showStatus('💾 Profile saved successfully!', 'success');
    updateStatusIndicator();
    console.log('💾 Saved profile:', profile);
  });
}

function loadProfile() {
  chrome.storage.local.get(['profile'], (result) => {
    if (result.profile) {
      Object.entries(result.profile).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
          element.value = typeof value === 'boolean' ? value.toString() : value;
        }
      });
      console.log('📦 Loaded profile:', result.profile);
    }
  });
}

function updateStatusIndicator() {
  chrome.storage.local.get(['profile'], (result) => {
    const indicator = document.getElementById('status-indicator');
    const hasData = result.profile && Object.keys(result.profile).length > 0;
    
    indicator.textContent = hasData 
      ? `✅ Ready: ${Object.keys(result.profile).length} fields available` 
      : '❌ No profile data saved';
    indicator.className = hasData 
      ? 'status-indicator status-indicator--ready' 
      : 'status-indicator status-indicator--empty';
  });
}

async function smartFillForm() {
  console.log('🖱️ Smart Fill button clicked');
  
  showStatus('⏳ Preparing form fill...', 'loading');
  
  try {
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
    
    showStatus('🚀 Filling form fields...', 'loading');
    
    // Ping test
    const pingResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' }).catch(() => null);
    
    if (!pingResponse) {
      showStatus('❌ Content script not ready. Refresh page and try again.', 'error');
      return;
    }
    
    // Execute fill
    const response = await chrome.tabs.sendMessage(currentTab.id, { 
      action: 'fillForm', 
      data: profile 
    });
    
    if (response?.error) {
      throw new Error(response.error);
    }
    
    if (response) {
      const success = response.filled > 0;
      const message = success 
        ? `✅ Filled ${response.filled}/${response.total} fields in ${response.duration}ms` 
        : `⚠️ No matches found (scanned ${response.total} fields)`;
      showStatus(message, success ? 'success' : 'warning');
    }
    
    console.log('✅ Fill operation complete:', response);
    
  } catch (error) {
    console.error('❌ Fill failed:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  }
}

function resetAll() {
  const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL saved profile and CV data.\n\nAre you sure?');
  if (!confirmed) return;
  
  chrome.storage.local.clear(() => {
    // Clear form fields
    document.querySelectorAll('#profile-panel input').forEach(input => input.value = '');
    document.getElementById('cv-status').textContent = 'No CV stored';
    document.getElementById('extracted-data-container').style.display = 'none';
    
    showStatus('🔄 All data cleared successfully!', 'success');
    updateStatusIndicator();
    console.log('🔄 All storage cleared');
  });
}

function handleCVUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    showStatus('❌ File too large (max 5MB)', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const cvData = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result,
      uploadedAt: new Date().toISOString()
    };
    
    chrome.storage.local.set({ cv: cvData }, () => {
      document.getElementById('cv-status').textContent = `📄 ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
      showStatus('✅ CV uploaded successfully!', 'success');
      console.log('📄 CV stored:', file.name);
    });
  };
  reader.onerror = () => {
    showStatus('❌ Failed to read file', 'error');
  };
  reader.readAsDataURL(file);
}

function checkStoredCV() {
  chrome.storage.local.get(['cv'], (result) => {
    const statusElement = document.getElementById('cv-status');
    if (result.cv) {
      const sizeKB = (result.cv.size / 1024).toFixed(1);
      statusElement.textContent = `📄 ${result.cv.name} (${sizeKB} KB)`;
    } else {
      statusElement.textContent = 'No CV stored';
    }
  });
}

function previewCV() {
  chrome.storage.local.get(['cv'], (result) => {
    if (!result.cv) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    try {
      const base64Data = result.cv.data.split(',')[1];
      const mimeString = result.cv.data.split(',')[0].split(':')[1].split(';')[0];
      const byteString = atob(base64Data);
      
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      
      chrome.tabs.create({ url: url }, () => {
        showStatus('👁️ Opening CV preview...', 'success');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch (error) {
      console.error('❌ CV preview failed:', error);
      showStatus('❌ Failed to preview CV', 'error');
    }
  });
}

function extractFromCV() {
  chrome.storage.local.get(['cv'], (result) => {
    if (!result.cv) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    showStatus('🔍 Extracting data from CV...', 'loading');
    
    // Simulate extraction (in real app, you'd use OCR/AI)
    setTimeout(() => {
      const profileData = getProfileData();
      const container = document.getElementById('extracted-data-container');
      
      if (Object.keys(profileData).length > 0) {
        container.innerHTML = `<pre>// Extracted from: ${result.cv.name}\n${JSON.stringify(profileData, null, 2)}</pre>`;
        container.style.display = 'block';
        showStatus('✅ Extraction complete (simulated)', 'success');
      } else {
        showStatus('⚠️ No profile data to extract', 'warning');
      }
    }, 1500);
  });
}

async function extractFromBrowser() {
  if (!currentTab || currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
    showStatus('⚠️ Cannot extract from this page', 'warning');
    return;
  }
  
  showStatus('📥 Extracting form data...', 'loading');
  
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractFromBrowser' });
    
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }
    
    if (response?.data && Object.keys(response.data).length > 0) {
      // Fill extracted data into profile form
      Object.entries(response.data).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) element.value = value;
      });
      
      showStatus(`✅ Extracted ${Object.keys(response.data).length} fields!`, 'success');
      console.log('📤 Extracted data:', response.data);
    } else {
      showStatus('⚠️ No form data found on page', 'warning');
    }
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  }
}

function showStatus(message, type) {
  const indicator = document.getElementById('status-indicator');
  if (!indicator) return;
  
  indicator.textContent = message;
  indicator.className = 'status-indicator';
  
  switch (type) {
    case 'success':
      indicator.classList.add('status-indicator--ready');
      break;
    case 'error':
    case 'warning':
      indicator.classList.add('status-indicator--empty');
      break;
    case 'loading':
      indicator.classList.add('status-indicator--loading');
      break;
  }
  
  // Auto-revert after delay
  clearTimeout(showStatus.timeout);
  showStatus.timeout = setTimeout(() => {
    updateStatusIndicator();
  }, 4000);
}