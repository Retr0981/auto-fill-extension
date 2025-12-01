// popup.js - Complete AutoFill Pro Logic

// State management
let userData = {};
let hasManualData = false;
let hasOCRData = false;
let hasBrowserData = false;
let currentCV = null;
let tesseractReady = false;

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadStoredData();
  setupEventListeners();
  await initTesseract();
  updateDataSourcesIndicator();
  checkShortcut();
});

// Load all stored data
async function loadStoredData() {
  try {
    const [syncResult, localResult] = await Promise.all([
      chrome.storage.sync.get(['userData', 'dataSources']),
      chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType', 'cvDataExtracted'])
    ]);
    
    userData = syncResult.userData || {};
    
    // Restore flags
    if (syncResult.dataSources) {
      hasManualData = syncResult.dataSources.manual || false;
      hasOCRData = syncResult.dataSources.ocr || false;
      hasBrowserData = syncResult.dataSources.browser || false;
    }
    
    // Check manual data
    if (Object.keys(userData).length > 0) {
      hasManualData = true;
    }
    
    // Restore CV
    if (localResult.cvFile) {
      currentCV = {
        data: localResult.cvFile,
        name: localResult.cvFileName,
        type: localResult.cvFileType
      };
      document.getElementById('cvStatus').textContent = `✅ ${localResult.cvFileName}`;
    }
    
    // Restore extracted data
    if (localResult.cvDataExtracted && Object.keys(localResult.cvDataExtracted).length > 0) {
      hasOCRData = true;
      displayExtractedData(localResult.cvDataExtracted);
    }
    
    // Show sample data for first-time users
    if (!hasManualData && !hasOCRData && !hasBrowserData) {
      showStatus('👋 Welcome! Upload a CV or enter data to begin.', 'info');
    }
    
  } catch (error) {
    console.error('❌ Load error:', error);
    showStatus('❌ Failed to load data', 'error');
  }
}

// Setup all event listeners
function setupEventListeners() {
  // CV Section
  document.getElementById('cvFile').addEventListener('change', handleCVUpload);
  document.getElementById('extractCVData').addEventListener('click', extractCVData);
  document.getElementById('previewCV').addEventListener('click', previewCV);
  
  // Manual Section
  document.getElementById('toggleManual').addEventListener('click', toggleManualForm);
  document.getElementById('saveManual').addEventListener('click', saveManualData);
  
  // Actions Section
  document.getElementById('smartFill').addEventListener('click', smartFillEverything);
  document.getElementById('verifyFill').addEventListener('click', verifyFill);
  document.getElementById('extractAutofill').addEventListener('click', extractBrowserData);
  document.getElementById('saveData').addEventListener('click', saveProfile);
  document.getElementById('clearAll').addEventListener('click', resetAllData);
  
  // Section toggles
  document.querySelectorAll('.section-header[data-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.toggle;
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });
}

// Initialize Tesseract from CDN (no manual download needed!)
async function initTesseract() {
  try {
    // Load from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => {
      tesseractReady = typeof Tesseract !== 'undefined';
      if (tesseractReady) {
        console.log('✅ Tesseract.js loaded from CDN');
        showStatus('✅ OCR ready!', 'success');
      }
    };
    script.onerror = () => {
      tesseractReady = false;
      showStatus('⚠️ OCR unavailable (offline mode)', 'warning');
    };
    document.head.appendChild(script);
  } catch (error) {
    console.warn('⚠️ Tesseract init failed:', error);
    tesseractReady = false;
  }
}

