// AutoFill Pro Popup Script - Complete with CV Auto-Upload & Smart Dropdowns
console.log('🎯 AutoFill Pro Popup initializing...');

let currentTab = null;
let currentProfile = {};
let settings = {};
let usageStats = {};
let cvFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('⚡ Initializing popup...');
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    await loadAllData();
    initTabs();
    bindAllEvents();
    updateAllUI();
    
    console.log('✅ Popup initialized successfully');
  } catch (error) {
    console.error('❌ Popup initialization failed:', error);
    showStatus('Error initializing extension', 'error');
  }
});

async function loadAllData() {
  try {
    const result = await chrome.storage.local.get(['profile', 'settings', 'usageStats', 'cvFile']);
    
    currentProfile = result.profile || createDefaultProfile();
    populateProfileForm();
    
    settings = result.settings || createDefaultSettings();
    populateSettingsForm();
    
    usageStats = result.usageStats || createDefaultStats();
    updateUsageStats();
    
    cvFile = result.cvFile || null;
    updateCVStatus();
    
  } catch (error) {
    console.error('❌ Failed to load data:', error);
    currentProfile = createDefaultProfile();
    settings = createDefaultSettings();
    usageStats = createDefaultStats();
  }
}

function createDefaultProfile() {
  return {
    firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '',
    zipCode: '', country: '', company: '', jobTitle: '', website: '', linkedin: '',
    github: '', experience: '', education: '', skills: '', salary: '', notice: '',
    gender: '', newsletter: '', remoteWork: '', terms: ''
  };
}

function createDefaultSettings() {
  return {
    autoFill: true, highlightFields: true, showNotifications: true,
    autoSubmit: false, autoUploadCV: true, smartDropdownSelection: true, keyboardShortcut: true
  };
}

function createDefaultStats() {
  return {
    formsFilled: 0, fieldsFilled: 0, cvUploads: 0,
    lastUsed: null, totalUsageTime: 0, favoriteSites: []
  };
}

function populateProfileForm() {
  Object.keys(currentProfile).forEach(key => {
    const element = document.getElementById(key);
    if (element) element.value = currentProfile[key] || '';
  });
}

function populateSettingsForm() {
  const settingsMap = {
    'auto-fill-toggle': 'autoFill',
    'highlight-fields-toggle': 'highlightFields',
    'show-notifications-toggle': 'showNotifications',
    'auto-submit-toggle': 'autoSubmit',
    'auto-upload-cv-toggle': 'autoUploadCV',
    'smart-dropdown-toggle': 'smartDropdownSelection'
  };
  
  Object.entries(settingsMap).forEach(([elementId, settingKey]) => {
    const element = document.getElementById(elementId);
    if (element) element.checked = settings[settingKey] || false;
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = button.getAttribute('data-target');
      
      tabButtons.forEach(btn => {
        btn.setAttribute('aria-selected', 'false');
        btn.classList.remove('active');
      });
      button.setAttribute('aria-selected', 'true');
      button.classList.add('active');
      
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

function bindAllEvents() {
  document.getElementById('smart-fill-btn')?.addEventListener('click', handleSmartFill);
  document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
  document.getElementById('cv-file-input')?.addEventListener('change', handleCVUpload);
  document.getElementById('preview-cv-btn')?.addEventListener('click', previewCV);
  document.getElementById('extract-cv-btn')?.addEventListener('click', extractCVData);
  document.getElementById('extract-browser-btn')?.addEventListener('click', extractFromBrowser);
  document.getElementById('reset-all-btn')?.addEventListener('click', resetAllData);
  document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
  
  // Auto-save indicators
  document.querySelectorAll('#profile-form input, #profile-form textarea, #profile-form select')
    .forEach(element => {
      element.addEventListener('input', () => {
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
          saveBtn.classList.add('btn--pulse');
          saveBtn.innerHTML = '💾 Save Profile (Unsaved Changes)';
        }
      });
    });
  
  document.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const saveBtn = document.getElementById('save-settings-btn');
      if (saveBtn) {
        saveBtn.classList.add('btn--pulse');
        saveBtn.innerHTML = '💾 Save Settings (Unsaved Changes)';
      }
    });
  });
}

