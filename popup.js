// Initialize data
let userData = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", country: "", zip: "",
  linkedin: "", portfolio: "", summary: "",
  degree: "", university: "", graduationYear: "",
  company: "", position: "", workStartDate: "", workEndDate: "",
  experience: "", skills: "", salary: ""
};

// Load saved data on startup
chrome.storage.sync.get(['userData'], (result) => {
  if (result.userData) {
    userData = { ...userData, ...result.userData };
    showStatus('✅ Profile loaded from storage', 'success');
  }
});

// Load CV status
chrome.storage.local.get(['cvFileName'], (result) => {
  const cvStatus = document.getElementById('cvStatus');
  if (result.cvFileName) {
    cvStatus.textContent = `✅ CV Ready: ${result.cvFileName}`;
    cvStatus.style.color = '#34A853';
  } else {
    cvStatus.textContent = '❌ No CV stored';
    cvStatus.style.color = '#EA4335';
  }
});

// Extract Google Autofill data
document.getElementById('extractAutofill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "extractAutofill" }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Error: Refresh page and try again', 'warning');
      return;
    }
    
    if (response && response.autofillData) {
      userData = { ...userData, ...response.autofillData };
      showStatus(`📥 Extracted ${Object.keys(response.autofillData).length} fields!`, 'success');
      
      const autofillStatus = document.getElementById('autofillStatus');
      autofillStatus.textContent = `✅ Captured: ${Object.keys(response.autofillData).join(', ')}`;
      autofillStatus.style.color = '#34A853';
    }
  });
});

// CV file handling
document.getElementById('cvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  showStatus(`Reading ${file.name}...`, 'info');
  
  const reader = new FileReader();
  reader.onload = (event) => {
    chrome.storage.local.set({
      cvFile: Array.from(new Uint8Array(event.target.result)),
      cvFileName: file.name,
      cvFileType: file.type,
      cvFileSize: file.size
    }, () => {
      showStatus(`✅ CV "${file.name}" stored!`, 'success');
      document.getElementById('cvStatus').textContent = `✅ CV Ready: ${file.name}`;
      document.getElementById('cvStatus').style.color = '#34A853';
    });
  };
  
  reader.onerror = () => {
    showStatus('❌ Error reading file', 'warning');
  };
  
  reader.readAsArrayBuffer(file);
});

// Smart Fill Everything
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    showStatus('🚀 Starting smart fill...', 'info');
    
    chrome.tabs.sendMessage(tab.id, {
      action: "smartFill",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: Refresh page', 'warning');
      } else {
        showStatus('✅ Smart fill complete!', 'success');
      }
    });
  });
});

// Fill Forms Only
document.getElementById('fillForm').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, {
    action: "fillForm",
    data: userData
  }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Error: Refresh page', 'warning');
    } else {
      showStatus('📝 Forms filled!', 'success');
    }
  });
});

// Fill + Upload CV Only
document.getElementById('fillAndUploadCV').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    if (!result.cvFile) {
      showStatus('❌ No CV stored! Select one first.', 'warning');
      return;
    }
    
    showStatus('📄 Filling + uploading CV...', 'info');
    
    chrome.tabs.sendMessage(tab.id, {
      action: "fillAndUploadCV",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: Refresh page', 'warning');
      } else {
        showStatus('✅ Forms filled & CV uploaded!', 'success');
      }
    });
  });
});

// Click Buttons Only
document.getElementById('clickButtons').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "clickButtons" }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Error: Refresh page', 'warning');
    } else {
      showStatus('👆 Buttons clicked!', 'success');
    }
  });
});

// Save Data
document.getElementById('saveData').addEventListener('click', () => {
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus('💾 Profile saved successfully!', 'success');
  });
});

// Clear CV
document.getElementById('clearCV').addEventListener('click', () => {
  chrome.storage.local.remove(['cvFile', 'cvFileName', 'cvFileType', 'cvFileSize'], () => {
    showStatus('🗑️ CV cleared from storage', 'info');
    document.getElementById('cvStatus').textContent = '❌ No CV stored';
    document.getElementById('cvStatus').style.color = '#EA4335';
  });
});

// Clear All Data
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('🚨 Are you sure you want to delete ALL stored data?')) {
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    showStatus('🔄 All data has been reset!', 'info');
    setTimeout(() => {
      chrome.runtime.reload();
      window.close();
    }, 1000);
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
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 4000);
}