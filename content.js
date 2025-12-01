chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractAutofill") {
    sendResponse({ autofillData: extractAllData() });
  } else if (request.action === "smartFill") {
    fillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType);
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
    
    const name = field.name?.toLowerCase() || '';
    const label = getLabel(field).toLowerCase();
    
    // Map all possible fields
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

async function fillEverything(data, cvData, cvFileName, cvFileType) {
  console.log('🚀 Processing ALL form elements...');
  
  // Fill everything in sequence
  fillTextFields(data);
  fillDropdowns(data);
  fillRadioButtons();
  fillCheckboxes();
  fillDateFields(data);
  
  if (cvData && cvFileName) {
    await uploadCV(cvData, cvFileName, cvFileType);
  }
}

function fillTextFields(data) {
  const fields = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], textarea
  `);
  
  fields.forEach(field => {
    const name = field.name?.toLowerCase() || '';
    const label = getLabel(field).toLowerCase();
    
    let value = '';
    
    // Comprehensive mapping
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
    
    if (value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.style.border = '2px solid #34A853';
    }
  });
}

function fillDropdowns(data) {
  document.querySelectorAll('select').forEach(select => {
    const name = select.name?.toLowerCase() || '';
    const options = Array.from(select.options);
    
    let valueToSelect = '';
    
    if (name.includes('country')) {
      const option = options.find(opt => opt.text.includes('United States'));
      if (option) valueToSelect = option.value;
    } else if (name.includes('year')) {
      const option = options.find(opt => opt.text.includes('5'));
      if (option) valueToSelect = option.value;
    } else if (options.length > 1) {
      const realOptions = options.filter(opt => !opt.text.toLowerCase().includes('select'));
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
  const groups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.name) {
      if (!groups[radio.name]) groups[radio.name] = [];
      groups[radio.name].push(radio);
    }
  });
  
  Object.values(groups).forEach(group => {
    const positive = group.find(r => r.value.toLowerCase().includes('yes'));
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
    
    const shouldCheck = name.includes('term') || name.includes('agree') || name.includes('remote');
    const shouldUncheck = name.includes('newsletter');
    
    if (shouldCheck) checkbox.checked = true;
    else if (shouldUncheck) checkbox.checked = false;
    
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
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

function uploadCV(cvData, cvFileName, cvFileType) {
  return new Promise(resolve => {
    const uint8Array = new Uint8Array(cvData);
    const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
    const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
    
    const fileInputs = document.querySelectorAll('input[type="file"]');
    let uploaded = false;
    
    fileInputs.forEach(input => {
      const label = getLabel(input).toLowerCase();
      const name = input.name?.toLowerCase() || '';
      const isCVField = label.includes('cv') || label.includes('resume') || name.includes('cv');
      const shouldUpload = isCVField || fileInputs.length === 1;
      
      if (shouldUpload) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.style.border = '3px solid #34A853';
        input.title = `✅ CV: ${cvFileName}`;
        uploaded = true;
      }
    });
    
    setTimeout(() => resolve(uploaded), 500);
  });
}

function clickAllButtons() {
  const actions = ['submit', 'apply', 'next', 'continue', 'save', 'send', 'confirm'];
  let count = 0;
  
  document.querySelectorAll('button, input[type="submit"], a').forEach(element => {
    const text = (element.textContent || element.value || '').toLowerCase();
    if (actions.some(action => text.includes(action))) {
      element.click();
      element.style.border = '3px solid #4285F4';
      count++;
    }
  });
  
  console.log(`👆 Clicked ${count} buttons`);
}

function verifyAllFields() {
  const inputs = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], input[type="date"],
    textarea, select
  `);
  
  let filled = 0, total = 0;
  
  inputs.forEach(input => {
    if (input.offsetParent === null) return; // Skip hidden
    
    total++;
    if (input.value && input.value.trim() !== '') {
      filled++;
      input.style.border = '2px solid #34A853';
    } else {
      input.style.border = '2px solid #EA4335';
    }
  });
  
  console.log(`📊 ${filled}/${total} fields filled (${Math.round((filled/total)*100)}%)`);
  return { filled, total };
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent : '';
}