async function handleSmartFill() {
  console.log('🚀 Smart Fill initiated');
  
  const button = document.getElementById('smart-fill-btn');
  const originalText = button.innerHTML;
  
  button.innerHTML = '⏳ Filling Forms...';
  button.disabled = true;
  
  showStatus('⏳ Starting form fill...', 'loading');
  
  try {
    if (!currentTab || !currentTab.url) {
      throw new Error('No active tab found');
    }
    
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot fill forms on this page');
    }
    
    if (!currentProfile || Object.keys(currentProfile).length === 0) {
      showStatus('❌ Please save your profile first!', 'error');
      resetButton(button, originalText);
      return;
    }
    
    const hasData = Object.values(currentProfile).some(value => value && value.trim());
    if (!hasData && !cvFile) {
      showStatus('❌ Profile is empty and no CV uploaded!', 'error');
      resetButton(button, originalText);
      return;
    }
    
    showStatus('🚀 Scanning page for forms & CV fields...', 'loading');
    
    let response;
    try {
      response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'smartFill',
        data: currentProfile,
        settings: settings,
        source: 'popup'
      });
    } catch (error) {
      if (error.message.includes('receiving end does not exist')) {
        showStatus('🔄 Injecting content script...', 'loading');
        
        await injectContentScript();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'smartFill',
          data: currentProfile,
          settings: settings,
          source: 'popup_retry'
        });
      } else {
        throw error;
      }
    }
    
    if (response?.error) {
      throw new Error(response.error);
    }
    
    if (response?.filled > 0) {
      const cvUploads = response.cvUploads || 0;
      await updateUsageStatsAfterFill(response.filled, response.formsProcessed || 1, cvUploads);
      
      let message = `✅ Filled ${response.filled} field${response.filled !== 1 ? 's' : ''} in ${response.formsProcessed || 1} form${(response.formsProcessed || 1) !== 1 ? 's' : ''}`;
      
      if (cvUploads > 0) {
        message += ` and uploaded CV to ${cvUploads} field${cvUploads !== 1 ? 's' : ''}`;
      }
      
      showStatus(message, 'success');
      
      if (settings.autoSubmit && response.filled > 0) {
        setTimeout(() => {
          showStatus('⚡ Auto-submitting form...', 'loading');
          autoSubmitForm();
        }, 1000);
      }
    } else {
      showStatus('⚠️ No form fields were filled', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Smart fill failed:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    resetButton(button, originalText);
  }
}

// Inject content script - FIXED ORDER: config.js BEFORE content.js
async function injectContentScript() {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['config.js']
    });
    
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    });
    
    await chrome.scripting.insertCSS({
      target: { tabId: currentTab.id },
      files: ['content.css']
    });
    
    console.log('✅ Content scripts injected successfully (config.js -> content.js)');
    return true;
  } catch (error) {
    console.error('❌ Failed to inject content scripts:', error);
    throw new Error('Failed to inject content scripts');
  }
}

