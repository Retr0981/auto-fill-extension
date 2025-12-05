// AutoFill Pro v6.1 Popup Controller
console.log('🎯 AutoFill Pro Popup Initializing...');

// Global state
let currentTab = null;
let profile = {};
let settings = {};
let stats = {};
let cvFile = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    if (!currentTab) {
      showStatus('❌ Cannot access current tab', 'error');
      return;
    }
    
    // Load all data from storage
    await loadAllData();
    
    // Initialize UI components
    initializeTabs();
    bindAllEvents();
    updateAllUI();
    
    console.log('✅ Popup initialized successfully');
  } catch (error) {
    console.error('❌ Popup initialization failed:', error);
    showStatus('Error initializing extension', 'error');
  }
});

// Load all data from storage
async function loadAllData() {
  try {
    const result = await chrome.storage.local.get(['profile', 'settings', 'stats', 'cvFile']);
    
    profile = result.profile || {};
    settings = result.settings || {};
    stats = result.stats || {};
    cvFile = result.cvFile || null;
    
    // Populate forms after data loads
    populateProfileForm();
    populateSettingsForm();
    updateCVStatus();
    
  } catch (error) {
    console.error('❌ Failed to load data:', error);
    profile = {};
    settings = {};
    stats = {};
    cvFile = null;
  }
}

// Populate profile form fields
function populateProfileForm() {
  const fields = [
    'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country',
    'company', 'jobTitle', 'website', 'linkedin', 'github', 'experience', 'education', 'skills',
    'salary', 'notice', 'gender', 'newsletter', 'remoteWork', 'terms'
  ];
  
  fields.forEach(fieldName => {
    const element = document.getElementById(fieldName);
    if (element && profile[fieldName]) {
      element.value = profile[fieldName];
    }
  });
}

// Populate settings form
function populateSettingsForm() {
  const highlightToggle = document.getElementById('highlight-fields-toggle');
  const notifyToggle = document.getElementById('show-notifications-toggle');
  const autoSubmitToggle = document.getElementById('auto-submit-toggle');
  
  if (highlightToggle) highlightToggle.checked = settings.highlightFields !== false;
  if (notifyToggle) notifyToggle.checked = settings.showNotifications !== false;
  if (autoSubmitToggle) autoSubmitToggle.checked = settings.autoSubmit === true;
}

// Initialize tab switching
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      
      // Update button states
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      
      // Update panel visibility
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
      });
      
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.setAttribute('aria-hidden', 'false');
      }
    });
  });
}

// Bind all event listeners
function bindAllEvents() {
  // Smart Fill button
  const smartFillBtn = document.getElementById('smart-fill-btn');
  if (smartFillBtn) {
    smartFillBtn.addEventListener('click', handleSmartFill);
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
  
  // CV Actions
  const previewBtn = document.getElementById('preview-cv-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', previewCV);
  }
  
  const extractBtn = document.getElementById('extract-cv-btn');
  if (extractBtn) {
    extractBtn.addEventListener('click', extractCVData);
  }
  
  // Browser extraction
  const extractBrowserBtn = document.getElementById('extract-browser-btn');
  if (extractBrowserBtn) {
    extractBrowserBtn.addEventListener('click', extractFromBrowser);
  }
  
  // Reset button
  const resetBtn = document.getElementById('reset-all-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllData);
  }
  
  // Save settings
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  // Auto-save indicators
  const profileInputs = document.querySelectorAll('#profile-panel .form-input');
  profileInputs.forEach(input => {
    input.addEventListener('input', () => {
      const saveBtn = document.getElementById('save-profile-btn');
      if (saveBtn) {
        saveBtn.classList.add('btn--pulse');
        saveBtn.textContent = '💾 Save Profile (Unsaved Changes)';
      }
    });
  });
}

