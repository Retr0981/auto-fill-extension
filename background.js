// background.js - Fixed Communication & Field Mappings

// Field aliases - CRITICAL: Must match popup.js exactly
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

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 AutoFill Pro v4.2 with CV Upload Agent installed');
  
  // Initialize storage
  chrome.storage.sync.get(['userData'], (result) => {
    if (!result.userData) {
      chrome.storage.sync.set({
        userData: {
          firstName: '', lastName: '', email: '', phone: '',
          address: '', city: '', country: '', zip: '',
          linkedin: '', portfolio: '', summary: '',
          degree: '', university: '', graduationYear: '',
          company: '', position: '', workStartDate: '', workEndDate: '',
          experience: '', skills: '', salary: '', birthDate: ''
        }
      });
    }
  });
});

// Keyboard shortcuts with injection fallback
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`⌨️ Command: ${command}`);
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.url.startsWith('chrome://')) return;
  
  try {
    // Ensure content script is loaded
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.autofillProLoaded = true
    });
    
    if (command === 'smart-fill') {
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(['userData']),
        chrome.storage.local.get(['cvFile', 'cvFileName', 'cvFileType'])
      ]);
      
      const data = syncResult.userData || {};
      
      if (!data.email && !data.firstName) {
        console.warn('⚠️ No user data available');
        return;
      }
      
      // Send message WITH field mappings
      await chrome.tabs.sendMessage(tab.id, {
        action: "smartFill",
        data: data,
        fieldMappings: fieldAliases,
        cvData: localResult.cvFile,
        cvFileName: localResult.cvFileName,
        cvFileType: localResult.cvFileType
      });
      
      console.log('✅ Smart fill command sent');
    }
    
  } catch (error) {
    console.error('❌ Command failed, injecting script...', error);
    
    // Inject content script if not present
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // Retry after injection
    setTimeout(() => {
      chrome.commands.onCommand.dispatch(command);
    }, 500);
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Service worker started');
});

// Message router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "log") {
    console.log(`[Content] ${request.message}`, request.data || '');
  } else if (request.action === "error") {
    console.error(`[Content] ${request.message}`, request.data || '');
  } else if (request.action === "getFieldMappings") {
    sendResponse({ fieldMappings: fieldAliases });
  }
  return true;
});