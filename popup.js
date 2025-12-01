// popup.js - Complete Logic

// Field mappings (must match content.js)
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

// User data store
let userData = {};
let hasManualData = false;
let hasOCRData = false;
let hasBrowserData = false;

// Load data on startup
chrome.storage.sync.get(['userData'], (result) => {
  if (result.userData && Object.keys(result.userData).length > 0) {
    userData = result.userData;
    hasManualData = true;
  } else {
    // Default sample data for first-time users
    userData = {
      firstName: "John", lastName: "Doe", email: "john.doe@example.com", phone: "+1234567890",
      address: "123 Main St", city: "New York", country: "United States", zip: "10001",
      linkedin: "linkedin.com/in/johndoe", portfolio: "github.com/johndoe", summary: "Experienced software engineer",
      degree: "Bachelor of Science", university: "State University", graduationYear: "2020",
      company: "Tech Corp", position: "Senior Developer", workStartDate: "2020-01-01", workEndDate: "2023-12-31",
      experience: "5", skills: "JavaScript, Python, React", salary: "120000", birthDate: "1990-01-01"
    };
  }
  updateDataSourcesIndicator();
});

// Update status indicator
function updateDataSourcesIndicator() {
  const sources = [];
  if (hasManualData) sources.push('Manual Data');
  if (hasOCRData) sources.push('CV OCR');
  if (hasBrowserData) sources.push('Browser');
  
  const indicator = document.getElementById('dataSources');
  if (sources.length > 0) {
    indicator.textContent = `✅ Ready: ${sources.join(' + ')}`;
    indicator.className = 'data-sources ready';
  } else {
    indicator.textContent = '❌ No data loaded. Upload CV or enter manually.';
    indicator.className = 'data-sources empty';
  }
}

// CV File Upload Handler
document.getElementById('cvFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const fileData = Array.from(new Uint8Array(event.target.result));
    
    chrome.storage.local.set({
      cvFile: fileData,
      cvFileName: file.name,
      cvFileType: file.type
    }, () => {
      document.getElementById('cvStatus').textContent = `✅ ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
      showStatus(`📎 CV stored successfully!`, 'success');
    });
  };
  
  reader.readAsArrayBuffer(file);
});

// Extract CV Data (OCR)
document.getElementById('extractCVData').addEventListener('click', async () => {
  if (typeof Tesseract === 'undefined') {
    showStatus('❌ Tesseract.js not found. Please download it.', 'error');
    return;
  }
  
  const result = await chrome.storage.local.get(['cvFile', 'cvFileName']);
  if (!result.cvFile) {
    showStatus('❌ No CV uploaded. Please upload a CV first.', 'warning');
    return;
  }
  
  showStatus('🔍 Extracting data from CV (15-30 seconds)...', 'info');
  
  try {
    const uint8Array = new Uint8Array(result.cvFile);
    const blob = new Blob([uint8Array], { type: 'application/pdf' });
    
    const worker = await Tesseract.createWorker('eng');
    const { data: { text } } = await worker.recognize(blob);
    await worker.terminate();
    
    const extracted = parseCVText(text);
    
    // Merge with existing data
    userData = { ...userData, ...extracted };
    hasOCRData = true;
    
    chrome.storage.local.set({ cvDataExtracted: extracted });
    chrome.storage.sync.set({ userData: userData });
    
    displayExtractedData(extracted);
    updateDataSourcesIndicator();
    showStatus(`✅ Extracted ${Object.keys(extracted).length} fields from CV!`, 'success');
    
  } catch (error) {
    showStatus(`❌ OCR failed: ${error.message}`, 'error');
  }
});

// Toggle manual form
document.getElementById('toggleManual').addEventListener('click', () => {
  const form = document.getElementById('manualForm');
  const toggle = document.getElementById('toggleManual');
  const isVisible = form.style.display === 'block';
  
  form.style.display = isVisible ? 'none' : 'block';
  toggle.textContent = isVisible ? '✏️ Enter Data Manually' : '🔼 Hide Manual Form';
  toggle.className = isVisible ? 'secondary' : 'danger';
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
    showStatus('❌ Please enter at least one field', 'warning');
    return;
  }
  
  userData = { ...userData, ...manualData };
  hasManualData = true;
  
  chrome.storage.sync.set({ userData: userData });
  
  document.getElementById('manualForm').style.display = 'none';
  document.getElementById('toggleManual').textContent = '✏️ Enter Data Manually';
  document.getElementById('toggleManual').className = 'secondary';
  
  updateDataSourcesIndicator();
  showStatus(`✅ Saved ${Object.keys(manualData).length} fields!`, 'success');
});

// Extract browser autofill
document.getElementById('extractAutofill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showStatus('📥 Extracting browser autofill data...', 'info');
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" });
    
    if (response?.autofillData && Object.keys(response.autofillData).length > 0) {
      userData = { ...userData, ...response.autofillData };
      hasBrowserData = true;
      updateDataSourcesIndicator();
      showStatus(`✅ Extracted ${Object.keys(response.autofillData).length} browser fields!`, 'success');
    } else {
      showStatus('ℹ️ No browser autofill data found', 'warning');
    }
  } catch (error) {
    showStatus('❌ Please refresh the page and try again', 'warning');
  }
});

// Smart Fill Everything
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  
  if (!userData.email && !userData.firstName) {
    showStatus('❌ No data available! Upload CV or enter data manually.', 'error');
    return;
  }
  
  status.textContent = '🚀 Filling all form controls... Check console for details';
  status.className = 'status warning';
  status.style.display = 'block';
  
  try {
    const result = await chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType']);
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      fieldMappings: fieldAliases,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    });
    
    if (response?.error) throw new Error(response.error);
    
    status.textContent = '✅ SUCCESS! All text fields, dropdowns, checkboxes & radios filled!';
    status.className = 'status success';
    
    // Show verification after 2 seconds
    setTimeout(async () => {
      const verify = await chrome.tabs.sendMessage(tab.id, { action: "verifyFill" });
      if (verify) {
        const percent = Math.round((verify.filled / verify.total) * 100);
        status.textContent = `🎯 Complete! ${percent}% of fields filled (${verify.filled}/${verify.total})`;
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Fill error:', error);
    status.textContent = `❌ Failed: ${error.message}. See console (F12) for details.`;
    status.className = 'status error';
  }
  
  setTimeout(() => status.style.display = 'none', 5000);
});

// Verify fill
document.getElementById('verifyFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { action: "verifyFill" });
  
  if (response) {
    const percent = Math.round((response.filled / response.total) * 100);
    showStatus(`📊 ${percent}% Complete (${response.filled}/${response.total} fields)`, 
               percent === 100 ? 'success' : 'warning');
  }
});

// Save all data
document.getElementById('saveData').addEventListener('click', () => {
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus('💾 All data saved permanently to Chrome sync!', 'success');
  });
});

// Reset everything
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('🚨 Are you sure? This will delete ALL stored data.')) {
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    showStatus('🔄 Reset complete! Reloading...', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }
});

// Utility functions
function parseCVText(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  
  // Name detection
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
  
  // Skills
  const skillsMatch = text.match(/skills?:?(.+?)(experience|education|project|$)/is);
  if (skillsMatch) {
    data.skills = skillsMatch[1].trim().split('\n').slice(0, 5).join(', ');
  }
  
  return data;
}

function displayExtractedData(data) {
  const container = document.getElementById('extractedData');
  container.innerHTML = '';
  container.style.display = 'block';
  
  const title = document.createElement('div');
  title.innerHTML = '<strong>📊 Extracted Data:</strong>';
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

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 5000);
}