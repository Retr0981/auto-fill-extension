// AutoFill Pro Popup Script
console.log('🎯 AutoFill Pro Popup initializing...');

// Global variables
let currentTab = null;
let currentProfile = {};
let settings = {};

// Initialize popup
async function initializePopup() {
  console.log('⚡ Initializing popup...');
  
  try {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    // Load profile and settings
    await loadProfile();
    await loadSettings();
    
    // Initialize UI components
    initTabs();
    bindEvents();
    updateStatusIndicator();
    checkPageForms();
    
    // Update UI based on current tab
    updateTabStatus();
    
    console.log('✅ Popup initialized successfully');
  } catch (error) {
    console.error('❌ Popup initialization failed:', error);
    showStatus('Error initializing extension', 'error');
  }
}

// Load profile data
async function loadProfile() {
  try {
    const result = await chrome.storage.local.get(['profile']);
    currentProfile = result.profile || {};
    
    // Populate form fields
    Object.keys(currentProfile).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        element.value = currentProfile[key] || '';
      }
    });
    
    console.log('📋 Profile loaded:', Object.keys(currentProfile).length, 'fields');
  } catch (error) {
    console.error('❌ Failed to load profile:', error);
    currentProfile = {};
  }
}

// Load settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    settings = result.settings || {
      autoFill: true,
      autoSubmit: false,
      highlightFields: true,
      showNotifications: true,
      keyboardShortcut: true
    };
    
    // Update settings UI
    document.getElementById('auto-fill-toggle')?.checked = settings.autoFill;
    document.getElementById('highlight-fields-toggle')?.checked = settings.highlightFields;
    document.getElementById('show-notifications-toggle')?.checked = settings.showNotifications;
    
  } catch (error) {
    console.error('❌ Failed to load settings:', error);
    settings = {};
  }
}

// Save profile data
async function saveProfile() {
  try {
    // Collect data from all form fields
    const profile = {};
    
    // Personal info
    profile.firstName = document.getElementById('firstName')?.value || '';
    profile.lastName = document.getElementById('lastName')?.value || '';
    profile.email = document.getElementById('email')?.value || '';
    profile.phone = document.getElementById('phone')?.value || '';
    
    // Address
    profile.address = document.getElementById('address')?.value || '';
    profile.city = document.getElementById('city')?.value || '';
    profile.state = document.getElementById('state')?.value || '';
    profile.zipCode = document.getElementById('zipCode')?.value || '';
    profile.country = document.getElementById('country')?.value || '';
    
    // Professional
    profile.company = document.getElementById('company')?.value || '';
    profile.jobTitle = document.getElementById('jobTitle')?.value || '';
    
    // Additional fields
    profile.website = document.getElementById('website')?.value || '';
    profile.linkedin = document.getElementById('linkedin')?.value || '';
    profile.github = document.getElementById('github')?.value || '';
    
    // Employment details
    profile.experience = document.getElementById('experience')?.value || '';
    profile.education = document.getElementById('education')?.value || '';
    profile.skills = document.getElementById('skills')?.value || '';
    profile.salary = document.getElementById('salary')?.value || '';
    profile.notice = document.getElementById('notice')?.value || '';
    
    // Selection fields
    profile.gender = document.getElementById('gender')?.value || '';
    profile.newsletter = document.getElementById('newsletter')?.value || '';
    profile.remoteWork = document.getElementById('remoteWork')?.value || '';
    profile.terms = document.getElementById('terms')?.value || '';
    
    // Save to storage
    await chrome.storage.local.set({ profile });
    currentProfile = profile;
    
    console.log('💾 Profile saved:', Object.keys(profile).length, 'fields');
    showStatus('✅ Profile saved successfully!', 'success');
    
    // Update status indicator
    updateStatusIndicator();
    
  } catch (error) {
    console.error('❌ Failed to save profile:', error);
    showStatus('❌ Failed to save profile', 'error');
  }
}

