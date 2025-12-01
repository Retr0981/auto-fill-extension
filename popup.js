// popup.js - FIXED Data Persistence & Logic

let userData = {};
let currentCV = null;

// SIMPLIFIED: Single source of truth - always load from storage
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  setupEventListeners();
  initTesseract();
});

// CRITICAL: Load ALL data from storage every time
async function loadAllData() {
  const [syncResult, localResult] = await Promise.all([
    chrome.storage.sync.get(['userData']),
    chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType', 'cvDataExtracted'])
  ]);
  
  // Load user data
  userData = syncResult.userData || {};
  
  // Load CV
  if (localResult.cvFile) {
    currentCV = {
      data: localResult.cvFile,
      name: localResult.cvFileName,
      type: localResult.cvFileType
    };
    document.getElementById('cvStatus').textContent = `✅ ${localResult.cvFileName}`;
  }
  
  // Merge extracted CV data
  if (localResult.cvDataExtracted && Object.keys(localResult.cvDataExtracted).length > 0) {
    userData = { ...userData, ...localResult.cvDataExtracted };
    // Save merged data back
    await chrome.storage.sync.set({ userData });
  }
  
  updateStatus();
}

// SIMPLIFIED status update
function updateStatus() {
  const sources = [];
  if (Object.keys(userData).length > 0) sources.push('Profile');
  if (currentCV) sources.push('CV');
  
  const indicator = document.getElementById('dataSources');
  if (sources.length > 0) {
    indicator.textContent = `✅ Ready: ${sources.join(' + ')} (${Object.keys(userData).length} fields)`;
    indicator.className = 'data-sources ready';
  } else {
    indicator.textContent = '❌ No data loaded. Upload CV or enter manually.';
    indicator.className = 'data-sources empty';
  }
}

// Upload CV
async function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const base64 = await fileToBase64(file);
  await chrome.storage.local.set({
    cvFile: base64,
    cvFileName: file.name,
    cvFileType: file.type
  });
  
  currentCV = { data: base64, name: file.name, type: file.type };
  document.getElementById('cvStatus').textContent = `✅ ${file.name}`;
  showStatus('📎 CV uploaded! Click "Extract" to analyze.', 'success');
  updateStatus();
}

// Extract CV data
async function extractCVData() {
  if (!tesseractReady || !currentCV) return;
  
  showProgress('Extracting...', 20);
  
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        showProgress(`Reading: ${Math.round(m.progress * 100)}%`, 20 + (m.progress * 40));
      }
    }
  });
  
  const { data: { text } } = await worker.recognize(currentCV.data);
  await worker.terminate();
  
  showProgress('Parsing data...', 70);
  
  const extracted = parseCVIntelligently(text);
  
  if (Object.keys(extracted).length > 0) {
    userData = { ...userData, ...extracted };
    await chrome.storage.sync.set({ userData });
    
    displayExtractedData(extracted);
    showStatus(`✅ Extracted ${Object.keys(extracted).length} fields!`, 'success');
    updateStatus();
  }
  
  hideProgress();
}

// Preview CV
function previewCV() {
  if (!currentCV) return;
  window.open(currentCV.data);
}

// Toggle manual form
function toggleManualForm() {
  const form = document.getElementById('manualForm');
  const toggle = document.getElementById('toggleManual');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
  toggle.textContent = form.style.display === 'block' ? '🔼 Hide Manual Form' : '✏️ Enter Data Manually';
  toggle.className = form.style.display === 'block' ? 'danger' : 'secondary';
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
    showStatus('❌ Enter at least one field', 'warning');
    return;
  }
  
  userData = { ...userData, ...manualData };
  await chrome.storage.sync.set({ userData });
  
  document.getElementById('manualForm').style.display = 'none';
  toggleManualForm();
  
  showStatus(`✅ Saved ${Object.keys(manualData).length} fields!`, 'success');
  updateStatus();
}

