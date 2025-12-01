// Field alias mappings - defines all known variations for each field
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
  if (!name) return '';
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

// Check if a field matches any alias for a standard key
function matchesFieldAlias(fieldName, standardKey) {
  if (!fieldName || !standardKey) return false;
  const aliases = fieldAliases[standardKey] || [standardKey];
  const fieldNameClean = fieldName.toLowerCase().replace(/[\s_-]/g, '');
  return aliases.some(alias => alias.toLowerCase().replace(/[\s_-]/g, '') === fieldNameClean);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractAutofill") {
    sendResponse({ autofillData: extractAllData() });
  } else if (request.action === "smartFill") {
    // Use provided fieldMappings or fall back to local fieldAliases
    const mappings = request.fieldMappings || fieldAliases;
    fillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType, mappings);
    sendResponse({ success: true });
  } else if (request.action === "clickButtons") {
    clickAllButtons();
    sendResponse({ success: true });
  } else if (request.action === "verifyFill") {
    sendResponse(verifyAllFields());
  }
});

function extractAllData() {
  const data = {};
  const fields = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], input[type="url"], 
    input[type="number"], input[type="date"], textarea, select
  `);
  
  fields.forEach(field => {
    const value = field.value?.trim();
    if (!value) return;
    
    const name = field.name || '';
    const id = field.id || '';
    const label = getLabel(field);
    
    // Check all possible field mappings
    for (const [standardKey, aliases] of Object.entries(fieldAliases)) {
      // Check name attribute
      if (aliases.some(alias => name.toLowerCase() === alias.toLowerCase())) {
        data[standardKey] = value;
        break;
      }
      // Check id attribute
      if (aliases.some(alias => id.toLowerCase() === alias.toLowerCase())) {
        data[standardKey] = value;
        break;
      }
      // Check label text
      if (aliases.some(alias => label.toLowerCase().includes(alias.toLowerCase()))) {
        data[standardKey] = value;
        break;
      }
    }
  });
  
  return normalizeData(data);
}

async function fillEverything(data, cvData, cvFileName, cvFileType, fieldMappings = fieldAliases) {
  console.log('🚀 Filling ALL form elements...');
  
  // Fill all field types
  fillTextFields(data, fieldMappings);
  fillDropdowns(data, fieldMappings);
  fillRadioButtons();
  fillCheckboxes();
  fillDateFields(data, fieldMappings);
  
  // Upload CV if available
  if (cvData && cvFileName) {
    const uploaded = await uploadCV(cvData, cvFileName, cvFileType);
    console.log(uploaded ? '✅ CV uploaded' : '⚠️ No CV field found');
  }
  
  console.log('✅ ALL elements processed');
}

function fillTextFields(data, fieldMappings = fieldAliases) {
  const fields = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], textarea
  `);
  
  fields.forEach(field => {
    const name = field.name?.toLowerCase() || '';
    const id = field.id?.toLowerCase() || '';
    const label = getLabel(field).toLowerCase();
    let value = '';
    
    // Map ALL possible fields from manual/OCR/browser data using alias matching
    for (const [standardKey, standardValue] of Object.entries(data)) {
      if (!standardValue) continue;
      
      const aliases = fieldMappings[standardKey] || [standardKey];
      
      // Check if field matches any alias (name, id, or label)
      const matchesName = aliases.some(alias => name.includes(alias.toLowerCase()));
      const matchesId = aliases.some(alias => id.includes(alias.toLowerCase()));
      const matchesLabel = aliases.some(alias => label.includes(alias.toLowerCase()));
      
      if (matchesName || matchesId || matchesLabel) {
        value = standardValue;
        break;
      }
    }
    
    if (value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.style.border = '2px solid #34A853';
    }
  });
}

function fillDropdowns(data, fieldMappings = fieldAliases) {
  document.querySelectorAll('select').forEach(select => {
    const name = select.name?.toLowerCase() || '';
    const id = select.id?.toLowerCase() || '';
    const label = getLabel(select).toLowerCase();
    const options = Array.from(select.options);
    
    let valueToSelect = '';
    
    // Check if we have specific data for this field
    for (const [standardKey, standardValue] of Object.entries(data)) {
      if (!standardValue) continue;
      
      const aliases = fieldMappings[standardKey] || [standardKey];
      const matchesName = aliases.some(alias => name.includes(alias.toLowerCase()));
      const matchesId = aliases.some(alias => id.includes(alias.toLowerCase()));
      const matchesLabel = aliases.some(alias => label.includes(alias.toLowerCase()));
      
      if (matchesName || matchesId || matchesLabel) {
        // Try to find matching option
        const matchingOption = options.find(opt => 
          opt.text.toLowerCase().includes(standardValue.toLowerCase()) ||
          opt.value.toLowerCase().includes(standardValue.toLowerCase())
        );
        if (matchingOption) {
          valueToSelect = matchingOption.value;
          break;
        }
      }
    }
    
    // Fallback to default logic if no specific match
    if (!valueToSelect) {
      if (name.includes('country')) {
        const option = options.find(opt => opt.text.includes('United States') || opt.value.includes('US'));
        if (option) valueToSelect = option.value;
      } else if (name.includes('year') || name.includes('experience')) {
        const option = options.find(opt => opt.text.includes('5') || opt.value.includes('5'));
        if (option) valueToSelect = option.value;
      } else if (options.length > 1) {
        const realOptions = options.filter(opt => !opt.text.toLowerCase().includes('select'));
        if (realOptions.length > 0) valueToSelect = realOptions[0].value;
      }
    }
    
    if (valueToSelect) {
      select.value = valueToSelect;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.style.border = '2px solid #34A853';
    }
  });
}

