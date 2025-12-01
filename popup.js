let userData = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", country: "", zip: "",
  linkedin: "", portfolio: "", summary: "",
  degree: "", university: "", graduationYear: "",
  company: "", position: "", workStartDate: "", workEndDate: "",
  experience: "", skills: "", salary: "", birthDate: ""
};

let hasManualData = false;
let hasOCRData = false;
let hasBrowserData = false;

// Field alias mappings - maps standard keys to all known variations
const fieldAliases = {
  firstName: ['firstName', 'first_name', 'firstname', 'forename', 'givenName', 'given_name', 'fname', 'first'],
  lastName: ['lastName', 'last_name', 'lastname', 'surname', 'familyName', 'family_name', 'lname', 'last'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone'],
  address: ['address', 'streetAddress', 'street_address', 'addr'],
  city: ['city', 'town'],
  country: ['country', 'nation'],
  zip: ['zip', 'zipCode', 'zip_code', 'postalCode', 'postal_code', 'postcode'],
  linkedin: ['linkedin', 'linkedIn', 'linkedinUrl'],
  portfolio: ['portfolio', 'website', 'github', 'gitlab', 'personalWebsite'],
  summary: ['summary', 'about', 'description', 'bio'],
  degree: ['degree', 'education', 'qualification'],
  university: ['university', 'college', 'school', 'institution'],
  graduationYear: ['graduationYear', 'graduation_year', 'graduation', 'yearGraduated'],
  company: ['company', 'employer', 'organisation', 'organization'],
  position: ['position', 'jobTitle', 'job_title', 'title', 'role'],
  workStartDate: ['workStartDate', 'work_start_date', 'startDate', 'start_date'],
  workEndDate: ['workEndDate', 'work_end_date', 'endDate', 'end_date'],
  experience: ['experience', 'yearsExperience', 'years_experience', 'exp'],
  skills: ['skills', 'skill', 'abilities', 'competencies'],
  salary: ['salary', 'expectedSalary', 'expected_salary', 'compensation'],
  birthDate: ['birthDate', 'birth_date', 'dateOfBirth', 'date_of_birth', 'dob']
};

// Normalize any field name variation to standard key
function normalizeFieldName(name) {
  const lowerName = name.toLowerCase().replace(/[\s_-]/g, '');
  for (const [standard, aliases] of Object.entries(fieldAliases)) {
    if (standard.toLowerCase() === lowerName || 
        aliases.some(alias => alias.toLowerCase() === lowerName)) {
      return standard;
    }
  }
  return name; // Return original if no match found
}

// Normalize entire data object to use standard keys
function normalizeData(data) {
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && value.toString().trim()) {
      const normalizedKey = normalizeFieldName(key);
      normalized[normalizedKey] = value.toString().trim();
    }
  }
  return normalized;
}

// Load ALL data sources on startup
chrome.storage.sync.get(['userData'], (syncResult) => {
  if (syncResult.userData) {
    const normalized = normalizeData(syncResult.userData);
    userData = { ...userData, ...normalized };
    hasManualData = Object.keys(normalized).length > 0;
  }
  
  chrome.storage.local.get(['cvFileName', 'cvDataExtracted'], (localResult) => {
    if (localResult.cvFileName) {
      document.getElementById('cvStatus').textContent = `✅ ${localResult.cvFileName}`;
      document.getElementById('cvStatus').style.color = '#34A853';
    }
    
    if (localResult.cvDataExtracted) {
      const normalized = normalizeData(localResult.cvDataExtracted);
      userData = { ...userData, ...normalized };
      hasOCRData = true;
      displayExtractedData(normalized);
      populateManualForm(normalized);
    }
    
    // Check browser data
    setTimeout(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" }, (response) => {
        if (response?.autofillData && Object.keys(response.autofillData).length > 0) {
          const normalized = normalizeData(response.autofillData);
          hasBrowserData = Object.keys(normalized).length > 0;
          userData = { ...userData, ...normalized };
        }
        updateDataSourcesIndicator();
      });
    }, 500);
    
    updateDataSourcesIndicator();
  });
});

function updateDataSourcesIndicator() {
  const sources = [];
  if (hasManualData) sources.push('Manual');
  if (hasOCRData) sources.push('CV OCR');
  if (hasBrowserData) sources.push('Browser');
  
  const indicator = document.getElementById('dataSources');
  if (sources.length > 0) {
    indicator.textContent = `✅ Ready: ${sources.join(' + ')}`;
    indicator.style.background = '#d4edda';
    indicator.style.color = '#155724';
  } else {
    indicator.textContent = '❌ No data loaded. Upload CV or enter manually.';
    indicator.style.background = '#f8d7da';
    indicator.style.color = '#721c24';
  }
}

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
  hasManualData = true;
  chrome.storage.local.set({ cvDataExtracted: manualData });
  chrome.storage.sync.set({ manualData: manualData });
  displayExtractedData(manualData);
  updateDataSourcesIndicator();
  
  showStatus(`✅ Saved ${Object.keys(manualData).length} fields. Click '🚀 Smart Fill' to use!`, 'success');
  
  // Hide form
  document.getElementById('manualForm').style.display = 'none';
  document.getElementById('toggleManual').textContent = '✏️ Enter Data Manually';
  document.getElementById('toggleManual').className = 'warning';
});