// Save settings
async function saveSettings() {
  try {
    settings = {
      autoFill: document.getElementById('auto-fill-toggle')?.checked || true,
      highlightFields: document.getElementById('highlight-fields-toggle')?.checked || true,
      showNotifications: document.getElementById('show-notifications-toggle')?.checked || true,
      keyboardShortcut: true
    };
    
    await chrome.storage.local.set({ settings });
    showStatus('✅ Settings saved', 'success');
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
    showStatus('❌ Failed to save settings', 'error');
  }
}

// Initialize tabs
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target');
      
      // Update button states
      tabButtons.forEach(btn => {
        btn.setAttribute('aria-selected', 'false');
        btn.classList.remove('active');
      });
      button.setAttribute('aria-selected', 'true');
      button.classList.add('active');
      
      // Show target panel
      tabPanels.forEach(panel => {
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';
      });
      
      const targetPanel = document.getElementById(target);
      if (targetPanel) {
        targetPanel.setAttribute('aria-hidden', 'false');
        targetPanel.style.display = 'block';
      }
    });
  });
}

// Bind events
function bindEvents() {
  // Smart Fill button
  const smartFillBtn = document.getElementById('smart-fill-btn');
  if (smartFillBtn) {
    smartFillBtn.addEventListener('click', smartFillForm);
  }
  
  // Save Profile button
  const saveProfileBtn = document.getElementById('save-profile-btn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
  }
  
  // CV Upload
  const cvFileInput = document.getElementById('cv-file-input');
  if (cvFileInput) {
    cvFileInput.addEventListener('change', handleCVUpload);
  }
  
  // Preview CV button
  const previewCvBtn = document.getElementById('preview-cv-btn');
  if (previewCvBtn) {
    previewCvBtn.addEventListener('click', previewCV);
  }
  
  // Extract CV button
  const extractCvBtn = document.getElementById('extract-cv-btn');
  if (extractCvBtn) {
    extractCvBtn.addEventListener('click', extractCVData);
  }
  
  // Extract from Browser button
  const extractBrowserBtn = document.getElementById('extract-browser-btn');
  if (extractBrowserBtn) {
    extractBrowserBtn.addEventListener('click', extractFromBrowser);
  }
  
  // Reset All button
  const resetAllBtn = document.getElementById('reset-all-btn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', resetAllData);
  }
  
  // Settings buttons
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  // Form auto-save
  const formElements = document.querySelectorAll('input, textarea, select');
  formElements.forEach(element => {
    element.addEventListener('change', () => {
      document.getElementById('save-profile-btn').classList.add('btn--pulse');
    });
  });
}

