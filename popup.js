// popup.js - Fixed Minimal Version

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

// Field aliases - MUST match background.js
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

// Load data on startup
chrome.storage.sync.get(['userData'], (result) => {
  if (result.userData) {
    userData = { ...userData, ...result.userData };
    hasManualData = true;
  }
  updateDataSourcesIndicator();
});

// Smart Fill Button - FIXED
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!userData.email && !userData.firstName) {
    showStatus('⚠️ No data! Add info first', 'warning');
    return;
  }
  
  showStatus('🚀 Filling forms... check console', 'info');
  
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
    
    showStatus('✅ Forms filled! Check console logs', 'success');
    
  } catch (error) {
    console.error('Fill error:', error);
    showStatus(`❌ Error: ${error.message}`, 'warning');
  }
});

// Verify Button
document.getElementById('verifyFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { action: "verifyFill" });
  
  if (response) {
    const percent = Math.round((response.filled / response.total) * 100);
    showStatus(`📊 ${percent}% Complete`, percent === 100 ? 'success' : 'warning');
  }
});

// Status helper
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.background = type === 'success' ? '#d4edda' : 
                           type === 'warning' ? '#fff3cd' : '#d1ecf1';
  status.style.color = type === 'success' ? '#155724' : 
                       type === 'warning' ? '#856404' : '#0c5460';
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 4000);
}

function updateDataSourcesIndicator() {
  const sources = [];
  if (hasManualData) sources.push('Manual');
  if (hasOCRData) sources.push('CV OCR');
  if (hasBrowserData) sources.push('Browser');
  
  const indicator = document.getElementById('dataSources');
  indicator.textContent = sources.length ? `✅ Ready: ${sources.join(' + ')}` : '❌ No data loaded';
  indicator.style.background = sources.length ? '#d4edda' : '#f8d7da';
  indicator.style.color = sources.length ? '#155724' : '#721c24';
}