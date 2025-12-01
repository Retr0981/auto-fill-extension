let userData = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", country: "", zip: "",
  linkedin: "", portfolio: "", summary: "",
  degree: "", university: "", graduationYear: "",
  company: "", position: "", workStartDate: "", workEndDate: "",
  experience: "", skills: "", salary: "", birthDate: ""
};

// Load stored data
chrome.storage.sync.get(['userData'], (result) => {
  if (result.userData) {
    userData = { ...userData, ...result.userData };
    populateManualForm(result.userData); // Fill manual form if data exists
  }
});

// Load CV status
chrome.storage.local.get(['cvFileName', 'cvDataExtracted'], (result) => {
  const cvStatus = document.getElementById('cvStatus');
  cvStatus.textContent = result.cvFileName ? `✅ ${result.cvFileName}` : '❌ No CV stored';
  cvStatus.style.color = result.cvFileName ? '#34A853' : '#EA4335';
  
  if (result.cvDataExtracted) {
    userData = { ...userData, ...result.cvDataExtracted };
    displayExtractedData(result.cvDataExtracted);
  }
});

// Toggle manual form
document.getElementById('toggleManual').addEventListener('click', () => {
  const form = document.getElementById('manualForm');
  const toggle = document.getElementById('toggleManual');
  const isVisible = form.style.display === 'block';
  
  form.style.display = isVisible ? 'none' : 'block';
  toggle.textContent = isVisible ? '✏️ Enter Data Manually' : '🔼 Hide Manual Form';
  toggle.className = isVisible ? 'warning' : 'danger';
});

// Save manual data
document.getElementById('saveManual').addEventListener('click', () => {
  const manualData = {
    firstName: document.getElementById('manualFirstName').value,
    lastName: document.getElementById('manualLastName').value,
    email: document.getElementById('manualEmail').value,
    phone: document.getElementById('manualPhone').value,
    linkedin: document.getElementById('manualLinkedin').value,
    portfolio: document.getElementById('manualPortfolio').value,
    summary: document.getElementById('manualSummary').value
  };
  
  // Remove empty fields
  Object.keys(manualData).forEach(key => {
    if (!manualData[key]) delete manualData[key];
  });
  
  if (Object.keys(manualData).length === 0) {
    showStatus('❌ No data entered', 'warning');
    return;
  }
  
  userData = { ...userData, ...manualData };
  chrome.storage.local.set({ cvDataExtracted: manualData });
  displayExtractedData(manualData);
  
  showStatus(`✅ Saved ${Object.keys(manualData).length} manual fields`, 'success');
  
  // Hide form after saving
  document.getElementById('manualForm').style.display = 'none';
  document.getElementById('toggleManual').textContent = '✏️ Enter Data Manually';
  document.getElementById('toggleManual').className = 'warning';
});

// Populate manual form with existing data
function populateManualForm(data) {
  if (data.firstName) document.getElementById('manualFirstName').value = data.firstName;
  if (data.lastName) document.getElementById('manualLastName').value = data.lastName;
  if (data.email) document.getElementById('manualEmail').value = data.email;
  if (data.phone) document.getElementById('manualPhone').value = data.phone;
  if (data.linkedin) document.getElementById('manualLinkedin').value = data.linkedin;
  if (data.portfolio) document.getElementById('manualPortfolio').value = data.portfolio;
  if (data.summary) document.getElementById('manualSummary').value = data.summary;
}

// Extract CV data with OCR (Fixed for images + PDFs)
document.getElementById('extractCVData').addEventListener('click', async () => {
  if (typeof Tesseract === 'undefined') {
    showStatus('❌ Missing tesseract.min.js!', 'warning');
    console.error('ERROR: Download tesseract.min.js from https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName'], async (result) => {
    if (!result.cvFile) {
      showStatus('❌ No CV uploaded', 'warning');
      return;
    }
    
    showStatus(`🔍 Reading ${result.cvFileName}...`, 'info');
    document.getElementById('ocrStatus').textContent = 'Processing... (10-20 seconds)';
    
    try {
      const uint8Array = new Uint8Array(result.cvFile);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      
      // Create worker with progress
      const worker = await Tesseract.createWorker('eng');
      worker.setParameters({
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.@+-_',
        preserve_interword_spaces: '1'
      });
      
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      
      document.getElementById('ocrStatus').textContent = 'Extraction complete!';
      
      // Parse and store
      const extracted = parseCVText(text);
      userData = { ...userData, ...extracted };
      chrome.storage.local.set({ cvDataExtracted: extracted });
      displayExtractedData(extracted);
      
      showStatus(`✅ Extracted ${Object.keys(extracted).length} fields`, 'success');
      
    } catch (error) {
      showStatus(`❌ OCR failed: ${error.message}`, 'warning');
      document.getElementById('ocrStatus').textContent = 'Extraction failed. Use manual entry.';
      console.error('OCR Error:', error);
    }
  });
});