// Smart fill form function
async function smartFillForm() {
  console.log('🚀 Smart Fill initiated');
  
  const button = document.getElementById('smart-fill-btn');
  const originalText = button.innerHTML;
  
  // Update button state
  button.innerHTML = '⏳ Filling...';
  button.disabled = true;
  
  showStatus('⏳ Starting form fill...', 'loading');
  
  try {
    // Check if we have a valid tab
    if (!currentTab || !currentTab.url) {
      throw new Error('No active tab found');
    }
    
    // Check if on Chrome internal page
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot fill forms on this page');
    }
    
    // Check if we have profile data
    if (!currentProfile || Object.keys(currentProfile).length === 0) {
      showStatus('❌ Please save your profile first!', 'error');
      button.innerHTML = originalText;
      button.disabled = false;
      return;
    }
    
    showStatus('🚀 Scanning page for forms...', 'loading');
    
    // Send fill command to content script
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'smartFill',
      data: currentProfile,
      source: 'popup'
    });
    
    if (response?.error) {
      throw new Error(response.error);
    }
    
    if (response?.filled > 0) {
      const message = `✅ Filled ${response.filled} field${response.filled !== 1 ? 's' : ''} in ${response.formsProcessed} form${response.formsProcessed !== 1 ? 's' : ''}`;
      showStatus(message, 'success');
    } else {
      showStatus('⚠️ No form fields were filled', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Smart fill failed:', error);
    
    // Check if content script needs injection
    if (error.message.includes('receiving end does not exist')) {
      showStatus('🔄 Injecting content script...', 'loading');
      
      try {
        // Inject content script
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: currentTab.id },
          files: ['content.css']
        });
        
        // Wait a moment and retry
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Retry fill
        const retryResponse = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'smartFill',
          data: currentProfile,
          source: 'popup_retry'
        });
        
        if (retryResponse?.filled > 0) {
          showStatus(`✅ Filled ${retryResponse.filled} fields`, 'success');
        } else {
          showStatus('⚠️ No fields filled after retry', 'warning');
        }
        
      } catch (retryError) {
        showStatus('❌ Failed to inject content script', 'error');
      }
    } else {
      showStatus(`❌ Error: ${error.message}`, 'error');
    }
  } finally {
    // Restore button
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// Handle CV upload
async function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check file type
  const validTypes = ['application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'text/plain'];
  
  if (!validTypes.includes(file.type)) {
    showStatus('❌ Invalid file type. Please upload PDF, DOC, or image files.', 'error');
    return;
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showStatus('❌ File too large. Maximum size is 10MB.', 'error');
    return;
  }
  
  showStatus('📤 Uploading CV...', 'loading');
  
  try {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      
      // Save to storage
      await chrome.storage.local.set({
        cvFile: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
          lastModified: file.lastModified
        }
      });
      
      showStatus(`✅ CV uploaded: ${file.name}`, 'success');
      updateCVStatus(file.name);
    };
    
    reader.readAsDataURL(file);
    
  } catch (error) {
    console.error('❌ CV upload failed:', error);
    showStatus('❌ Failed to upload CV', 'error');
  }
}

// Preview CV
async function previewCV() {
  try {
    const result = await chrome.storage.local.get(['cvFile']);
    const cvFile = result.cvFile;
    
    if (!cvFile) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    // Create preview window
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
      <html>
        <head>
          <title>CV Preview - ${cvFile.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { margin-bottom: 20px; }
            .file-info { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CV Preview</h1>
            <div class="file-info">
              <strong>File:</strong> ${cvFile.name}<br>
              <strong>Type:</strong> ${cvFile.type}<br>
              <strong>Size:</strong> ${(cvFile.size / 1024).toFixed(2)} KB
            </div>
          </div>
          <div>
            ${cvFile.type.includes('image') ? 
              `<img src="${cvFile.data}" style="max-width: 100%;" />` :
              `<embed src="${cvFile.data}" width="100%" height="600px" />`
            }
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ CV preview failed:', error);
    showStatus('❌ Failed to preview CV', 'error');
  }
}

// Extract data from CV
async function extractCVData() {
  showStatus('🔍 Extracting data from CV...', 'loading');
  
  try {
    const result = await chrome.storage.local.get(['cvFile']);
    const cvFile = result.cvFile;
    
    if (!cvFile) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    // Simple text extraction for text files
    if (cvFile.type === 'text/plain') {
      const base64Content = cvFile.data.split(',')[1];
      const textContent = atob(base64Content);
      
      // Simple keyword extraction
      const extracted = extractKeywords(textContent);
      
      // Update form fields with extracted data
      updateFormWithExtractedData(extracted);
      
      showStatus('✅ Data extracted from CV', 'success');
    } else {
      showStatus('⚠️ Advanced extraction available for text files only', 'warning');
    }
    
  } catch (error) {
    console.error('❌ CV extraction failed:', error);
    showStatus('❌ Failed to extract CV data', 'error');
  }
}

// Extract data from browser
async function extractFromBrowser() {
  showStatus('🌐 Extracting data from page...', 'loading');
  
  try {
    if (!currentTab || currentTab.url.startsWith('chrome://')) {
      throw new Error('Cannot extract from this page');
    }
    
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'extractFromBrowser'
    });
    
    if (response?.data) {
      updateFormWithExtractedData(response.data);
      showStatus('✅ Data extracted from page', 'success');
    } else {
      showStatus('⚠️ No extractable data found', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Browser extraction failed:', error);
    showStatus('❌ Failed to extract data', 'error');
  }
}

// Reset all data
async function resetAllData() {
  if (!confirm('Are you sure you want to reset all data? This cannot be undone.')) {
    return;
  }
  
  showStatus('🔄 Resetting all data...', 'loading');
  
  try {
    await chrome.storage.local.clear();
    
    // Clear form fields
    const formElements = document.querySelectorAll('input, textarea, select');
    formElements.forEach(element => {
      if (element.type !== 'button' && element.type !== 'submit') {
        element.value = '';
      }
    });
    
    // Reset CV status
    document.getElementById('cv-status').textContent = 'No CV stored';
    
    // Reload profile
    await loadProfile();
    
    showStatus('✅ All data reset successfully', 'success');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    showStatus('❌ Failed to reset data', 'error');
  }
}

// Update form with extracted data
function updateFormWithExtractedData(data) {
  Object.keys(data).forEach(key => {
    const element = document.getElementById(key);
    if (element && !element.value) {
      element.value = data[key];
    }
  });
}

// Extract keywords from text
function extractKeywords(text) {
  const extracted = {};
  
  // Simple regex patterns for common data
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    linkedin: /linkedin\.com\/in\/[A-Za-z0-9-]+\b/gi,
    github: /github\.com\/[A-Za-z0-9-]+\b/gi
  };
  
  // Extract matches
  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = text.match(pattern);
    if (matches && matches[0]) {
      extracted[key] = matches[0];
    }
  }
  
  return extracted;
}