function populateManualForm(data) {
  if (data.firstName) document.getElementById('manualFirstName').value = data.firstName;
  if (data.lastName) document.getElementById('manualLastName').value = data.lastName;
  if (data.email) document.getElementById('manualEmail').value = data.email;
  if (data.phone) document.getElementById('manualPhone').value = data.phone;
  if (data.linkedin) document.getElementById('manualLinkedin').value = data.linkedin;
  if (data.portfolio) document.getElementById('manualPortfolio').value = data.portfolio;
  if (data.summary) document.getElementById('manualSummary').value = data.summary;
}

// Extract CV data with OCR (Handles images + PDFs)
document.getElementById('extractCVData').addEventListener('click', async () => {
  if (typeof Tesseract === 'undefined') {
    showStatus('❌ tesseract.min.js missing! Download it.', 'warning');
    console.error('ERROR: tesseract.min.js not found. Download from https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js ');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName'], async (result) => {
    if (!result.cvFile) {
      showStatus('❌ No CV uploaded', 'warning');
      return;
    }
    
    showStatus(`🔍 OCR: Reading ${result.cvFileName}...`, 'info');
    document.getElementById('ocrStatus').textContent = 'Processing... (15-30 sec)';
    
    try {
      const uint8Array = new Uint8Array(result.cvFile);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      
      const worker = await Tesseract.createWorker('eng');
      worker.setParameters({
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.@+-_/',
        preserve_interword_spaces: '1'
      });
      
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      
      document.getElementById('ocrStatus').textContent = 'Extraction complete!';
      
      const extracted = parseCVText(text);
      const normalized = normalizeData(extracted);
      userData = { ...userData, ...normalized };
      hasOCRData = true;
      chrome.storage.local.set({ cvDataExtracted: normalized });
      displayExtractedData(normalized);
      populateManualForm(normalized);
      updateDataSourcesIndicator();
      
      showStatus(`✅ OCR: ${Object.keys(normalized).length} fields ready`, 'success');
      
    } catch (error) {
      showStatus(`❌ OCR failed: ${error.message}`, 'warning');
      document.getElementById('ocrStatus').textContent = 'Failed. Use manual entry.';
    }
  });
});

function parseCVText(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  
  // Name (first 10 lines)
  for (const line of lines.slice(0, 10)) {
    const match = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
    if (match && !line.includes('@') && !line.includes('http')) {
      data.firstName = match[1];
      data.lastName = match[2];
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
  const skillsMatch = text.match(/skills?:?(.+?)(experience|education|project|$)/is);
  if (skillsMatch) {
    data.skills = skillsMatch[1].trim().split('\n').slice(0, 5).join(', ');
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
  title.innerHTML = '<strong>📊 Data Ready:</strong>';
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
      const normalized = normalizeData(response.autofillData);
      const count = Object.keys(normalized).length;
      if (count > 0) {
        userData = { ...userData, ...normalized };
        hasBrowserData = true;
        updateDataSourcesIndicator();
        showStatus(`📥 Extracted ${count} browser fields`, 'success');
      } else {
        showStatus('ℹ️ No browser data found', 'info');
      }
    }
  });
});

// CV file handler
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
      document.getElementById('cvStatus').textContent = `✅ ${file.name}`;
      document.getElementById('cvStatus').style.color = '#34A853';
    });
  };
  
  reader.onerror = () => showStatus('❌ Failed to read file', 'warning');
  reader.readAsArrayBuffer(file);
});

// Smart fill ALL (now with field alias support!)
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if ANY data exists
  const hasData = hasManualData || hasOCRData || hasBrowserData || 
                  (userData.firstName && userData.email);
  
  if (!hasData) {
    showStatus('⚠️ No data! Upload CV, extract data, or enter manually', 'warning');
    return;
  }
  
  showStatus('🚀 Filling ALL fields + uploading CV...', 'info');
  
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    const fill = () => chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      fieldMappings: fieldAliases, // Send mappings to content script
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    });
    
    fill();
    setTimeout(fill, 1000); // Retry for dynamic forms
  });
});

// Verify fill
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
  showStatus('👆 Clicking Submit/Apply/Next...', 'info');
});

// Save ALL data to sync storage
document.getElementById('saveData').addEventListener('click', () => {
  if (!userData.email && !userData.firstName) {
    showStatus('❌ No data to save', 'warning');
    return;
  }
  
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus('💾 All data saved permanently', 'success');
  });
});

// Reset
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('🚨 Delete ALL stored data?')) {
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