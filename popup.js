let userData = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", country: "", zip: "",
  linkedin: "", portfolio: "", summary: "",
  degree: "", university: "", graduationYear: "",
  company: "", position: "", workStartDate: "", workEndDate: "",
  experience: "", skills: "", salary: "", birthDate: ""
};

// Load all stored data
chrome.storage.sync.get(['userData'], (result) => {
  if (result.userData) {
    userData = { ...userData, ...result.userData };
  }
});

// Load CV status
chrome.storage.local.get(['cvFileName'], (result) => {
  const cvStatus = document.getElementById('cvStatus');
  cvStatus.textContent = result.cvFileName ? `✅ ${result.cvFileName}` : '❌ No CV stored';
  cvStatus.style.color = result.cvFileName ? '#34A853' : '#EA4335';
});

// Extract autofill with validation
document.getElementById('extractAutofill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Refresh page', 'warning');
      return;
    }
    
    if (response?.autofillData) {
      userData = { ...userData, ...response.autofillData };
      const fieldCount = Object.keys(response.autofillData).length;
      showStatus(`📥 Extracted ${fieldCount} fields`, fieldCount > 0 ? 'success' : 'warning');
    }
  });
});

// CV upload handler
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
      document.getElementById('cvStatus').textContent = `✅ ${file.name}`;
      document.getElementById('cvStatus').style.color = '#34A853';
    });
  };
  
  reader.readAsArrayBuffer(file);
});

// Smart fill with verification
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    showStatus('🚀 Filling all fields...', 'info');
    
    if (!userData.email) {
      showStatus('⚠️ No data! Extract autofill first', 'warning');
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error', 'warning');
      } else {
        showStatus('✅ All fields filled', 'success');
      }
    });
  });
});

// Verify all fields are filled
document.getElementById('verifyFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "verifyFill" }, (response) => {
    if (response) {
      const filled = response.filled;
      const total = response.total;
      const percentage = Math.round((filled / total) * 100);
      
      if (percentage === 100) {
        showStatus(`✅ 100% Complete (${filled}/${total} fields)`, 'success');
      } else {
        showStatus(`⚠️ ${percentage}% Complete (${filled}/${total} fields)`, 'warning');
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
  if (!userData.email) {
    showStatus('❌ No data to save', 'warning');
    return;
  }
  
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus('💾 Data saved', 'success');
  });
});

// Reset all
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('🚨 Delete ALL data?')) {
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    showStatus('🔄 Reset complete', 'info');
    setTimeout(() => window.close(), 1000);
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  
  const colors = {
    success: { bg: '#d4edda', text: '#155724' },
    info: { bg: '#d1ecf1', text: '#0c5460' },
    warning: { bg: '#fff3cd', text: '#856404' }
  };
  
  const color = colors[type] || colors.info;
  status.style.background = color.bg;
  status.style.color = color.text;
  
  setTimeout(() => status.style.display = 'none', 4000);
}