// Handle CV file upload
async function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  showProgress('Uploading CV...', 10);
  
  try {
    // Convert to base64 for storage
    const base64 = await fileToBase64(file);
    
    await chrome.storage.local.set({
      cvFile: base64,
      cvFileName: file.name,
      cvFileType: file.type
    });
    
    currentCV = { data: base64, name: file.name, type: file.type };
    document.getElementById('cvStatus').textContent = `✅ ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
    showStatus('📎 CV uploaded! Click "Extract" to analyze.', 'success');
    updateDataSourcesIndicator();
    hideProgress();
    
  } catch (error) {
    showStatus(`❌ Upload failed: ${error.message}`, 'error');
    hideProgress();
  }
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Extract CV data using OCR
async function extractCVData() {
  if (!tesseractReady) {
    showStatus('❌ OCR not ready. Check internet connection.', 'error');
    return;
  }
  
  if (!currentCV) {
    showStatus('❌ No CV uploaded. Please upload first.', 'warning');
    return;
  }
  
  showProgress('AI analyzing CV...', 20);
  
  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          showProgress(`Processing: ${Math.round(m.progress * 100)}%`, 20 + (m.progress * 40));
        }
      }
    });
    
    const { data: { text } } = await worker.recognize(currentCV.data);
    await worker.terminate();
    
    showProgress('Parsing structured data...', 70);
    
    const extracted = parseCVIntelligently(text);
    
    if (Object.keys(extracted).length === 0) {
      showStatus('⚠️ Could not extract data. Try manual entry.', 'warning');
      hideProgress();
      return;
    }
    
    showProgress('Merging with profile...', 90);
    
    // Merge data (OCR has lower priority than manual)
    userData = { ...userData, ...extracted };
    hasOCRData = true;
    
    await Promise.all([
      chrome.storage.local.set({ cvDataExtracted: extracted }),
      chrome.storage.sync.set({ userData: userData })
    ]);
    
    displayExtractedData(extracted);
    updateDataSourcesIndicator();
    showStatus(`✅ AI extracted ${Object.keys(extracted).length} fields!`, 'success');
    hideProgress();
    
  } catch (error) {
    console.error('❌ OCR Error:', error);
    showStatus('❌ OCR failed. Try again or use manual entry.', 'error');
    hideProgress();
  }
}

// Intelligent CV parsing
function parseCVIntelligently(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 3);
  
  // Extract emails (take most professional one)
  const emails = text.match(CV_PATTERNS.email) || [];
  if (emails.length > 0) {
    const professional = emails.filter(e => !/(gmail|yahoo|hotmail|outlook|aol)\./i.test(e));
    data.email = (professional[0] || emails[0]).toLowerCase();
  }
  
  // Extract phone
  const phones = [...text.matchAll(CV_PATTERNS.phone)];
  if (phones.length > 0) data.phone = phones[0][0];
  
  // Extract URLs
  const urls = text.match(CV_PATTERNS.url) || [];
  urls.forEach(url => {
    const lower = url.toLowerCase();
    if (lower.includes('linkedin')) data.linkedin = url.replace(/^https?:\/\//, '');
    else if (lower.includes('github') || lower.includes('gitlab') || lower.includes('portfolio')) {
      data.portfolio = url.replace(/^https?:\/\//, '');
    }
  });
  
  // Extract name (first 15 lines, look for "John Doe" pattern)
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    const nameMatch = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/) || 
                     line.match(/^([A-Z][a-z]+),\s*([A-Z][a-z]+)$/);
    if (nameMatch && !line.includes('@') && !line.includes('http') && line.length < 50) {
      data.firstName = nameMatch[2] || nameMatch[1];
      data.lastName = nameMatch[1] || nameMatch[2];
      break;
    }
  }
  
  // Extract graduation year (most recent)
  const years = text.match(CV_PATTERNS.year) || [];
  const currentYear = new Date().getFullYear();
  const validYears = years.map(y => parseInt(y)).filter(y => y >= 1980 && y <= currentYear);
  if (validYears.length > 0) data.graduationYear = Math.max(...validYears).toString();
  
  // Extract skills section
  const sections = ['skills', 'technologies', 'expertise', 'competencies', 'abilities'];
  const skillsPattern = new RegExp(`(${sections.join('|')}):?\\s*([\\s\\S]*?)(?=\\n\\s*(education|experience|projects|employment|$))`, 'i');
  const skillsMatch = text.match(skillsPattern);
  if (skillsMatch && skillsMatch[2]) {
    const skills = skillsMatch[2]
      .split(/[,\n•·-]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 40)
      .slice(0, 8);
    if (skills.length > 0) data.skills = skills.join(', ');
  }
  
  // Clean up
  Object.keys(data).forEach(key => {
    if (!data[key] || data[key].length > 200) delete data[key];
  });
  
  return data;
}

// Preview CV
function previewCV() {
  if (!currentCV) {
    showStatus('❌ No CV to preview', 'warning');
    return;
  }
  const newTab = window.open('', '_blank');
  newTab.document.write(`
    <html><head><title>CV Preview: ${currentCV.name}</title><style>
      body { margin: 0; padding: 20px; background: #f5f5f5; }
      embed { width: 100%; height: 90vh; border: none; }
    </style></head><body>
      <h2>Preview: ${currentCV.name}</h2>
      <embed src="${currentCV.data}" type="${currentCV.type}">
    </body></html>
  `);
}

// Toggle manual form
function toggleManualForm() {
  const form = document.getElementById('manualForm');
  const toggle = document.getElementById('toggleManual');
  const isVisible = form.style.display === 'block';
  
  form.style.display = isVisible ? 'none' : 'block';
  toggle.textContent = isVisible ? '✏️ Enter Data Manually' : '🔼 Hide Manual Form';
  toggle.className = isVisible ? 'secondary' : 'danger';
}

// Save manual data
async function saveManualData() {
  const manualData = {};
  const fields = ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'position', 'company'];
  
  fields.forEach(field => {
    const value = document.getElementById(`manual${field.charAt(0).toUpperCase() + field.slice(1)}`).value.trim();
    if (value) manualData[field] = value;
  });
  
  if (Object.keys(manualData).length === 0) {
    showStatus('❌ Please enter at least one field', 'warning');
    return;
  }
  
  userData = { ...userData, ...manualData };
  hasManualData = true;
  await saveProfile();
  
  document.getElementById('manualForm').style.display = 'none';
  document.getElementById('toggleManual').textContent = '✏️ Enter Data Manually';
  document.getElementById('toggleManual').className = 'secondary';
  
  updateDataSourcesIndicator();
  showStatus(`✅ Saved ${Object.keys(manualData).length} fields!`, 'success');
}

// Extract browser autofill
async function extractBrowserData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showProgress('Extracting browser data...', 30);
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" });
    
    if (response?.autofillData && Object.keys(response.autofillData).length > 0) {
      userData = { ...userData, ...response.autofillData };
      hasBrowserData = true;
      await saveProfile();
      updateDataSourcesIndicator();
      showStatus(`✅ Extracted ${Object.keys(response.autofillData).length} fields!`, 'success');
    } else {
      showStatus('ℹ️ No browser autofill found', 'info');
    }
  } catch (error) {
    showStatus('❌ Please refresh the page and try again', 'warning');
  } finally {
    hideProgress();
  }
}

// Smart fill everything
async function smartFillEverything() {
  if (!userData.email && !userData.firstName) {
    showStatus('❌ No profile data! Upload CV or enter manually.', 'error');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showProgress('Intelligently filling form...', 10);
  
  try {
    const result = await chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType']);
    
    // Detect form type
    const formType = detectFormType(tab.url);
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      fieldMappings: FIELD_ALIASES,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType,
      formType: formType,
      intelligentMode: true
    });
    
    if (response?.error) throw new Error(response.error);
    
    showProgress('Verifying fill...', 80);
    
    setTimeout(async () => {
      const verify = await chrome.tabs.sendMessage(tab.id, { action: "verifyFill" });
      if (verify) {
        const percent = Math.round((verify.filled / verify.total) * 100);
        showStatus(`🎯 ${percent}% Complete! (${verify.filled}/${verify.total} fields)`, 
                   percent >= 80 ? 'success' : 'warning');
        document.getElementById('statConfidence').textContent = `${percent}%`;
        hideProgress();
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Fill error:', error);
    showStatus(`❌ Failed: ${error.message}. Refresh page and retry.`, 'error');
    hideProgress();
  }
}

// Detect form type from URL
function detectFormType(url) {
  const lower = url.toLowerCase();
  if (lower.includes('job') || lower.includes('career') || lower.includes('apply') || lower.includes('workday')) {
    return 'jobApplication';
  }
  if (lower.includes('contact') || lower.includes('support')) return 'contact';
  if (lower.includes('register') || lower.includes('signup')) return 'registration';
  return null;
}

// Verify fill
async function verifyFill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showProgress('Verifying...', 50);
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "verifyFill" });
    if (response) {
      const percent = Math.round((response.filled / response.total) * 100);
      showStatus(`📊 ${percent}% Complete (${response.filled}/${response.total} fields)`, 
                 percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'info');
      document.getElementById('statConfidence').textContent = `${percent}%`;
    }
  } catch (error) {
    showStatus('❌ Verification failed', 'error');
  } finally {
    hideProgress();
  }
}

// Save profile
async function saveProfile() {
  try {
    await chrome.storage.sync.set({ 
      userData: userData,
      dataSources: {
        manual: hasManualData,
        ocr: hasOCRData,
        browser: hasBrowserData,
        lastUpdated: new Date().toISOString()
      }
    });
    updateDataSourcesIndicator();
    showStatus('💾 Profile saved to cloud!', 'success');
  } catch (error) {
    showStatus('❌ Save failed', 'error');
  }
}

// Reset all data
async function resetAllData() {
  if (!confirm('🚨 Delete ALL data (CV, profile, settings)?')) return;
  
  showProgress('Resetting...', 20);
  
  try {
    await Promise.all([
      chrome.storage.local.clear(),
      chrome.storage.sync.clear()
    ]);
    
    userData = {};
    hasManualData = false;
    hasOCRData = false;
    hasBrowserData = false;
    currentCV = null;
    
    // Reset UI
    document.getElementById('cvStatus').textContent = 'No CV stored';
    document.getElementById('extractedData').style.display = 'none';
    updateDataSourcesIndicator();
    
    showStatus('🔄 Reset complete! Reloading...', 'info');
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    showStatus('❌ Reset failed', 'error');
    hideProgress();
  }
}

// Display extracted data
function displayExtractedData(data) {
  if (!data || Object.keys(data).length === 0) return;
  
  const container = document.getElementById('extractedData');
  container.innerHTML = '';
  container.style.display = 'block';
  
  const title = document.createElement('div');
  title.innerHTML = '<strong>📊 AI Extracted Data:</strong>';
  title.style.marginBottom = '8px';
  container.appendChild(title);
  
  Object.entries(data).forEach(([key, value]) => {
    if (value && value.length < 100) {
      const item = document.createElement('div');
      item.className = 'data-item';
      item.textContent = `${key}: ${value}`;
      container.appendChild(item);
    }
  });
}

// Update status indicator
function updateDataSourcesIndicator() {
  const sources = [];
  if (hasManualData) sources.push('Manual');
  if (hasOCRData) sources.push('CV AI');
  if (hasBrowserData) sources.push('Browser');
  
  const indicator = document.getElementById('dataSources');
  const icon = document.getElementById('statusIcon');
  const text = document.getElementById('statusText');
  
  if (sources.length > 0) {
    icon.textContent = '✅';
    text.textContent = `Ready: ${sources.join(' + ')} (${Object.keys(userData).length} fields)`;
    indicator.className = 'data-sources ready';
    updateStats(Object.keys(userData).length, calculateConfidence());
  } else {
    icon.textContent = '❌';
    text.textContent = 'No data loaded. Upload CV or enter manually.';
    indicator.className = 'data-sources empty';
  }
}

// Calculate confidence score
function calculateConfidence() {
  const requiredFields = ['firstName', 'lastName', 'email'];
  const hasRequired = requiredFields.every(field => userData[field]);
  return hasRequired ? Math.min(95, 60 + Object.keys(userData).length * 2) : Math.min(60, Object.keys(userData).length * 5);
}

// Update statistics
function updateStats(fields, confidence) {
  document.getElementById('stats').style.display = 'flex';
  document.getElementById('statFields').textContent = fields;
  document.getElementById('statConfidence').textContent = `${confidence}%`;
  document.getElementById('statForms').textContent = 'All';
}

// Show progress bar
function showProgress(message, percent) {
  const status = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  
  status.textContent = message;
  status.className = 'status info';
  status.style.display = 'block';
  
  progressBar.classList.add('active');
  progressFill.style.width = `${percent}%`;
}

// Hide progress bar
function hideProgress() {
  setTimeout(() => {
    document.getElementById('progressBar').classList.remove('active');
    document.getElementById('status').style.display = 'none';
  }, 1000);
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  const delay = type === 'error' ? 7000 : type === 'success' ? 4000 : 5000;
  setTimeout(() => status.style.display = 'none', delay);
}

// Check and show shortcut tip
function checkShortcut() {
  chrome.commands.getAll((commands) => {
    const shortcut = commands.find(c => c.name === 'smart-fill')?.shortcut;
    if (shortcut) {
      console.log(`⌨️ Shortcut registered: ${shortcut}`);
    }
  });
}