chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractAutofill") {
    sendResponse({ autofillData: extractAllData() });
  } else if (request.action === "smartFill") {
    fillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType);
  } else if (request.action === "clickButtons") {
    clickAllButtons();
  } else if (request.action === "verifyFill") {
    sendResponse(verifyAllFields());
  }
});

// Extract ALL data from page
function extractAllData() {
  const data = {};
  const allInputs = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], input[type="date"],
    textarea, select
  `);
  
  allInputs.forEach(field => {
    const value = field.value?.trim();
    if (!value) return;
    
    const name = field.name?.toLowerCase() || '';
    const label = getLabel(field).toLowerCase();
    
    // Comprehensive field mapping
    if (name.includes('first') && name.includes('name')) data.firstName = value;
    else if (name.includes('last') && name.includes('name')) data.lastName = value;
    else if (name.includes('email')) data.email = value;
    else if (name.includes('phone')) data.phone = value;
    else if (name.includes('address')) data.address = value;
    else if (name.includes('city')) data.city = value;
    else if (name.includes('country')) data.country = value;
    else if (name.includes('zip')) data.zip = value;
    else if (label.includes('linkedin') || name.includes('linkedin')) data.linkedin = value;
    else if (label.includes('github') || name.includes('github')) data.portfolio = value;
  });
  
  return data;
}

// Fill EVERYTHING with validation
async function fillEverything(data, cvData, cvFileName, cvFileType) {
  console.log('🚀 Filling ALL fields...');
  
  // 1. Fill text inputs
  fillTextFields(data);
  
  // 2. Fill dropdowns
  fillDropdowns(data);
  
  // 3. Handle radios
  fillRadioButtons();
  
  // 4. Handle checkboxes
  fillCheckboxes();
  
  // 5. Fill dates
  fillDateFields(data);
  
  // 6. Upload CV
  if (cvData && cvFileName) {
    await uploadCV(cvData, cvFileName, cvFileType);
  }
  
  console.log('✅ ALL fields processed');
}

function fillTextFields(data) {
  const fields = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], textarea
  `);
  
  fields.forEach(field => {
    const name = field.name?.toLowerCase() || '';
    const placeholder = field.placeholder?.toLowerCase() || '';
    const label = getLabel(field).toLowerCase();
    
    let value = '';
    
    // Priority mapping
    if (name.includes('first') && name.includes('name')) value = data.firstName;
    else if (name.includes('last') && name.includes('name')) value = data.lastName;
    else if (name.includes('email')) value = data.email;
    else if (name.includes('phone')) value = data.phone;
    else if (name.includes('address')) value = data.address;
    else if (name.includes('city')) value = data.city || 'New York';
    else if (name.includes('country')) value = data.country || 'United States';
    else if (name.includes('zip')) value = data.zip || '10001';
    else if (label.includes('linkedin') || name.includes('linkedin')) value = data.linkedin;
    else if (label.includes('github') || name.includes('github')) value = data.portfolio;
    else if (field.tagName === 'TEXTAREA') value = data.summary;
    else if (name.includes('degree')) value = data.degree;
    else if (name.includes('university')) value = data.university;
    else if (name.includes('graduation')) value = data.graduationYear;
    else if (name.includes('company')) value = data.company;
    else if (name.includes('position')) value = data.position;
    else if (name.includes('skill')) value = data.skills;
    else if (name.includes('salary')) value = data.salary || '90000';
    else if (name.includes('experience')) value = data.experience || '5';
    
    if (value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.style.border = '2px solid #34A853'; // Visual confirmation
    } else {
      field.style.border = '2px solid #f39c12'; // Mark empty fields
    }
  });
}

