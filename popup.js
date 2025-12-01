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

// Extract CV data using OCR
document.getElementById('extractCVData').addEventListener('click', async () => {
  if (typeof Tesseract === 'undefined') {
    showStatus('❌ tesseract.min.js not found! Download it first.', 'warning');
    console.error('ERROR: tesseract.min.js is missing!');
    console.log('SOLUTION: Download from https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    console.log('         and save it in your extension folder.');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName'], async (result) => {
    if (!result.cvFile) {
      showStatus('❌ No CV uploaded! Select one first', 'warning');
      return;
    }
    
    showStatus(`🔍 Reading ${result.cvFileName}...`, 'info');
    
    try {
      // Convert stored data to blob
      const uint8Array = new Uint8Array(result.cvFile);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      
      // Create worker and run OCR
      const worker = await Tesseract.createWorker('eng');
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      
      // Parse extracted text
      const extracted = parseCVText(text);
      
      // Store and update
      userData = { ...userData, ...extracted };
      chrome.storage.local.set({ cvDataExtracted: extracted });
      displayExtractedData(extracted);
      
      showStatus(`✅ Extracted ${Object.keys(extracted).length} fields`, 'success');
      
    } catch (error) {
      showStatus('❌ OCR failed: ' + error.message, 'warning');
      console.error('OCR Error:', error);
    }
  });
});

// Parse CV text to extract structured data
function parseCVText(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  const fullText = text.toLowerCase();
  
  // Extract name (look in first 10 lines)
  const namePatterns = [
    /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,
    /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/
  ];
  
  for (const line of lines.slice(0, 10)) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match && !line.includes('@') && !line.includes('http')) {
        data.firstName = match[1];
        data.lastName = match[match.length - 1];
        break;
      }
    }
    if (data.firstName) break;
  }
  
  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) data.email = emailMatch[0];
  
  // Extract phone
  const phoneMatch = text.match(/(\+?1\s*[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
  if (phoneMatch) data.phone = phoneMatch[0];
  
  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
  if (linkedinMatch) data.linkedin = linkedinMatch[0];
  
  // Extract GitHub
  const githubMatch = text.match(/github\.com\/[a-zA-Z0-9-]+/);
  if (githubMatch) data.portfolio = githubMatch[0];
  
  // Extract address (simple pattern)
  const addressMatch = text.match(/\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/);
  if (addressMatch) data.address = addressMatch[0];
  
  // Extract degree
  const degreeKeywords = ['Bachelor', 'Master', 'PhD', 'BS', 'MS', 'BA', 'MA', 'B.Sc', 'M.Sc'];
  for (const line of lines) {
    for (const degree of degreeKeywords) {
      if (line.includes(degree)) {
        data.degree = line;
        break;
      }
    }
    if (data.degree) break;
  }
  
  // Extract skills
  const skillsSection = text.match(/skills?:?(.+?)(?=experience|education|project|$)/is);
  if (skillsSection) {
    data.skills = skillsSection[1].trim().split('\n').slice(0, 5).join(', ');
  }
  
  // Extract experience years
  const expMatch = text.match(/(\d+)\s*(years?|yrs?)\s*(experience|exp)/i);
  if (expMatch) data.experience = expMatch[1];
  
  console.log('🔍 OCR parsed CV data:', data);
  return data;
}

// Display extracted data
function displayExtractedData(data) {
  const container = document.getElementById('extractedData');
  container.innerHTML = '';
  container.style.display = 'block';
  
  const title = document.createElement('div');
  title.innerHTML = '<strong>📊 CV Data Extracted:</strong>';
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

// Browser autofill extraction
document.getElementById('extractAutofill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Refresh page', 'warning');
      return;
    }
    
    if (response?.autofillData) {
      userData = { ...userData, ...response.autofillData };
      const count = Object.keys(response.autofillData).length;
      showStatus(`📥 Extracted ${count} fields`, count > 0 ? 'success' : 'warning');
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
      showStatus(`✅ CV stored`, 'success');
      const cvStatus = document.getElementById('cvStatus');
      cvStatus.textContent = `✅ ${file.name}`;
      cvStatus.style.color = '#34A853';
    });
  };
  
  reader.readAsArrayBuffer(file);
});

// Smart fill all
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    if (!userData.email && !userData.firstName) {
      showStatus('⚠️ No data! Extract CV or autofill first', 'warning');
      return;
    }
    
    showStatus('🚀 Filling ALL fields + uploading CV...', 'info');
    
    chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    }, (response) => {
      if (!chrome.runtime.lastError) {
        showStatus('✅ Complete! Verify with ✅ button', 'success');
      }
    });
  });
});

// Verify fill
document.getElementById('verifyFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "verifyFill" }, (response) => {
    if (response) {
      const filled = response.filled || 0;
      const total = response.total || 1;
      const percent = Math.round((filled / total) * 100);
      
      if (percent === 100) {
        showStatus(`✅ 100% Complete (${filled}/${total} fields)`, 'success');
      } else {
        showStatus(`⚠️ ${percent}% Complete (${filled}/${total}) - Retry if needed`, 'warning');
      }
    }
  });
});

// Click buttons
document.getElementById('clickButtons').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "clickButtons" });
  showStatus('👆 Clicking buttons...', 'info');
});

// Save data
document.getElementById('saveData').addEventListener('click', () => {
  if (!userData.email && !userData.firstName) {
    showStatus('❌ No data to save', 'warning');
    return;
  }
  
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus('💾 Data saved permanently', 'success');
  });
});

// Reset all
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('🚨 Delete ALL data (CV, OCR, browser data)?')) {
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    showStatus('🔄 Reset complete', 'info');
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
  
  setTimeout(() => status.style.display = 'none', 4500);
}