async function saveProfile() {
  const button = document.getElementById('save-profile-btn');
  const originalText = button.innerHTML;
  
  button.innerHTML = '💾 Saving...';
  button.disabled = true;
  
  showStatus('💾 Saving profile...', 'loading');
  
  try {
    const profile = {};
    const fields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state',
      'zipCode', 'country', 'company', 'jobTitle', 'website', 'linkedin',
      'github', 'experience', 'education', 'skills', 'salary', 'notice',
      'gender', 'newsletter', 'remoteWork', 'terms'
    ];
    
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element) profile[field] = element.value.trim();
    });
    
    await chrome.storage.local.set({ profile });
    currentProfile = profile;
    updateStatusIndicator();
    
    showStatus('✅ Profile saved successfully!', 'success');
    
    button.innerHTML = '💾 Profile Saved!';
    button.classList.remove('btn--pulse');
    
    setTimeout(() => {
      button.innerHTML = originalText.replace('(Unsaved Changes)', '').trim();
      button.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('❌ Failed to save profile:', error);
    showStatus('❌ Failed to save profile', 'error');
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

async function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const validTypes = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'text/plain', 'text/rtf'
  ];
  
  if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png|txt|rtf)$/i)) {
    showStatus('❌ Invalid file type. Please upload PDF, DOC, DOCX, JPG, PNG, or TXT files.', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    showStatus('❌ File too large. Maximum size is 10MB.', 'error');
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
      lastModified: file.lastModified,
      uploadedAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ cvFile });
    updateCVStatus();
    showStatus(`✅ CV uploaded: ${file.name}`, 'success');
    updateStatusIndicator(); // Update status to show CV is ready
    
  } catch (error) {
    console.error('❌ CV upload failed:', error);
    showStatus('❌ Failed to upload CV', 'error');
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function previewCV() {
  try {
    if (!cvFile) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    showStatus('👁️ Opening CV preview...', 'loading');
    
    const previewWindow = window.open('', '_blank');
    
    const previewHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CV Preview - ${cvFile.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .header { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
            .file-info { margin-top: 10px; color: #666; font-size: 14px; }
            .preview-container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-height: 500px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 CV Preview</h1>
            <div class="file-info">
              <strong>File:</strong> ${cvFile.name}<br>
              <strong>Type:</strong> ${cvFile.type}<br>
              <strong>Size:</strong> ${(cvFile.size / 1024).toFixed(2)} KB<br>
              <strong>Uploaded:</strong> ${new Date(cvFile.uploadedAt).toLocaleString()}
            </div>
          </div>
          <div class="preview-container">
            ${cvFile.type.includes('image') 
              ? `<img src="${cvFile.data}" style="max-width: 100%; border-radius: 5px;" />`
              : cvFile.type.includes('pdf')
              ? `<embed src="${cvFile.data}" width="100%" height="600px" type="application/pdf" />`
              : cvFile.type.includes('text')
              ? `<pre style="white-space: pre-wrap; font-family: monospace;">${atob(cvFile.data.split(',')[1]).substring(0, 5000)}...</pre>`
              : `<p>Preview not available for this file type. <a href="${cvFile.data}" download="${cvFile.name}" style="display: inline-block; padding: 10px 20px; background: #4361ee; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Download CV</a></p>`
            }
          </div>
        </body>
      </html>
    `;
    
    previewWindow.document.write(previewHTML);
    previewWindow.document.close();
    showStatus('✅ CV preview opened in new tab', 'success');
    
  } catch (error) {
    console.error('❌ CV preview failed:', error);
    showStatus('❌ Failed to preview CV', 'error');
  }
}

async function extractCVData() {
  try {
    if (!cvFile) {
      showStatus('❌ No CV uploaded', 'error');
      return;
    }
    
    if (!cvFile.type.includes('text')) {
      showStatus('⚠️ Text extraction only works with TXT files', 'warning');
      return;
    }
    
    showStatus('🔍 Extracting data from CV...', 'loading');
    
    const base64Content = cvFile.data.split(',')[1];
    const textContent = atob(base64Content);
    const extractedData = extractDataFromText(textContent);
    
    updateFormWithExtractedData(extractedData);
    
    const container = document.getElementById('extracted-data-container');
    if (container) {
      let html = '<h3 style="margin-bottom: 10px;">Extracted Data:</h3>';
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value) html += `<div style="margin-bottom: 5px;"><strong>${formatKey(key)}:</strong> ${value}</div>`;
      });
      container.innerHTML = html;
    }
    
    showStatus('✅ Data extracted from CV', 'success');
    
  } catch (error) {
    console.error('❌ CV extraction failed:', error);
    showStatus('❌ Failed to extract CV data', 'error');
  }
}

function extractDataFromText(text) {
  const extracted = {};
  
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) extracted.email = emailMatch[0];
  
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) extracted.phone = phoneMatches[0];
  
  const nameRegex = /^([A-Z][a-z]+)\s+([A-Z][a-z]+)/m;
  const nameMatch = text.match(nameRegex);
  if (nameMatch) {
    extracted.firstName = nameMatch[1];
    extracted.lastName = nameMatch[2];
  }
  
  const linkedinMatch = text.match(/linkedin\.com\/in\/[A-Za-z0-9-]+/i);
  if (linkedinMatch) extracted.linkedin = `https://${linkedinMatch[0]}`;
  
  const githubMatch = text.match(/github\.com\/[A-Za-z0-9-]+/i);
  if (githubMatch) extracted.github = `https://${githubMatch[0]}`;
  
  const skillKeywords = ['JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++', 'HTML', 'CSS', 'SQL', 'AWS', 'Vue', 'Angular', 'TypeScript', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin'];
  const foundSkills = skillKeywords.filter(skill => text.includes(skill));
  if (foundSkills.length > 0) extracted.skills = foundSkills.join(', ');
  
  return extracted;
}

async function extractFromBrowser() {
  const button = document.getElementById('extract-browser-btn');
  const originalText = button.innerHTML;
  
  button.innerHTML = '🌐 Extracting...';
  button.disabled = true;
  
  showStatus('🌐 Extracting data from page...', 'loading');
  
  try {
    if (!currentTab || currentTab.url.startsWith('chrome://')) {
      throw new Error('Cannot extract from this page');
    }
    
    let response;
    try {
      response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractFromBrowser' });
    } catch (error) {
      if (error.message.includes('receiving end does not exist')) {
        await injectContentScript();
        await new Promise(resolve => setTimeout(resolve, 500));
        response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractFromBrowser' });
      } else {
        throw error;
      }
    }
    
    if (response?.data) {
      updateFormWithExtractedData(response.data);
      
      const container = document.getElementById('extracted-data-container');
      if (container) {
        let html = '<h3 style="margin-bottom: 10px;">Data Extracted from Page:</h3>';
        Object.entries(response.data).forEach(([key, value]) => {
          if (value) html += `<div style="margin-bottom: 5px;"><strong>${formatKey(key)}:</strong> ${value}</div>`;
        });
        container.innerHTML = html;
      }
      
      showStatus('✅ Data extracted from page', 'success');
    } else {
      showStatus('⚠️ No extractable data found on this page', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Browser extraction failed:', error);
    showStatus('❌ Failed to extract data from page', 'error');
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

async function resetAllData() {
  if (!confirm('⚠️ Are you sure you want to reset ALL data?\n\nThis will:\n• Clear your profile\n• Remove uploaded CV\n• Reset settings\n• Clear usage statistics\n\nThis action cannot be undone!')) {
    return;
  }
  
  const button = document.getElementById('reset-all-btn');
  const originalText = button.innerHTML;
  
  button.innerHTML = '🗑️ Resetting...';
  button.disabled = true;
  
  showStatus('🔄 Resetting all data...', 'loading');
  
  try {
    await chrome.storage.local.clear();
    
    currentProfile = createDefaultProfile();
    settings = createDefaultSettings();
    usageStats = createDefaultStats();
    cvFile = null;
    
    document.querySelectorAll('input, textarea, select').forEach(element => {
      if (element.type !== 'button' && element.type !== 'submit') {
        element.value = '';
      }
    });
    
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = true;
    });
    
    const container = document.getElementById('extracted-data-container');
    if (container) container.innerHTML = 'Extracted data will appear here...';
    
    updateAllUI();
    
    await chrome.storage.local.set({
      profile: currentProfile,
      settings: settings,
      usageStats: usageStats
    });
    
    showStatus('✅ All data reset successfully', 'success');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    showStatus('❌ Failed to reset data', 'error');
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

async function saveSettings() {
  const button = document.getElementById('save-settings-btn');
  const originalText = button.innerHTML;
  
  button.innerHTML = '💾 Saving...';
  button.disabled = true;
  
  showStatus('💾 Saving settings...', 'loading');
  
  try {
    settings = {
      autoFill: document.getElementById('auto-fill-toggle').checked,
      highlightFields: document.getElementById('highlight-fields-toggle').checked,
      showNotifications: document.getElementById('show-notifications-toggle').checked,
      autoSubmit: document.getElementById('auto-submit-toggle')?.checked || false,
      autoUploadCV: document.getElementById('auto-upload-cv-toggle').checked,
      smartDropdownSelection: document.getElementById('smart-dropdown-toggle').checked,
      keyboardShortcut: true
    };
    
    await chrome.storage.local.set({ settings });
    
    button.innerHTML = '💾 Settings Saved!';
    button.classList.remove('btn--pulse');
    showStatus('✅ Settings saved successfully', 'success');
    
    setTimeout(() => {
      button.innerHTML = '💾 Save Settings';
      button.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
    showStatus('❌ Failed to save settings', 'error');
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

async function autoSubmitForm() {
  try {
    await chrome.tabs.sendMessage(currentTab.id, { action: 'autoSubmit' });
    showStatus('✅ Form submitted successfully', 'success');
  } catch (error) {
    console.warn('⚠️ Auto-submit failed:', error);
  }
}

function updateFormWithExtractedData(data) {
  Object.entries(data).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element && value && !element.value.trim()) {
      element.value = value;
      element.style.borderColor = '#4CAF50';
      element.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.2)';
      
      setTimeout(() => {
        element.style.borderColor = '';
        element.style.boxShadow = '';
      }, 2000);
    }
  });
  
  const saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) {
    saveBtn.classList.add('btn--pulse');
    saveBtn.innerHTML = '💾 Save Profile (Unsaved Changes)';
  }
}

async function updateUsageStatsAfterFill(fieldsFilled, formsFilled, cvUploads = 0) {
  usageStats.fieldsFilled += fieldsFilled;
  usageStats.formsFilled += (formsFilled || 1);
  usageStats.cvUploads += cvUploads;
  usageStats.lastUsed = new Date().toISOString();
  
  if (currentTab?.url) {
    const domain = new URL(currentTab.url).hostname;
    const existingSite = usageStats.favoriteSites.find(site => site.domain === domain);
    
    if (existingSite) {
      existingSite.count += 1;
      existingSite.lastUsed = usageStats.lastUsed;
    } else {
      usageStats.favoriteSites.push({
        domain,
        count: 1,
        lastUsed: usageStats.lastUsed
      });
    }
    
    usageStats.favoriteSites.sort((a, b) => b.count - a.count);
    usageStats.favoriteSites = usageStats.favoriteSites.slice(0, 5);
  }
  
  await chrome.storage.local.set({ usageStats });
  updateUsageStats();
}

function updateAllUI() {
  updateStatusIndicator();
  updateCVStatus();
  updateUsageStats();
  checkPageForms();
}

function updateStatusIndicator() {
  const statusEl = document.getElementById('status-indicator');
  if (!statusEl) return;
  
  const filledFields = Object.values(currentProfile).filter(val => val && val.trim()).length;
  const totalFields = Object.keys(currentProfile).length;
  
  if (filledFields === 0 && !cvFile) {
    statusEl.textContent = '❌ No profile data or CV saved';
    statusEl.className = 'status-indicator status-indicator--error';
  } else if (filledFields < totalFields / 2 && !cvFile) {
    statusEl.textContent = `⚠️ ${filledFields}/${totalFields} fields filled, no CV`;
    statusEl.className = 'status-indicator status-indicator--warning';
  } else {
    statusEl.textContent = `✅ ${filledFields}/${totalFields} fields filled, CV ready`;
    statusEl.className = 'status-indicator status-indicator--success';
  }
}

function updateCVStatus() {
  const cvStatusEl = document.getElementById('cv-status');
  if (cvStatusEl) {
    if (cvFile) {
      cvStatusEl.innerHTML = `📎 <strong>${cvFile.name}</strong> (${(cvFile.size / 1024).toFixed(1)} KB)`;
    } else {
      cvStatusEl.textContent = 'No CV stored';
    }
  }
}

function updateUsageStats() {
  const formsFilledEl = document.getElementById('forms-filled');
  const fieldsFilledEl = document.getElementById('fields-filled');
  const cvUploadsEl = document.getElementById('cv-uploads');
  const lastUsedEl = document.getElementById('last-used');
  
  if (formsFilledEl) formsFilledEl.textContent = usageStats.formsFilled;
  if (fieldsFilledEl) fieldsFilledEl.textContent = usageStats.fieldsFilled;
  if (cvUploadsEl) cvUploadsEl.textContent = usageStats.cvUploads;
  
  if (lastUsedEl) {
    if (usageStats.lastUsed) {
      const lastUsed = new Date(usageStats.lastUsed);
      const now = new Date();
      const diffHours = Math.floor((now - lastUsed) / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        lastUsedEl.textContent = 'Just now';
      } else if (diffHours < 24) {
        lastUsedEl.textContent = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        lastUsedEl.textContent = lastUsed.toLocaleDateString();
      }
    } else {
      lastUsedEl.textContent = 'Never';
    }
  }
}

async function checkPageForms() {
  try {
    if (!currentTab || currentTab.url.startsWith('chrome://')) {
      return;
    }
    
    let response;
    try {
      response = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
    } catch (error) {
      return;
    }
    
    if (response?.status === 'ready') {
      const formsResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'detectForms' });
      
      const smartFillBtn = document.getElementById('smart-fill-btn');
      if (smartFillBtn) {
        if (formsResponse?.formsCount > 0 || formsResponse?.fieldsCount > 0) {
          smartFillBtn.disabled = false;
          showStatus(`📋 ${formsResponse.formsCount} forms, ${formsResponse.fieldsCount} fields, ${formsResponse.selectFieldsCount || 0} dropdowns`, 'info');
        } else {
          smartFillBtn.disabled = true;
          showStatus('❌ No form fields detected', 'error');
        }
      }
    }
  } catch (error) {
    // Silently fail
  }
}

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
  
  if (type === 'success') {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        updateStatusIndicator();
      }
    }, 3000);
  }
}

function resetButton(button, originalText) {
  button.innerHTML = originalText;
  button.disabled = false;
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace('_', ' ');
}