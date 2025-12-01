// Load saved user data
const userData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  linkedin: "linkedin.com/in/johndoe",
  portfolio: "github.com/johndoe",
  address: "123 Main St, City, Country",
  summary: "Experienced software developer with 5+ years...",
  // EDUCATION
  degree: "Bachelor of Science",
  university: "Tech University",
  graduationYear: "2020",
  // WORK EXPERIENCE
  company: "ABC Corp",
  position: "Senior Developer",
  workStartDate: "2020-01",
  workEndDate: "2023-12",
  // SKILLS
  skills: "JavaScript, Python, React, Node.js",
  // FILE PATH FOR CV (stored in Chrome storage)
  cvFilePath: null
};

document.getElementById('fillForm').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "fillForm", data: userData });
  showStatus("✅ Form filling initiated!", "success");
});

document.getElementById('fillAndUploadCV').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "fillAndUploadCV", data: userData });
  showStatus("✅ Form filling + CV upload initiated!", "success");
});

document.getElementById('saveData').addEventListener('click', () => {
  chrome.storage.sync.set({ userData: userData }, () => {
    showStatus("💾 Data saved to storage!", "success");
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 3000);
}