function fillRadioButtons() {
  const groups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.name) {
      if (!groups[radio.name]) groups[radio.name] = [];
      groups[radio.name].push(radio);
    }
  });
  
  Object.values(groups).forEach(group => {
    const priorityValues = ['yes', 'true', '1', 'male', 'full-time', 'remote'];
    let toCheck = group.find(r => 
      priorityValues.some(val => r.value.toLowerCase().includes(val))
    );
    if (!toCheck) toCheck = group[group.length - 1];
    
    if (toCheck) {
      toCheck.checked = true;
      toCheck.dispatchEvent(new Event('change', { bubbles: true }));
      toCheck.style.outline = '3px solid #34A853';
    }
  });
}

function fillCheckboxes() {
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    const name = checkbox.name?.toLowerCase() || '';
    const label = getLabel(checkbox).toLowerCase();
    
    const shouldCheck = 
      name.includes('term') || name.includes('agree') || name.includes('consent') || 
      name.includes('remote') || name.includes('eligibility') || name.includes('policy') ||
      label.includes('agree') || label.includes('terms');
    
    const shouldUncheck = 
      name.includes('newsletter') || name.includes('spam') || name.includes('marketing') || 
      name.includes('promo') || label.includes('newsletter');
    
    if (shouldCheck) {
      checkbox.checked = true;
      checkbox.style.outline = '3px solid #34A853';
    } else if (shouldUncheck) {
      checkbox.checked = false;
    }
    
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function fillDateFields(data, fieldMappings = fieldAliases) {
  document.querySelectorAll('input[type="date"]').forEach(input => {
    const name = input.name?.toLowerCase() || '';
    const id = input.id?.toLowerCase() || '';
    const label = getLabel(input).toLowerCase();
    
    let dateValue = '';
    
    // Check for specific date field matches
    for (const [standardKey, standardValue] of Object.entries(data)) {
      if (!standardValue) continue;
      
      const aliases = fieldMappings[standardKey] || [standardKey];
      const matchesName = aliases.some(alias => name.includes(alias.toLowerCase()));
      const matchesId = aliases.some(alias => id.includes(alias.toLowerCase()));
      const matchesLabel = aliases.some(alias => label.includes(alias.toLowerCase()));
      
      if (matchesName || matchesId || matchesLabel) {
        dateValue = standardValue;
        break;
      }
    }
    
    // Fallback to default logic
    if (!dateValue) {
      if (name.includes('birth')) dateValue = data.birthDate || '1990-01-01';
      else if (name.includes('start')) dateValue = data.workStartDate || '2020-01-01';
      else if (name.includes('end')) dateValue = data.workEndDate || '2023-12-31';
    }
    
    if (dateValue) {
      input.value = dateValue;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.style.border = '2px solid #34A853';
    }
  });
}

async function uploadCV(cvData, cvFileName, cvFileType) {
  return new Promise(resolve => {
    const uint8Array = new Uint8Array(cvData);
    const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
    const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
    
    const fileInputs = document.querySelectorAll('input[type="file"]');
    let uploaded = false;
    
    fileInputs.forEach(input => {
      const label = getLabel(input).toLowerCase();
      const name = input.name?.toLowerCase() || '';
      
      // Upload to CV/resume fields OR if only one file input exists
      const isCVField = label.includes('cv') || label.includes('resume') || name.includes('cv') || name.includes('resume');
      const shouldUpload = isCVField || fileInputs.length === 1;
      
      if (shouldUpload) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.style.border = '3px solid #34A853';
        input.style.background = '#d4edda';
        input.title = `✅ CV uploaded: ${cvFileName}`;
        uploaded = true;
      }
    });
    
    setTimeout(() => resolve(uploaded), 500);
  });
}

function clickAllButtons() {
  const actions = ['submit', 'apply', 'next', 'continue', 'save', 'send', 'confirm', 'proceed'];
  let count = 0;
  
  document.querySelectorAll('button, input[type="submit"], a').forEach(element => {
    const text = (element.textContent || element.value || '').toLowerCase().trim();
    if (actions.some(action => text.includes(action))) {
      element.click();
      element.style.border = '3px solid #4285F4';
      element.style.background = '#e8f0fe';
      count++;
    }
  });
  
  console.log(`👆 Clicked ${count} actionable elements`);
}

function verifyAllFields() {
  const allInputs = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], input[type="url"], 
    input[type="number"], input[type="date"], textarea, select, 
    input[type="radio"], input[type="checkbox"]
  `);
  
  let filled = 0, total = 0;
  
  allInputs.forEach(input => {
    if (input.offsetParent === null && input.type !== 'radio' && input.type !== 'checkbox') return;
    
    total++;
    
    let isFilled = false;
    if (input.type === 'radio' || input.type === 'checkbox') {
      isFilled = input.checked;
    } else {
      isFilled = input.value && input.value.trim() !== '';
    }
    
    if (isFilled) {
      filled++;
      input.style.border = '2px solid #34A853';
    } else {
      input.style.border = '2px solid #EA4335';
    }
  });
  
  console.log(`📊 Verification: ${filled}/${total} (${Math.round((filled/total)*100)}%)`);
  return { filled, total };
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent.trim() : '';
}