// Handle Smart Fill with proper error handling
async function handleSmartFill() {
  const button = document.getElementById('smart-fill-btn');
  const originalText = button.textContent;
  
  // Disable button and show loading
  button.disabled = true;
  button.textContent = '⏳ Filling Forms...';
  showStatus('Starting form fill...', 'loading');
  
  try {
    // Validate tab
    if (!currentTab) {
      throw new Error('No active tab found');
    }
    
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot fill forms on Chrome internal pages');
    }
    
    // Validate profile has data
    const hasData = Object.values(profile).some(v => v && v.trim());
    if (!hasData) {
      throw new Error('Profile is empty! Please add your information.');
    }
    
    // Inject content script if needed
    showStatus('Connecting to page...', 'loading');
    await injectContentScriptIfNeeded(currentTab.id);
    
    // Send fill command
    showStatus('Filling forms...', 'loading');
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'smartFill',
      data: profile,
      settings: settings
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (response.filled > 0) {
      // Update stats
      await updateStatsAfterFill(response.filled, response.formsProcessed || 1);
      showStatus(`✅ Filled ${response.filled} field${response.filled !== 1 ? 's' : ''}`, 'success');
    } else {
      showStatus('⚠️ No fields were filled', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Smart fill failed:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    // Restore button
    button.disabled = false;
    button.textContent = originalText;
  }
}

// Inject content script with retry logic
async function injectContentScriptIfNeeded(tabId) {
  try {
    // Test if already injected
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (error) {
    // Inject if not found
    console.log('🔄 Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    });
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Save profile data
async function saveProfile() {
  const button = document.getElementById('save-profile-btn');
  const originalText = button.textContent;
  
  button.disabled = true;
  button.textContent = '💾 Saving...';
  
  // Collect all profile fields
  const fields = [
    'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country',
    'company', 'jobTitle', 'website', 'linkedin', 'github', 'experience', 'education', 'skills',
    'salary', 'notice', 'gender', 'newsletter', 'remoteWork', 'terms'
  ];
  
  const newProfile = {};
  fields.forEach(fieldName => {
    const element = document.getElementById(fieldName);
    newProfile[fieldName] = element ? element.value.trim() : '';
  });
  
  // Validate email
  if (newProfile.email && !newProfile.email.includes('@')) {
    showStatus('Please enter a valid email', 'error');
    button.disabled = false;
    button.textContent = originalText;
    return;
  }
  
  // Save to storage
  await chrome.storage.local.set({ profile: newProfile });
  profile = newProfile;
  
  // Update UI
  updateStatus();
  showStatus('✅ Profile saved successfully!', 'success');
  
  // Restore button with success
  button.textContent = '💾 Profile Saved!';
  button.classList.remove('btn--pulse');
  
  setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 2000);
}

// Handle CV file upload
async function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file size
  if (file.size > 10 * 1024 * 1024) {
    showStatus('❌ File too large. Maximum size is 10MB.', 'error');
    return;
  }
  
  // Validate file type
  const validTypes = ['application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
    showStatus('❌ Invalid file type. Use PDF, DOC, DOCX, or TXT.', 'error');
    return;
  }
  
  showStatus('📤 Uploading CV...', 'loading');
  
  try {
    const base64Data = await readFileAsBase64(file);
    
    cvFile = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64Data,
      uploadedAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ cvFile });
    updateCVStatus();
    showStatus(`✅ CV uploaded: ${file.name}`, 'success');
    
  } catch (error) {
    console.error('❌ CV upload failed:', error);
    showStatus('❌ Failed to upload CV', 'error');
  }
}

// Read file as base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Preview CV in new tab
function previewCV() {
  if (!cvFile) {
    showStatus('❌ No CV uploaded', 'error');
    return;
  }
  
  const preview = window.open('', '_blank');
  const isImage = cvFile.type.startsWith('image/');
  const isPDF = cvFile.type === 'application/pdf';
  const isText = cvFile.type === 'text/plain';
  
  preview.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CV Preview - ${cvFile.name}</title>
        <style>
          body { font-family: sans-serif; margin: 20px; background: #f5f5f5; }
          .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .preview-container { background: white; padding: 20px; border-radius: 10px; min-height: 600px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📄 CV Preview</h1>
          <p><strong>File:</strong> ${cvFile.name} | <strong>Size:</strong> ${(cvFile.size / 1024).toFixed(1)} KB</p>
        </div>
        <div class="preview-container">
          ${isImage ? `<img src="${cvFile.data}" style="max-width: 100%;">` : 
            isPDF ? `<embed src="${cvFile.data}" width="100%" height="600px">` : 
            isText ? `<pre style="white-space: pre-wrap;">${atob(cvFile.data.split(',')[1])}</pre>` : 
            '<p>Preview not available for this file type.</p>'}
        </div>
      </body>
    </html>
  `);
  preview.document.close();
  
  showStatus('✅ CV preview opened', 'success');
}

// Extract data from CV (text only)
async function extractCVData() {
  if (!cvFile) {
    showStatus('❌ No CV uploaded', 'error');
    return;
  }
  
  if (cvFile.type !== 'text/plain') {
    showStatus('⚠️ Text extraction only works with TXT files', 'warning');
    return;
  }
  
  showStatus('🔍 Extracting data from CV...', 'loading');
  
  try {
    const base64Content = cvFile.data.split(',')[1];
    const textContent = atob(base64Content);
    
    const extracted = {};
    
    // Email
    const emailMatch = textContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) extracted.email = emailMatch[0];
    
    // Phone
    const phoneMatch = textContent.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) extracted.phone = phoneMatch[0];
    
    // Name (simple pattern)
    const nameMatch = textContent.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/m);
    if (nameMatch) {
      extracted.firstName = nameMatch[1];
      extracted.lastName = nameMatch[2];
    }
    
    // LinkedIn/GitHub
    const linkedinMatch = textContent.match(/linkedin\.com\/in\/[A-Za-z0-9-]+/i);
    if (linkedinMatch) extracted.linkedin = `https://${linkedinMatch[0]}`;
    
    const githubMatch = textContent.match(/github\.com\/[A-Za-z0-9-]+/i);
    if (githubMatch) extracted.github = `https://${githubMatch[0]}`;
    
    // Update form
    updateFormWithExtractedData(extracted);
    showStatus('✅ Data extracted from CV', 'success');
    
  } catch (error) {
    console.error('❌ CV extraction failed:', error);
    showStatus('❌ Failed to extract CV data', 'error');
  }
}

// Extract data from current page
async function extractFromBrowser() {
  const button = document.getElementById('extract-browser-btn');
  const originalText = button.textContent;
  
  button.textContent = '🌐 Extracting...';
  button.disabled = true;
  
  showStatus('🌐 Extracting data from page...', 'loading');
  
  try {
    if (!currentTab || currentTab.url.startsWith('chrome://')) {
      throw new Error('Cannot extract from this page');
    }
    
    // Ensure content script is loaded
    await injectContentScriptIfNeeded(currentTab.id);
    
    // Send extract command
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'extractFromBrowser'
    });
    
    if (response.data && Object.keys(response.data).length > 0) {
      updateFormWithExtractedData(response.data);
      showStatus('✅ Data extracted from page', 'success');
    } else {
      showStatus('⚠️ No extractable data found', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Browser extraction failed:', error);
    showStatus('❌ Failed to extract data', 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Update form fields with extracted data
function updateFormWithExtractedData(data) {
  let updatedCount = 0;
  
  Object.entries(data).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element && value && !element.value.trim()) {
      element.value = value;
      
      // Visual feedback
      element.style.borderColor = '#4CAF50';
      element.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.2)';
      
      setTimeout(() => {
        element.style.borderColor = '';
        element.style.boxShadow = '';
      }, 2000);
      
      updatedCount++;
    }
  });
  
  if (updatedCount > 0) {
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
      saveBtn.classList.add('btn--pulse');
      saveBtn.textContent = '💾 Save Profile (Unsaved Changes)';
    }
  }
}

