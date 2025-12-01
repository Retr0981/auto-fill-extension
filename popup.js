// popup.js - Simple trigger

// Field mappings
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

// Sample data - REPLACE with your real data
const userData = {
  firstName: "John", lastName: "Doe", email: "john.doe@example.com", phone: "+1234567890",
  address: "123 Main Street", city: "New York", country: "United States", zip: "10001",
  linkedin: "linkedin.com/in/johndoe", portfolio: "github.com/johndoe", summary: "Senior Software Engineer",
  degree: "Bachelor of Science", university: "State University", graduationYear: "2020",
  company: "Tech Corp", position: "Senior Developer", workStartDate: "2020-01-01", workEndDate: "2023-12-31",
  experience: "5", skills: "JavaScript, Python, React, Node.js", salary: "120000", birthDate: "1990-01-01"
};

// FILL EVERYTHING button
document.getElementById('smartFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  
  status.textContent = '🚀 Filling forms... check console (F12)';
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
    
    status.textContent = '✅ SUCCESS! All form controls filled. See console for details.';
    status.style.background = '#C8E6C9';
    status.style.color = '#2E7D32';
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
    status.textContent = `❌ FAILED: ${error.message}. Open console (F12) to debug.`;
    status.style.background = '#FFCDD2';
    status.style.color = '#C62828';
  }
  
  setTimeout(() => status.style.display = 'none', 5000);
});

// Verify button
document.getElementById('verifyFill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { action: "verifyFill" });
  
  if (response) {
    const percent = Math.round((response.filled / response.total) * 100);
    alert(`📊 Verification: ${response.filled}/${response.total} fields filled (${percent}%)`);
  }
});