function fillDropdowns(data) {
  document.querySelectorAll('select').forEach(select => {
    const name = select.name?.toLowerCase() || '';
    const options = Array.from(select.options);
    
    let valueToSelect = '';
    
    if (name.includes('country')) {
      const option = options.find(opt => opt.text.includes('United States') || opt.value.includes('US'));
      if (option) valueToSelect = option.value;
    } else if (name.includes('year') || name.includes('experience')) {
      const option = options.find(opt => opt.text.includes('5') || opt.value.includes('5'));
      if (option) valueToSelect = option.value;
    } else if (options.length > 1) {
      // Skip placeholder options
      const realOptions = options.filter(opt => 
        opt.value && !opt.text.toLowerCase().includes('select')
      );
      if (realOptions.length > 0) valueToSelect = realOptions[0].value;
    }
    
    if (valueToSelect) {
      select.value = valueToSelect;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.style.border = '2px solid #34A853';
    }
  });
}

function fillRadioButtons() {
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.name) {
      if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
      radioGroups[radio.name].push(radio);
    }
  });
  
  Object.values(radioGroups).forEach(group => {
    const positive = group.find(r => 
      r.value.toLowerCase().includes('yes') || r.value.toLowerCase().includes('true') ||
      r.value.toLowerCase().includes('male') || r.value.toLowerCase().includes('remote')
    );
    const toCheck = positive || group[group.length - 1];
    
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
    
    const shouldCheck = name.includes('term') || name.includes('agree') || 
                       name.includes('consent') || name.includes('remote');
    const shouldUncheck = name.includes('newsletter') || name.includes('spam');
    
    if (shouldCheck) checkbox.checked = true;
    else if (shouldUncheck) checkbox.checked = false;
    
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    if (shouldCheck || shouldUncheck) {
      checkbox.style.outline = '3px solid #34A853';
    }
  });
}

function fillDateFields(data) {
  document.querySelectorAll('input[type="date"]').forEach(input => {
    const name = input.name?.toLowerCase() || '';
    if (name.includes('birth')) input.value = data.birthDate || '1990-01-01';
    else if (name.includes('start')) input.value = data.workStartDate || '2020-01-01';
    else if (name.includes('end')) input.value = data.workEndDate || '2023-12-31';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.style.border = '2px solid #34A853';
  });
}

// Upload CV from popup storage
async function uploadCV(cvData, cvFileName, cvFileType) {
  console.log('📎 Uploading CV...');
  
  const uint8Array = new Uint8Array(cvData);
  const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
  const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
  
  const fileInputs = document.querySelectorAll('input[type="file"]');
  let uploaded = false;
  
  fileInputs.forEach(input => {
    const label = getLabel(input).toLowerCase();
    const name = input.name?.toLowerCase() || '';
    
    // Upload to CV/resume fields or if only one file input exists
    const isCVField = label.includes('cv') || label.includes('resume') || 
                      name.includes('cv') || name.includes('resume');
    const shouldUpload = isCVField || fileInputs.length === 1;
    
    if (shouldUpload) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.style.border = '3px solid #34A853';
      input.title = `✅ CV uploaded: ${cvFileName}`;
      uploaded = true;
      console.log(`✅ CV uploaded to: ${name || label}`);
    }
  });
  
  return uploaded;
}

// Verify ALL fields are filled
function verifyAllFields() {
  const allInputs = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], input[type="date"],
    textarea, select
  `);
  
  let filled = 0;
  let total = 0;
  
  allInputs.forEach(input => {
    if (input.offsetParent === null) return; // Skip hidden fields
    
    total++;
    if (input.value && input.value.trim() !== '') {
      filled++;
      input.style.border = '2px solid #34A853'; // Green = filled
    } else {
      input.style.border = '2px solid #EA4335'; // Red = empty
    }
  });
  
  console.log(`📊 Field completion: ${filled}/${total} (${Math.round((filled/total)*100)}%)`);
  return { filled, total };
}

function clickAllButtons() {
  const buttonTexts = ['submit', 'apply', 'next', 'continue', 'save', 'send', 'confirm'];
  let count = 0;
  
  document.querySelectorAll('button, input[type="submit"], a').forEach(element => {
    const text = (element.textContent || element.value || '').toLowerCase();
    if (buttonTexts.some(keyword => text.includes(keyword))) {
      element.click();
      element.style.border = '3px solid #4285F4';
      count++;
    }
  });
  
  console.log(`👆 Clicked ${count} buttons`);
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent : '';
}