// Smart fill EVERYTHING
async function smartFillEverything() {
  if (!userData.email) {
    showStatus('❌ No data! Upload CV or enter manually.', 'error');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showProgress('Filling all fields...', 10);
  
  try {
    const result = await chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType']);
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType,
      intelligentMode: true
    });
    
    if (response?.filled > 0) {
      showStatus(`🎯 Filled ${response.filled}/${response.total} fields!`, 'success');
    } else {
      showStatus('⚠️ No fields found to fill', 'warning');
    }
    
  } catch (error) {
    console.error('Fill error:', error);
    showStatus(`❌ Failed: ${error.message}. Try refreshing page.`, 'error');
  } finally {
    hideProgress();
  }
}

// Extract browser data
async function extractBrowserData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showProgress('Extracting...', 30);
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" });
    if (response?.autofillData) {
      userData = { ...userData, ...response.autofillData };
      await chrome.storage.sync.set({ userData });
      showStatus(`✅ Extracted ${Object.keys(response.autofillData).length} fields!`, 'success');
      updateStatus();
    } else {
      showStatus('ℹ️ No browser data found', 'info');
    }
  } catch (error) {
    showStatus('❌ Error extracting', 'error');
  } finally {
    hideProgress();
  }
}

// Save profile
async function saveProfile() {
  await chrome.storage.sync.set({ userData });
  showStatus('💾 Profile saved!', 'success');
}

// Reset
async function resetAllData() {
  if (!confirm('🚨 DELETE ALL DATA?')) return;
  
  await Promise.all([
    chrome.storage.local.clear(),
    chrome.storage.sync.clear()
  ]);
  
  userData = {};
  currentCV = null;
  
  window.location.reload();
}

// Helper functions
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initTesseract() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  script.onload = () => tesseractReady = true;
  script.onerror = () => tesseractReady = false;
  document.head.appendChild(script);
}

function parseCVIntelligently(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 3);
  
  // Extract emails
  const emails = text.match(CV_PATTERNS.email) || [];
  if (emails.length > 0) data.email = emails[0];
  
  // Extract phone
  const phones = [...text.matchAll(CV_PATTERNS.phone)];
  if (phones.length > 0) data.phone = phones[0][0];
  
  // Extract URLs
  const urls = text.match(CV_PATTERNS.url) || [];
  urls.forEach(url => {
    const lower = url.toLowerCase();
    if (lower.includes('linkedin')) data.linkedin = url;
    else if (lower.includes('github')) data.portfolio = url;
  });
  
  // Extract name
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    const nameMatch = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
    if (nameMatch) {
      data.firstName = nameMatch[1];
      data.lastName = nameMatch[2];
      break;
    }
  }
  
  // Extract skills
  const skillsPattern = /skills?:?\s*([^\n]*)/i;
  const skillsMatch = text.match(skillsPattern);
  if (skillsMatch) {
    data.skills = skillsMatch[1].substring(0, 100);
  }
  
  return data;
}

// Simplified UI helpers
function showProgress(message, percent) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status info';
  status.style.display = 'block';
  document.getElementById('progressBar').classList.add('active');
  document.getElementById('progressFill').style.width = `${percent}%`;
}

function hideProgress() {
  document.getElementById('progressBar').classList.remove('active');
  document.getElementById('status').style.display = 'none';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', type === 'success' ? 4000 : 6000);
}

function updateStatus() {
  const indicator = document.getElementById('dataSources');
  if (Object.keys(userData).length > 0) {
    indicator.textContent = `✅ Ready: ${Object.keys(userData).length} fields`;
    indicator.className = 'data-sources ready';
  } else {
    indicator.textContent = '❌ No data loaded';
    indicator.className = 'data-sources empty';
  }
}

function displayExtractedData(data) {
  const container = document.getElementById('extractedData');
  container.innerHTML = '';
  Object.entries(data).forEach(([key, value]) => {
    const item = document.createElement('div');
    item.className = 'data-item';
    item.textContent = `${key}: ${value}`;
    container.appendChild(item);
  });
  container.style.display = 'block';
}