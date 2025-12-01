// Default user data
const userData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  linkedin: "linkedin.com/in/johndoe",
  portfolio: "github.com/johndoe",
  address: "123 Main St, City, Country",
  summary: "Experienced software developer with 5+ years...",
  degree: "Bachelor of Science",
  university: "Tech University",
  graduationYear: "2020",
  company: "ABC Corp",
  position: "Senior Developer",
  workStartDate: "2020-01",
  workEndDate: "2023-12",
  skills: "JavaScript, Python, React, Node.js"
};

// Load CV status on popup open
chrome.storage.local.get(['cvFile', 'cvFileName'], (result) => {
  const cvStatus = document.getElementById('cvStatus');
  if (result.cvFile && result.cvFileName) {
    cvStatus.textContent = `✅ CV Ready: ${result.cvFileName}`;
    cvStatus.style.color = '#34A853';
  } else {
    cvStatus.textContent = '❌ No CV stored';
    cvStatus.style.color = '#ea4335';
  }
});

// Handle CV file selection
document.getElementById('cvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  showStatus(`Reading ${file.name}...`, 'info');
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const arrayBuffer = event.target.result;
    
    // Store CV in Chrome storage
    chrome.storage.local.set({
      cvFile: arrayBuffer,
      cvFileName: file.name,
      cvFileType: file.type
    }, () => {
      showStatus(`✅ CV "${file.name}" stored!`, 'success');
      document.getElementById('cvStatus').textContent = `✅ CV Ready: ${file.name}`;
      document.getElementById('cvStatus').style.color = '#34A853';
    });
  };
  
  reader.readAsArrayBuffer(file);
});

// Fill forms only
document.getElementById('fillForm').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "fillForm", data: userData });
  showStatus("📝 Filling forms...", 'info');
});

// Fill forms + Auto-upload CV
document.getElementById('fillAndUploadCV').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Retrieve stored CV
  chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'], (result) => {
    if (!result.cvFile) {
      showStatus("❌ No CV stored! Select one first.", 'warning');
      return;
    }
    
    showStatus(`🚀 Filling + uploading ${result.cvFileName}...`, 'info');
    
    // Send message with CV data
    chrome.tabs.sendMessage(tab.id, {
      action: "fillAndUploadCV",
      data: userData,
      cvData: result.cvFile,
      cvFileName: result.cvFileName,
      cvFileType: result.cvFileType
    });
  });
});

// Save data to storage
document.getElementById('saveData').addEventListener('click', () => {
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus("💾 Profile data saved!", 'success');
  });
});

// Clear stored CV
document.getElementById('clearCV').addEventListener('click', () => {
  chrome.storage.local.remove(['cvFile', 'cvFileName', 'cvFileType'], () => {
    showStatus("🗑️ CV cleared from storage", 'info');
    document.getElementById('cvStatus').textContent = '❌ No CV stored';
    document.getElementById('cvStatus').style.color = '#ea4335';
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 4000);
}