// Save settings
async function saveSettings() {
  const button = document.getElementById('save-settings-btn');
  const originalText = button.textContent;
  
  button.textContent = '💾 Saving...';
  button.disabled = true;
  
  const newSettings = {
    highlightFields: document.getElementById('highlight-fields-toggle').checked,
    showNotifications: document.getElementById('show-notifications-toggle').checked,
    autoSubmit: document.getElementById('auto-submit-toggle').checked
  };
  
  try {
    await chrome.storage.local.set({ settings: newSettings });
    settings = newSettings;
    
    showStatus('✅ Settings saved!', 'success');
    button.textContent = '💾 Settings Saved!';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1500);
    
  } catch (error) {
    console.error('❌ Settings save failed:', error);
    showStatus('❌ Failed to save settings', 'error');
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Reset all data
async function resetAllData() {
  const confirmed = confirm('⚠️ WARNING: This will delete ALL your data!\n\n' +
    '• Profile information\n' +
    '• Uploaded CV\n' +
    '• Settings\n' +
    '• Usage statistics\n\n' +
    'This action cannot be undone. Are you sure?');
  
  if (!confirmed) return;
  
  const button = document.getElementById('reset-all-btn');
  button.textContent = '🗑️ Resetting...';
  button.disabled = true;
  
  showStatus('🔄 Resetting all data...', 'loading');
  
  try {
    // Clear all storage
    await chrome.storage.local.clear();
    
    // Reset local state
    profile = {};
    settings = {};
    stats = {};
    cvFile = null;
    
    // Clear form fields
    document.querySelectorAll('#profile-panel .form-input').forEach(input => {
      input.value = '';
    });
    
    // Reset settings toggles
    document.getElementById('highlight-fields-toggle').checked = true;
    document.getElementById('show-notifications-toggle').checked = true;
    document.getElementById('auto-submit-toggle').checked = false;
    
    updateAllUI();
    
    showStatus('✅ All data reset successfully', 'success');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    showStatus('❌ Failed to reset data', 'error');
  } finally {
    button.textContent = '🗑️ Reset All Data & Settings';
    button.disabled = false;
  }
}

// Update all UI elements
function updateAllUI() {
  updateStatus();
  updateCVStatus();
  updateStats();
}

// Update status indicator
function updateStatus() {
  const statusEl = document.getElementById('status-indicator');
  if (!statusEl) return;
  
  const filledFields = Object.values(profile).filter(v => v && v.trim()).length;
  
  if (filledFields === 0) {
    statusEl.textContent = '❌ No profile data saved';
    statusEl.className = 'status error';
  } else if (filledFields < 5) {
    statusEl.textContent = `⚠️ Only ${filledFields} fields filled`;
    statusEl.className = 'status warning';
  } else {
    statusEl.textContent = `✅ ${filledFields} fields ready to fill`;
    statusEl.className = 'status success';
  }
}

// Update CV status
function updateCVStatus() {
  const cvStatus = document.getElementById('cv-status');
  if (!cvStatus) return;
  
  if (cvFile) {
    const sizeKB = (cvFile.size / 1024).toFixed(1);
    cvStatus.innerHTML = `<strong>${cvFile.name}</strong> (${sizeKB} KB)`;
  } else {
    cvStatus.textContent = 'No CV stored';
  }
}

// Update usage stats
function updateStats() {
  const formsEl = document.getElementById('forms-filled');
  const fieldsEl = document.getElementById('fields-filled');
  const lastUsedEl = document.getElementById('last-used');
  
  if (formsEl) formsEl.textContent = stats.formsFilled || 0;
  if (fieldsEl) fieldsEl.textContent = stats.fieldsFilled || 0;
  
  if (lastUsedEl) {
    if (stats.lastUsed) {
      const lastDate = new Date(stats.lastUsed);
      const now = new Date();
      const hours = Math.floor((now - lastDate) / (1000 * 60 * 60));
      
      if (hours < 1) {
        lastUsedEl.textContent = 'Just now';
      } else if (hours < 24) {
        lastUsedEl.textContent = `${hours}h ago`;
      } else {
        lastUsedEl.textContent = lastDate.toLocaleDateString();
      }
    } else {
      lastUsedEl.textContent = 'Never';
    }
  }
}

// Update stats after successful fill
async function updateStatsAfterFill(fieldsFilled, formsProcessed) {
  stats.fieldsFilled = (stats.fieldsFilled || 0) + fieldsFilled;
  stats.formsFilled = (stats.formsFilled || 0) + (formsProcessed || 1);
  stats.lastUsed = new Date().toISOString();
  
  await chrome.storage.local.set({ stats });
  updateStats();
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status-indicator');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  // Auto-clear success messages
  if (type === 'success') {
    setTimeout(() => {
      updateStatus(); // Reset to default
    }, 3000);
  }
}