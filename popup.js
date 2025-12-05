// AutoFill Pro Popup - Simple Version
console.log('AutoFill Pro Popup loaded');

let currentTab = null;
let currentProfile = {};
let settings = {};

// DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing popup...');
    
    try {
        // Get current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tabs[0];
        
        // Load data
        await loadData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check current page for forms
        checkPageForms();
        
        console.log('Popup initialized');
    } catch (error) {
        console.error('Error:', error);
        setStatus('Error loading extension', 'error');
    }
});

// Load data from storage
async function loadData() {
    try {
        const result = await chrome.storage.local.get(['profile', 'settings', 'stats']);
        
        // Load profile
        currentProfile = result.profile || {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: ''
        };
        
        // Load settings
        settings = result.settings || {
            prioritizeMandatory: true,
            highlightFields: true,
            showNotifications: true,
            autoSubmit: false
        };
        
        // Load stats
        const stats = result.stats || { formsFilled: 0, fieldsFilled: 0 };
        
        // Update UI
        updateProfileForm();
        updateSettingsUI();
        updateStats(stats);
        
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Update profile form
function updateProfileForm() {
    document.getElementById('firstName').value = currentProfile.firstName || '';
    document.getElementById('lastName').value = currentProfile.lastName || '';
    document.getElementById('email').value = currentProfile.email || '';
    document.getElementById('phone').value = currentProfile.phone || '';
    document.getElementById('address').value = currentProfile.address || '';
}

// Update settings UI
function updateSettingsUI() {
    document.getElementById('toggle-mandatory').checked = settings.prioritizeMandatory;
    document.getElementById('toggle-highlight').checked = settings.highlightFields;
    document.getElementById('toggle-notifications').checked = settings.showNotifications;
    document.getElementById('toggle-autosubmit').checked = settings.autoSubmit;
}

// Update stats
function updateStats(stats) {
    document.getElementById('stat-forms').textContent = stats.formsFilled || 0;
    document.getElementById('stat-fields').textContent = stats.fieldsFilled || 0;
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Smart Fill button
    document.getElementById('smart-fill-btn').addEventListener('click', handleSmartFill);
    
    // Mandatory Fill button
    document.getElementById('mandatory-btn').addEventListener('click', handleMandatoryFill);
    
    // Save Profile button
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    
    // Copy button
    document.getElementById('copy-btn').addEventListener('click', copyProfile);
    
    // Paste button
    document.getElementById('paste-btn').addEventListener('click', pasteProfile);
    
    // Detect button
    document.getElementById('detect-btn').addEventListener('click', checkPageForms);
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => switchTab('settings'));
    
    // CV Upload
    document.getElementById('cv-upload').addEventListener('change', handleCVUpload);
    
    // Extract CV button
    document.getElementById('extract-cv-btn').addEventListener('click', extractCVData);
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetData);
    
    // Settings toggles
    document.querySelectorAll('.toggle input').forEach(toggle => {
        toggle.addEventListener('change', saveSettings);
    });
}

// Switch tabs
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    
    // Show selected tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
}