// Update status indicator
function updateStatusIndicator() {
  const statusEl = document.getElementById('status-indicator');
  if (!statusEl) return;
  
  const filledFields = Object.values(currentProfile).filter(val => val && val.trim()).length;
  const totalFields = Object.keys(currentProfile).length;
  
  if (filledFields === 0) {
    statusEl.textContent = '❌ No profile data saved';
    statusEl.className = 'status-indicator status-indicator--error';
  } else if (filledFields < totalFields / 2) {
    statusEl.textContent = `⚠️ ${filledFields}/${totalFields} fields filled`;
    statusEl.className = 'status-indicator status-indicator--warning';
  } else {
    statusEl.textContent = `✅ ${filledFields}/${totalFields} fields filled`;
    statusEl.className = 'status-indicator status-indicator--success';
  }
}

// Update CV status
function updateCVStatus(fileName) {
  const cvStatusEl = document.getElementById('cv-status');
  if (cvStatusEl && fileName) {
    cvStatusEl.textContent = `📎 ${fileName}`;
  }
}

// Check page for forms
async function checkPageForms() {
  try {
    if (!currentTab || currentTab.url.startsWith('chrome://')) {
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ action: 'checkPage' });
    
    const smartFillBtn = document.getElementById('smart-fill-btn');
    if (smartFillBtn) {
      if (response.hasForms) {
        smartFillBtn.disabled = false;
        showStatus(`📋 ${response.formCount} form(s) detected`, 'info');
      } else if (response.inputCount > 0) {
        smartFillBtn.disabled = false;
        showStatus(`⌨️ ${response.inputCount} input field(s) found`, 'info');
      } else {
        smartFillBtn.disabled = true;
        showStatus('❌ No form fields detected', 'error');
      }
    }
  } catch (error) {
    console.log('ℹ️ Page check failed:', error);
  }
}

// Update tab status
function updateTabStatus() {
  const smartFillBtn = document.getElementById('smart-fill-btn');
  if (!smartFillBtn) return;
  
  if (!currentTab || currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
    smartFillBtn.disabled = true;
    showStatus('⚠️ Limited functionality on this page', 'warning');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-indicator');
  if (!statusEl) return;
  
  // Create status element if it doesn't exist
  if (!statusEl) {
    const newStatusEl = document.createElement('div');
    newStatusEl.id = 'status-indicator';
    newStatusEl.className = 'status-indicator';
    document.querySelector('header').after(newStatusEl);
  }
  
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
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        updateStatusIndicator();
      }
    }, 3000);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializePopup);