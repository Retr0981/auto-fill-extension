// AutoFill Pro v6.0 Popup Controller
console.log('🎯 Popup initializing...');

let currentTab = null;
let profile = {};
let settings = {};
let stats = {};
let cvFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    await loadAllData();
    initializeUI();
    bindEvents();
    
    console.log('✅ Popup ready');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    showStatus('Error loading extension', 'error');
  }
});

// Load all data from storage
async function loadAllData() {
  const result = await chrome.storage.local.get(['profile', 'settings', 'stats', 'cvFile']);
  profile = result.profile || {};
  settings = result.settings || {};
  stats = result.stats || {};
  cvFile = result.cvFile || null;
  
  populateForm();
}

// Populate form fields
function populateForm() {
  Object.entries(profile).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element) element.value = value || '';
  });
  
  document.getElementById('highlight-fields-toggle').checked = settings.highlightFields !== false;
  document.getElementById('show-notifications-toggle').checked = settings.showNotifications !== false;
  document.getElementById('auto-submit-toggle').checked = settings.autoSubmit === true;
  
  updateStats();
  updateCVStatus();
}

// Initialize UI
function initializeUI() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.panel}-panel`).classList.add('active');
    });
  });
  
  updateStatus();
}

// Bind all events
function bindEvents() {
  // Smart fill button
  document.getElementById('smart-fill-btn').addEventListener('click', handleSmartFill);
  
  // Save profile
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
  
  // CV upload
  document.getElementById('cv-file-input').addEventListener('change', handleCVUpload);
  document.getElementById('extract-cv-btn').addEventListener('click', extractCV);
  document.getElementById('preview-cv-btn').addEventListener('click', previewCV);
  
  // Other actions
  document.getElementById('extract-browser-btn').addEventListener('click', extractFromBrowser);
  document.getElementById('reset-all-btn').addEventListener('click', resetAll);
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
}

// Handle smart fill
async function handleSmartFill() {
  const button = document.getElementById('smart-fill-btn');
  button.disabled = true;
  button.textContent = '⏳ Filling...';
  
  showStatus('Filling forms...', 'loading');
  
  try {
    if (!currentTab || currentTab.url.startsWith('chrome://')) {
      throw new Error('Cannot fill this page');
    }
    
    if (Object.values(profile).filter(v => v && v.trim()).length === 0) {
      throw new Error('Profile is empty! Please save your info.');
    }
    
    // Ensure content script is loaded
    await injectContentScript(currentTab.id);
    
    // Send fill command
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'smartFill',
      data: profile,
      settings: settings
    });
    
    if (response.filled > 0) {
      await updateStatsAfterFill(response.filled, response.formsProcessed);
      showStatus(`✅ Filled ${response.filled} fields`, 'success');
    } else {
      showStatus('No fields were filled', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Fill failed:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.textContent = '🚀 SMART FILL CURRENT PAGE';
  }
}

// Inject content script
async function injectContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch {
    // Not loaded, inject
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['config.js', 'content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Save profile
async function saveProfile() {
  const button = document.getElementById('save-profile-btn');
  button.textContent = '💾 Saving...';
  button.disabled = true;
  
  // Collect all fields
  const fields = [
    'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country',
    'company', 'jobTitle', 'website', 'linkedin', 'github', 'experience', 'education', 'skills',
    'salary', 'notice', 'gender', 'newsletter', 'remoteWork', 'terms'
  ];
  
  const newProfile = {};
  fields.forEach(field => {
    const element = document.getElementById(field);
    newProfile[field] = element ? element.value.trim() : '';
  });
  
  // Validate
  if (newProfile.email && !newProfile.email.includes('@')) {
    showStatus('Please enter a valid email', 'error');
    button.textContent = '💾 Save Profile';
    button.disabled = false;
    return;
  }
  
  await chrome.storage.local.set({ profile: newProfile });
  profile = newProfile;
  
  updateStatus();
  showStatus('Profile saved!', 'success');
  
  button.textContent = '💾 Profile Saved!';
  setTimeout(() => {
    button.textContent = '💾 Save Profile';
    button.disabled = false;
  }, 2000);
}

// CV upload
async function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    showStatus('File too large (max 10MB)', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    cvFile = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result,
      uploadedAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ cvFile });
    updateCVStatus();
    showStatus('CV uploaded!', 'success');
  };
  reader.readAsDataURL(file);
}

// Extract CV data
async function extractCV() {
  if (!cvFile) {
    showStatus('No CV uploaded', 'error');
    return;
  }
  
  if (!cvFile.type.includes('text')) {
    showStatus('Only TXT files can be extracted', 'warning');
    return;
  }
  
  showStatus('Extracting...', 'loading');
  
  const text = atob(cvFile.data.split(',')[1]);
  const extracted = {};
  
  // Simple extraction patterns (enhance as needed)
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) extracted.email = emailMatch[0];
  
  const phoneMatch = text.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  if (phoneMatch) extracted.phone = phoneMatch[0];
  
  updateFormWithExtractedData(extracted);
  showStatus('Data extracted from CV', 'success');
}

// Preview CV
function previewCV() {
  if (!cvFile) {
    showStatus('No CV to preview', 'error');
    return;
  }
  
  const preview = window.open('', '_blank');
  preview.document.write(`
    <h1>${cvFile.name}</h1>
    <embed src="${cvFile.data}" width="100%" height="600px" />
  `);
  preview.document.close();
}

// Extract from browser
async function extractFromBrowser() {
  await injectContentScript(currentTab.id);
  const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractFromBrowser' });
  
  if (response.data) {
    updateFormWithExtractedData(response.data);
    showStatus('Data extracted from page', 'success');
  } else {
    showStatus('No data found on page', 'warning');
  }
}

// Update form with extracted data
function updateFormWithExtractedData(data) {
  Object.entries(data).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element && !element.value) {
      element.value = value;
      element.style.borderColor = '#4CAF50';
      setTimeout(() => element.style.borderColor = '', 2000);
    }
  });
}

// Save settings
async function saveSettings() {
  const newSettings = {
    highlightFields: document.getElementById('highlight-fields-toggle').checked,
    showNotifications: document.getElementById('show-notifications-toggle').checked,
    autoSubmit: document.getElementById('auto-submit-toggle').checked
  };
  
  await chrome.storage.local.set({ settings: newSettings });
  settings = newSettings;
  
  showStatus('Settings saved!', 'success');
}

// Reset all data
async function resetAll() {
  if (!confirm('⚠️ Reset ALL data? This cannot be undone!')) return;
  
  await chrome.storage.local.clear();
  location.reload();
}

// Update status indicator
function updateStatus() {
  const status = document.getElementById('status');
  const filled = Object.values(profile).filter(v => v && v.trim()).length;
  
  if (filled === 0) {
    status.textContent = '❌ No profile data';
    status.className = 'status error';
  } else if (filled < 5) {
    status.textContent = `⚠️ ${filled} fields filled`;
    status.className = 'status warning';
  } else {
    status.textContent = `✅ ${filled} fields ready`;
    status.className = 'status success';
  }
}

// Update stats display
function updateStats() {
  document.getElementById('forms-filled').textContent = stats.formsFilled || 0;
  document.getElementById('fields-filled').textContent = stats.fieldsFilled || 0;
  
  const lastUsed = stats.lastUsed ? new Date(stats.lastUsed).toLocaleDateString() : 'Never';
  document.getElementById('last-used').textContent = lastUsed;
}

// Update CV status display
function updateCVStatus() {
  const status = document.getElementById('cv-status');
  if (cvFile) {
    status.innerHTML = `<strong>${cvFile.name}</strong> (${(cvFile.size / 1024).toFixed(1)} KB)`;
  } else {
    status.textContent = 'No CV stored';
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
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  if (type === 'success') {
    setTimeout(() => updateStatus(), 3000);
  }
}