// Handle Smart Fill
async function handleSmartFill() {
    console.log('Starting smart fill...');
    
    const button = document.getElementById('smart-fill-btn');
    const originalText = button.innerHTML;
    
    button.innerHTML = '⏳ Filling...';
    button.disabled = true;
    
    setStatus('Starting form fill...', 'loading');
    
    try {
        // Validate
        if (!currentTab || !currentTab.url || currentTab.url.startsWith('chrome://')) {
            throw new Error('Cannot fill on this page');
        }
        
        // Check profile
        if (Object.values(currentProfile).every(val => !val)) {
            throw new Error('Please save your profile first');
        }
        
        // Send fill command
        const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: 'smartFill',
            profile: currentProfile,
            settings: settings,
            fillAll: true
        });
        
        if (response && response.success) {
            setStatus(`✅ Filled ${response.filled} fields`, 'success');
            
            // Update stats
            await updateUsageStats(response.filled);
            
            // Auto-submit if enabled
            if (settings.autoSubmit && response.filled > 0) {
                setTimeout(async () => {
                    await chrome.tabs.sendMessage(currentTab.id, { action: 'autoSubmit' });
                }, 1000);
            }
        } else {
            setStatus('⚠️ No fields were filled', 'warning');
        }
        
    } catch (error) {
        console.error('Smart fill error:', error);
        
        if (error.message.includes('receiving end')) {
            // Content script not injected
            try {
                await injectContentScript();
                await new Promise(resolve => setTimeout(resolve, 500));
                await handleSmartFill(); // Retry
                return;
            } catch (injectError) {
                setStatus('❌ Failed to inject script', 'error');
            }
        } else {
            setStatus(`❌ ${error.message}`, 'error');
        }
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Handle Mandatory Fill
async function handleMandatoryFill() {
    console.log('Filling mandatory fields...');
    
    const button = document.getElementById('mandatory-btn');
    const originalText = button.innerHTML;
    
    button.innerHTML = '⏳ Filling mandatory...';
    button.disabled = true;
    
    setStatus('Filling mandatory fields...', 'loading');
    
    try {
        if (!currentTab || !currentTab.url || currentTab.url.startsWith('chrome://')) {
            throw new Error('Cannot fill on this page');
        }
        
        if (Object.values(currentProfile).every(val => !val)) {
            throw new Error('Please save your profile first');
        }
        
        const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: 'smartFill',
            profile: currentProfile,
            settings: settings,
            fillAll: false, // Fill mandatory only
            prioritizeMandatory: true
        });
        
        if (response && response.success) {
            const message = response.mandatoryFilled > 0 
                ? `✅ Filled ${response.mandatoryFilled} mandatory fields`
                : '⚠️ No mandatory fields found';
            setStatus(message, response.mandatoryFilled > 0 ? 'success' : 'warning');
            
            if (response.mandatoryFilled > 0) {
                await updateUsageStats(response.mandatoryFilled);
            }
        }
        
    } catch (error) {
        console.error('Mandatory fill error:', error);
        
        if (error.message.includes('receiving end')) {
            try {
                await injectContentScript();
                await new Promise(resolve => setTimeout(resolve, 500));
                await handleMandatoryFill();
                return;
            } catch (injectError) {
                setStatus('❌ Failed to inject script', 'error');
            }
        } else {
            setStatus(`❌ ${error.message}`, 'error');
        }
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Save Profile
async function saveProfile() {
    const button = document.getElementById('save-profile-btn');
    const originalText = button.innerHTML;
    
    button.innerHTML = '💾 Saving...';
    button.disabled = true;
    
    setStatus('Saving profile...', 'loading');
    
    try {
        // Gather data
        currentProfile = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim()
        };
        
        // Validate
        if (!currentProfile.firstName || !currentProfile.email) {
            throw new Error('First name and email are required');
        }
        
        // Save to storage
        await chrome.storage.local.set({ profile: currentProfile });
        
        setStatus('✅ Profile saved!', 'success');
        
        button.innerHTML = '✅ Saved!';
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Save error:', error);
        setStatus(`❌ ${error.message}`, 'error');
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Copy Profile
async function copyProfile() {
    try {
        const profileText = JSON.stringify(currentProfile, null, 2);
        await navigator.clipboard.writeText(profileText);
        setStatus('✅ Profile copied to clipboard', 'success');
        
        const button = document.getElementById('copy-btn');
        button.innerHTML = '✅ Copied!';
        setTimeout(() => {
            button.innerHTML = '📋 Copy Profile';
        }, 2000);
        
    } catch (error) {
        console.error('Copy error:', error);
        setStatus('❌ Failed to copy', 'error');
    }
}

// Paste Profile
async function pasteProfile() {
    try {
        const text = await navigator.clipboard.readText();
        let profile;
        
        try {
            profile = JSON.parse(text);
        } catch (e) {
            // Try to parse as simple text
            profile = parseTextProfile(text);
        }
        
        if (profile && Object.keys(profile).length > 0) {
            // Update form fields
            for (const [key, value] of Object.entries(profile)) {
                const input = document.getElementById(key);
                if (input && value) {
                    input.value = value;
                }
            }
            
            setStatus('✅ Profile pasted from clipboard', 'success');
            
            const button = document.getElementById('paste-btn');
            button.innerHTML = '✅ Pasted!';
            setTimeout(() => {
                button.innerHTML = '📥 Paste Profile';
            }, 2000);
        } else {
            setStatus('❌ No valid profile in clipboard', 'error');
        }
        
    } catch (error) {
        console.error('Paste error:', error);
        setStatus('❌ Failed to paste', 'error');
    }
}

// Parse text profile
function parseTextProfile(text) {
    const profile = {};
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.includes(':')) {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('first')) profile.firstName = value;
                else if (lowerKey.includes('last')) profile.lastName = value;
                else if (lowerKey.includes('email')) profile.email = value;
                else if (lowerKey.includes('phone')) profile.phone = value;
                else if (lowerKey.includes('address')) profile.address = value;
            }
        }
    }
    
    return profile;
}

// Save Settings
async function saveSettings() {
    try {
        settings = {
            prioritizeMandatory: document.getElementById('toggle-mandatory').checked,
            highlightFields: document.getElementById('toggle-highlight').checked,
            showNotifications: document.getElementById('toggle-notifications').checked,
            autoSubmit: document.getElementById('toggle-autosubmit').checked
        };
        
        await chrome.storage.local.set({ settings });
        setStatus('✅ Settings saved', 'success');
        
    } catch (error) {
        console.error('Save settings error:', error);
    }
}

// Check page for forms
async function checkPageForms() {
    try {
        if (!currentTab || currentTab.url.startsWith('chrome://')) {
            document.getElementById('page-status').textContent = 'Cannot check this page';
            return;
        }
        
        setStatus('Checking page for forms...', 'loading');
        
        let response;
        try {
            response = await chrome.tabs.sendMessage(currentTab.id, { action: 'detectForms' });
        } catch (error) {
            // Content script not loaded
            document.getElementById('page-status').textContent = 'No forms detected';
            setStatus('Ready to fill forms', 'info');
            return;
        }
        
        if (response && response.formsCount > 0) {
            const formsText = response.formsCount === 1 ? '1 form' : `${response.formsCount} forms`;
            const fieldsText = response.fieldsCount === 1 ? '1 field' : `${response.fieldsCount} fields`;
            const mandatoryText = response.mandatoryCount > 0 ? `(${response.mandatoryCount} mandatory)` : '';
            
            document.getElementById('page-status').textContent = `${formsText}, ${fieldsText} ${mandatoryText}`;
            setStatus('Ready to fill forms', 'info');
        } else {
            document.getElementById('page-status').textContent = 'No forms detected';
            setStatus('Ready to fill forms', 'info');
        }
        
    } catch (error) {
        console.error('Form detection error:', error);
        document.getElementById('page-status').textContent = 'Error checking page';
    }
}

// Handle CV Upload
async function handleCVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    setStatus('Uploading CV...', 'loading');
    
    try {
        // Validate file
        const validTypes = ['application/pdf', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'text/plain'];
        const validExt = ['.pdf', '.doc', '.docx', '.txt'];
        
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validTypes.includes(file.type) && !validExt.includes(ext)) {
            throw new Error('Invalid file type');
        }
        
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File too large (max 10MB)');
        }
        
        // Read file
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
        
        // Save CV
        const cvData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: fileData,
            uploadedAt: new Date().toISOString()
        };
        
        await chrome.storage.local.set({ cvFile: cvData });
        
        document.getElementById('cv-status').textContent = `📄 ${file.name} (${(file.size/1024).toFixed(1)}KB)`;
        setStatus('✅ CV uploaded successfully', 'success');
        
    } catch (error) {
        console.error('CV upload error:', error);
        setStatus(`❌ ${error.message}`, 'error');
        document.getElementById('cv-upload').value = '';
    }
}

// Extract CV Data
async function extractCVData() {
    try {
        const result = await chrome.storage.local.get(['cvFile']);
        const cvFile = result.cvFile;
        
        if (!cvFile) {
            setStatus('❌ No CV uploaded', 'error');
            return;
        }
        
        setStatus('Extracting data from CV...', 'loading');
        
        // This is a simple extraction - in a real app, you'd use a proper parser
        const extracted = {};
        
        // For text files
        if (cvFile.type.includes('text')) {
            const base64Content = cvFile.data.split(',')[1];
            const textContent = atob(base64Content);
            
            // Simple extraction
            const emailMatch = textContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch) extracted.email = emailMatch[0];
            
            const phoneMatch = textContent.match(/[\+]?[1-9][\d]{0,2}[\s]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
            if (phoneMatch) extracted.phone = phoneMatch[0];
            
            const nameMatch = textContent.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
            if (nameMatch) {
                extracted.firstName = nameMatch[1];
                extracted.lastName = nameMatch[2];
            }
        }
        
        // Update profile form with extracted data
        for (const [key, value] of Object.entries(extracted)) {
            const input = document.getElementById(key);
            if (input && value && !input.value.trim()) {
                input.value = value;
            }
        }
        
        if (Object.keys(extracted).length > 0) {
            setStatus(`✅ Extracted ${Object.keys(extracted).length} fields from CV`, 'success');
        } else {
            setStatus('⚠️ No data could be extracted from CV', 'warning');
        }
        
    } catch (error) {
        console.error('CV extraction error:', error);
        setStatus('❌ Failed to extract CV data', 'error');
    }
}

// Reset Data
async function resetData() {
    if (!confirm('Are you sure you want to reset ALL data?\n\nThis will clear:\n• Your profile\n• Settings\n• Statistics\n• Uploaded CV')) {
        return;
    }
    
    setStatus('Resetting data...', 'loading');
    
    try {
        // Clear all data
        await chrome.storage.local.clear();
        
        // Reset UI
        currentProfile = {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: ''
        };
        
        settings = {
            prioritizeMandatory: true,
            highlightFields: true,
            showNotifications: true,
            autoSubmit: false
        };
        
        updateProfileForm();
        updateSettingsUI();
        updateStats({ formsFilled: 0, fieldsFilled: 0 });
        
        document.getElementById('cv-status').textContent = 'No CV uploaded';
        document.getElementById('cv-upload').value = '';
        
        setStatus('✅ All data reset successfully', 'success');
        
    } catch (error) {
        console.error('Reset error:', error);
        setStatus('❌ Failed to reset data', 'error');
    }
}

// Update usage stats
async function updateUsageStats(fieldsFilled) {
    try {
        const result = await chrome.storage.local.get(['stats']);
        const stats = result.stats || { formsFilled: 0, fieldsFilled: 0 };
        
        stats.formsFilled += 1;
        stats.fieldsFilled += fieldsFilled;
        
        await chrome.storage.local.set({ stats });
        updateStats(stats);
        
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

// Set status message
function setStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-text');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.style.color = type === 'error' ? '#ef233c' : 
                          type === 'success' ? '#4cc9f0' : 
                          type === 'warning' ? '#f72585' : 
                          type === 'loading' ? '#4361ee' : 
                          'rgba(255, 255, 255, 0.8)';
}

// Inject content script
async function injectContentScript() {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js']
        });
        
        await chrome.scripting.insertCSS({
            target: { tabId: currentTab.id },
            files: ['content.css']
        });
        
        console.log('Content script injected');
        return true;
    } catch (error) {
        console.error('Failed to inject:', error);
        throw error;
    }
}