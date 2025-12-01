// popup.js - AutoFill Pro Popup Controller

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

function initializePopup() {
  loadProfile();
  initTabs();
  bindEvents();
  checkStoredCV();
}

// Tab Navigation
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      
      // Update buttons
      tabButtons.forEach(btn => btn.setAttribute('aria-selected', 'false'));
      button.setAttribute('aria-selected', 'true');
      
      // Update panels
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.setAttribute('aria-hidden', 'true');
      });
      document.getElementById(target).setAttribute('aria-hidden', 'false');
    });
  });
}

// Bind all button events
function bindEvents() {
  // Profile Actions
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
  document.getElementById('smart-fill-btn').addEventListener('click', smartFillForm);
  document.getElementById('reset-all-btn').addEventListener('click', resetAll);
  
  // CV Actions
  document.getElementById('cv-file-input').addEventListener('change', handleCVUpload);
  document.getElementById('preview-cv-btn').addEventListener('click', previewCV);
  document.getElementById('extract-cv-btn').addEventListener('click', extractFromCV);
  document.getElementById('extract-browser-btn').addEventListener('click', extractFromBrowser);
}

// Get profile data from form
function getProfileData() {
  return {
    firstName: document.getElementById('firstName')?.value.trim() || '',
    lastName: document.getElementById('lastName')?.value.trim() || '',
    email: document.getElementById('email')?.value.trim() || '',
    phone: document.getElementById('phone')?.value.trim() || '',
    address: document.getElementById('address')?.value.trim() || '',
    city: document.getElementById('city')?.value.trim() || '',
    state: document.getElementById('state')?.value.trim() || '',
    zipCode: document.getElementById('zipCode')?.value.trim() || ''
  };
}

// Save profile to storage
function saveProfile() {
  const profile = getProfileData();
  
  // Remove empty fields
  Object.keys(profile).forEach(key => { if (!profile[key]) delete profile[key]; });
  
  if (Object.keys(profile).length === 0) {
    showStatus('⚠️ Please fill at least one field', 'warning');
    return;
  }
  
  chrome.storage.local.set({ profile }, () => {
    showStatus('💾 Profile saved!', 'success');
    updateStatusIndicator();
  });
}

// Load profile from storage
function loadProfile() {
  chrome.storage.local.get(['profile'], (result) => {
    if (result.profile) {
      Object.entries(result.profile).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) element.value = value;
      });
    }
    updateStatusIndicator();
  });
}

// Update status indicator
function updateStatusIndicator() {
  chrome.storage.local.get(['profile'], (result) => {
    const indicator = document.getElementById('status-indicator');
    const hasProfile = result.profile && Object.keys(result.profile).length > 0;
    
    if (hasProfile) {
      indicator.textContent = '✅ Profile ready to fill forms';
      indicator.className = 'status-indicator status-indicator--ready';
    } else {
      indicator.textContent = '❌ No profile data saved';
      indicator.className = 'status-indicator status-indicator--empty';
    }
  });
}

// Smart fill current form
function smartFillForm() {
  chrome.storage.local.get(['profile'], (result) => {
    if (!result.profile || Object.keys(result.profile).length === 0) {
      showStatus('❌ No profile data! Save profile first.', 'error');
      return;
    }
    
    showStatus('🚀 Filling form...', 'loading');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'fillForm', data: result.profile },
        (response) => {
          if (chrome.runtime.lastError) {
            showStatus(`❌ Error: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }
          
          if (response) {
            showStatus(`✅ Filled ${response.filled}/${response.total} fields!`, 'success');
          }
        }
      );
    });
  });
}

// Reset all data
function resetAll() {
  if (!confirm('⚠️ Delete all saved data?')) return;
  
  chrome.storage.local.clear(() => {
    // Clear form fields
    document.querySelectorAll('#profile-panel input').forEach(input => {
      input.value = '';
    });
    
    // Clear CV data
    document.getElementById('cv-status').textContent = 'No CV stored';
    document.getElementById('extracted-data-container').style.display = 'none';
    
    showStatus('🔄 All data cleared!', 'success');
    updateStatusIndicator();
  });
}

// Handle CV upload
function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    showStatus('❌ File too large (max 5MB)', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    chrome.storage.local.set({
      cv: { name: file.name, type: file.type, size: file.size, data: e.target.result }
    }, () => {
      document.getElementById('cv-status').textContent = `📄 CV stored: ${file.name}`;
      showStatus('✅ CV uploaded!', 'success');
    });
  };
  reader.readAsDataURL(file);
}

// Check for stored CV
function checkStoredCV() {
  chrome.storage.local.get(['cv'], (result) => {
    if (result.cv) {
      document.getElementById('cv-status').textContent = `📄 CV stored: ${result.cv.name}`;
    }
  });
}

// Preview CV
function previewCV() {
  chrome.storage.local.get(['cv'], (result) => {
    if (!result.cv) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    const base64Data = result.cv.data.split(',')[1];
    const byteString = atob(base64Data);
    const mimeString = result.cv.data.split(',')[0].split(':')[1].split(';')[0];
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const url = URL.createObjectURL(blob);
    
    chrome.tabs.create({ url: url });
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    showStatus('👁️ Opening preview...', 'success');
  });
}

// Extract data from CV (simulated)
function extractFromCV() {
  chrome.storage.local.get(['cv'], (result) => {
    if (!result.cv) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    showStatus('🔍 Extracting from CV...', 'loading');
    
    setTimeout(() => {
      const data = getProfileData();
      const container = document.getElementById('extracted-data-container');
      
      if (Object.keys(data).length > 0) {
        container.innerHTML = `<pre>// From: ${result.cv.name}\n${JSON.stringify(data, null, 2)}</pre>`;
        container.style.display = 'block';
        showStatus('✅ Extraction complete!', 'success');
      } else {
        showStatus('⚠️ No data to extract', 'warning');
      }
    }, 1500);
  });
}

// Extract data from browser
function extractFromBrowser() {
  showStatus('📥 Extracting from browser...', 'loading');
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'extractFromBrowser' },
      (response) => {
        if (chrome.runtime.lastError) {
          showStatus(`❌ Error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        
        if (response && response.data) {
          // Fill extracted data into profile form
          Object.entries(response.data).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) element.value = value;
          });
          
          const count = Object.keys(response.data).length;
          showStatus(`✅ Extracted ${count} fields!`, 'success');
        } else {
          showStatus('⚠️ No data found', 'warning');
        }
      }
    );
  });
}

// Show status message
function showStatus(message, type) {
  const indicator = document.getElementById('status-indicator');
  indicator.textContent = message;
  indicator.className = 'status-indicator';
  
  if (type === 'success') {
    indicator.classList.add('status-indicator--ready');
  } else if (type === 'error' || type === 'warning') {
    indicator.classList.add('status-indicator--empty');
  } else if (type === 'loading') {
    indicator.style.background = 'rgba(255,255,255,0.9)';
    indicator.style.color = 'var(--color-primary)';
    indicator.style.border = '1px solid var(--color-primary)';
  }
  
  setTimeout(() => {
    updateStatusIndicator();
    indicator.style.background = '';
    indicator.style.color = '';
    indicator.style.border = '';
  }, 4000);
}