// Parse CV text
function parseCVText(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  
  // Name (first 10 lines)
  for (const line of lines.slice(0, 10)) {
    const nameMatch = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
    if (nameMatch && !line.includes('@') && !line.includes('http')) {
      data.firstName = nameMatch[1];
      data.lastName = nameMatch[2];
      break;
    }
  }
  
  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) data.email = emailMatch[0];
  
  // Phone
  const phoneMatch = text.match(/(\+?1\s*[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
  if (phoneMatch) data.phone = phoneMatch[0];
  
  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
  if (linkedinMatch) data.linkedin = linkedinMatch[0];
  
  // GitHub
  const githubMatch = text.match(/github\.com\/[a-zA-Z0-9-]+/);
  if (githubMatch) data.portfolio = githubMatch[0];
  
  // Address
  const addressMatch = text.match(/\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/);
  if (addressMatch) data.address = addressMatch[0];
  
  // Degree
  const degreeKeywords = ['Bachelor', 'Master', 'PhD', 'BS', 'MS', 'BA', 'MA', 'B.Sc', 'M.Sc'];
  for (const line of lines) {
    if (degreeKeywords.some(d => line.includes(d))) {
      data.degree = line;
      break;
    }
  }
  
  // Skills
  const skillsSection = text.match(/skills?:?(.+?)(experience|education|project|$)/is);
  if (skillsSection) {
    data.skills = skillsSection[1].trim().split('\n').slice(0, 5).join(', ');
  }
  
  // Experience years
  const expMatch = text.match(/(\d+)\s*(years?|yrs?)\s*(experience|exp)/i);
  if (expMatch) data.experience = expMatch[1];
  
  return data;
}

function displayExtractedData(data) {
  const container = document.getElementById('extractedData');
  container.innerHTML = '';
  container.style.display = 'block';
  
  const title = document.createElement('div');
  title.innerHTML = '<strong>📊 Extracted:</strong>';
  title.style.marginBottom = '8px';
  container.appendChild(title);
  
  Object.entries(data).forEach(([key, value]) => {
    if (value) {
      const item = document.createElement('div');
      item.className = 'data-item';
      item.textContent = `${key}: ${value}`;
      container.appendChild(item);
    }
  });
}

// Browser autofill
document.getElementById('extractAutofill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Refresh page', 'warning');
      return;
    }
    
    if (response?.autofillData) {
      userData = { ...userData, ...response.autofillData };
      showStatus(`📥 Extracted ${Object.keys(response.autofillData).length} browser fields`, 'success');
    }
  });
});

// CV file handler (handles PDF & images)
document.getElementById('cvFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  showStatus(`Reading ${file.name}...`, 'info');
  
  const reader = new FileReader();
  reader.onload = (event) => {
    chrome.storage.local.set({
      cvFile: Array.from(new Uint8Array(event.target.result)),
      cvFileName: file.name,
      cvFileType: file.type
    }, () => {
      showStatus(`✅ CV stored (${(file.size/1024).toFixed(1)} KB)`, 'success');
      const cvStatus = document.getElementById('cvStatus');
      cvStatus.textContent = `✅ ${file.name}`;
      cvStatus.style.color = '#34A853';
    });
  };
  
  reader.onerror = () => showStatus('❌ Failed to read file', 'warning');
  reader.readAsArrayBuffer(file);
});

// Smart fill
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    if (!userData.email && !userData.firstName) {
      showStatus('⚠️ No data! Extract CV or enter manually', 'warning');
      return;
    }
    
    showStatus('🚀 Filling ALL fields + uploading CV...', 'info');
    
    // Retry logic for dynamic forms
    const fill = () => chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    });
    
    fill();
    setTimeout(fill, 1000); // Retry once
  });
});

// Verify
document.getElementById('verifyFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "verifyFill" }, (response) => {
    if (response) {
      const percent = Math.round((response.filled / response.total) * 100);
      showStatus(`📊 ${percent}% Complete (${response.filled}/${response.total})`, 
                 percent === 100 ? 'success' : 'warning');
    }
  });
});

// Click buttons
document.getElementById('clickButtons').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "clickButtons" });
  showStatus('👆 Clicking Submit/Apply/Next buttons...', 'info');
});

// Save all data
document.getElementById('saveData').addEventListener('click', () => {
  if (!userData.email && !userData.firstName) {
    showStatus('❌ No data to save', 'warning');
    return;
  }
  
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus('💾 Data saved permanently', 'success');
  });
});

// Reset
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('🚨 Delete ALL data (CV + OCR + manual)?')) {
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    showStatus('🔄 Reset complete - reloading...', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  
  status.style.background = type === 'success' ? '#d4edda' : 
                           type === 'warning' ? '#fff3cd' : '#d1ecf1';
  status.style.color = type === 'success' ? '#155724' : 
                       type === 'warning' ? '#856404' : '#0c5460';
  
  setTimeout(() => status.style.display = 'none', 5000);
}