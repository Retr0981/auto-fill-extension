// Global field mappings
let fieldMappings = {};

// Debug logger
function log(message, data = '') {
  console.log(`[AutoFill Pro] ${message}`, data);
  // Also send to background for unified logging
  chrome.runtime.sendMessage({
    action: "log",
    message: message,
    data: data
  });
}

// Enhanced field matching
function getMatchingValue(element, data) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const label = getLabel(element).toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  
  // Try exact matches first
  for (const [standardKey, standardValue] of Object.entries(data)) {
    if (!standardValue) continue;
    
    const aliases = fieldMappings[standardKey] || [standardKey];
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_-]/g, '');
      
      if (name === cleanAlias || id === cleanAlias) {
        return standardValue;
      }
    }
  }
  
  // Try partial matches
  for (const [standardKey, standardValue] of Object.entries(data)) {
    if (!standardValue) continue;
    
    const aliases = fieldMappings[standardKey] || [standardKey];
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_-]/g, '');
      
      if (name.includes(cleanAlias) || 
          id.includes(cleanAlias) || 
          label.includes(cleanAlias) ||
          placeholder.includes(cleanAlias)) {
        return standardValue;
      }
    }
  }
  
  return null;
}

// Trigger events properly
function triggerEvents(element) {
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Message received', request.action);
  fieldMappings = request.fieldMappings || {};
  
  try {
    switch(request.action) {
      case "extractAutofill":
        sendResponse({ autofillData: extractAllData() });
        break;
      
      case "smartFill":
        fillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ error: err.message }));
        return true; // Async response
      
      case "verifyFill":
        sendResponse(verifyAllFields());
        break;
      
      case "clickButtons":
        clickAllButtons();
        sendResponse({ success: true });
        break;
    }
  } catch (error) {
    log('ERROR in message handler', error);
    sendResponse({ error: error.message });
  }
  
  return true;
});

// Extract all form data
function extractAllData() {
  const data = {};
  const fields = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], input[type="url"], 
    input[type="number"], input[type="date"], textarea, select
  `);
  
  log(`Extracting from ${fields.length} fields`);
  
  fields.forEach(field => {
    const value = field.value?.trim();
    if (!value) return;
    
    const name = field.name || '';
    const id = field.id || '';
    const label = getLabel(field);
    
    for (const [standardKey, aliases] of Object.entries(fieldMappings)) {
      const matches = aliases.some(alias => {
        const clean = alias.toLowerCase().replace(/[\s_-]/g, '');
        return name.toLowerCase().includes(clean) || 
               id.toLowerCase().includes(clean) || 
               label.toLowerCase().includes(clean);
      });
      
      if (matches) {
        data[standardKey] = value;
        break;
      }
    }
  });
  
  return data;
}

// Main fill function
async function fillEverything(data, cvData, cvFileName, cvFileType) {
  log('🚀 STARTING SMART FILL', Object.keys(data));
  
  // Wait for dynamic forms
  await sleep(500);
  
  fillTextFields(data);
  fillDropdowns(data);
  fillRadioButtons();
  fillCheckboxes();
  fillDateFields(data);
  
  if (cvData && cvFileName) {
    await uploadCVAgent(cvData, cvFileName, cvFileType);
  }
  
  log('✅ SMART FILL COMPLETED');
}

// Fill text fields
function fillTextFields(data) {
  const fields = document.querySelectorAll(`
    input[type="text"]:not([disabled]):not([readonly]),
    input[type="email"]:not([disabled]):not([readonly]),
    input[type="tel"]:not([disabled]):not([readonly]),
    input[type="url"]:not([disabled]):not([readonly]),
    input[type="number"]:not([disabled]):not([readonly]),
    textarea:not([disabled]):not([readonly])
  `);
  
  log(`Filling ${fields.length} text fields`);
  
  fields.forEach(field => {
    const value = getMatchingValue(field, data);
    if (value) {
      field.value = value;
      triggerEvents(field);
      field.style.border = '2px solid #34A853';
      log(`  ✅ ${field.name || field.id} = ${value}`);
    }
  });
}

// Fill dropdowns
function fillDropdowns(data) {
  const selects = document.querySelectorAll('select:not([disabled])');
  log(`Filling ${selects.length} dropdowns`);
  
  selects.forEach(select => {
    const name = select.name?.toLowerCase() || '';
    const label = getLabel(select);
    let valueToSelect = '';
    
    // Try data match first
    for (const [key, val] of Object.entries(data)) {
      if (!val) continue;
      const aliases = fieldMappings[key] || [key];
      if (aliases.some(a => name.includes(a.toLowerCase()) || label.includes(a.toLowerCase()))) {
        const option = Array.from(select.options).find(opt => 
          opt.text.toLowerCase().includes(val.toLowerCase()) ||
          opt.value.toLowerCase().includes(val.toLowerCase())
        );
        if (option) valueToSelect = option.value;
        break;
      }
    }
    
    // Fallbacks
    if (!valueToSelect && name.includes('country')) {
      const option = Array.from(select.options).find(opt => 
        opt.text.includes('United States') || opt.value.includes('US')
      );
      if (option) valueToSelect = option.value;
    }
    
    if (valueToSelect) {
      select.value = valueToSelect;
      triggerEvents(select);
      select.style.border = '2px solid #34A853';
      log(`  ✅ ${select.name || select.id} = ${valueToSelect}`);
    }
  });
}

// Fill radio buttons
function fillRadioButtons() {
  const groups = {};
  document.querySelectorAll('input[type="radio"]:not([disabled])').forEach(radio => {
    if (radio.name) {
      groups[radio.name] = groups[radio.name] || [];
      groups[radio.name].push(radio);
    }
  });
  
  log(`Filling ${Object.keys(groups).length} radio groups`);
  
  Object.values(groups).forEach(group => {
    const priority = ['yes', 'true', '1', 'male', 'full-time', 'remote'];
    const toCheck = group.find(r => priority.some(p => r.value.toLowerCase().includes(p))) || group[0];
    
    if (toCheck) {
      toCheck.checked = true;
      triggerEvents(toCheck);
      toCheck.style.outline = '3px solid #34A853';
      log(`  ✅ Radio: ${toCheck.name} = ${toCheck.value}`);
    }
  });
}

// Fill checkboxes
function fillCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
  log(`Filling ${checkboxes.length} checkboxes`);
  
  checkboxes.forEach(box => {
    const name = box.name?.toLowerCase() || '';
    const label = getLabel(box);
    
    const shouldCheck = ['term', 'agree', 'consent', 'remote', 'policy'].some(k => 
      name.includes(k) || label.includes(k)
    );
    const shouldUncheck = ['newsletter', 'spam', 'marketing'].some(k => 
      name.includes(k) || label.includes(k)
    );
    
    if (shouldCheck) {
      box.checked = true;
      triggerEvents(box);
      box.style.outline = '3px solid #34A853';
      log(`  ✅ Checked: ${name || label}`);
    } else if (shouldUncheck) {
      box.checked = false;
      triggerEvents(box);
      log(`  ❌ Unchecked: ${name || label}`);
    }
  });
}

// Fill date fields
function fillDateFields(data) {
  const dateInputs = document.querySelectorAll('input[type="date"]:not([disabled])');
  log(`Filling ${dateInputs.length} date fields`);
  
  dateInputs.forEach(input => {
    const name = input.name?.toLowerCase() || '';
    const label = getLabel(input);
    let dateValue = '';
    
    if (name.includes('birth') || label.includes('birth')) {
      dateValue = data.birthDate || '1990-01-01';
    } else if (name.includes('start') || label.includes('start')) {
      dateValue = data.workStartDate || '2020-01-01';
    } else if (name.includes('end') || label.includes('end')) {
      dateValue = data.workEndDate || '2023-12-31';
    }
    
    if (dateValue) {
      input.value = dateValue;
      triggerEvents(input);
      input.style.border = '2px solid #34A853';
      log(`  ✅ Date: ${input.name || input.id} = ${dateValue}`);
    }
  });
}

// CV Upload Agent
async function uploadCVAgent(cvData, cvFileName, cvFileType) {
  log('🤖 CV Agent: Scanning for upload fields...');
  
  const uint8Array = new Uint8Array(cvData);
  const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
  const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
  
  const fileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');
  log(`Found ${fileInputs.length} file inputs`);
  
  for (const input of fileInputs) {
    const label = getLabel(input);
    const name = input.name?.toLowerCase() || '';
    
    const isCVField = ['cv', 'resume', 'curriculum'].some(k => 
      label.includes(k) || name.includes(k)
    );
    
    if (isCVField || fileInputs.length === 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      triggerEvents(input);
      
      input.style.border = '3px solid #34A853';
      input.style.background = '#d4edda';
      
      log(`  ✅ CV uploaded: ${name || 'unnamed'}`);
      return true;
    }
  }
  
  log('  ⚠️ No CV field found');
  return false;
}

// Verify fields
function verifyAllFields() {
  const inputs = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], input[type="url"], 
    input[type="number"], input[type="date"], textarea, select, 
    input[type="radio"], input[type="checkbox"]
  `);
  
  let filled = 0, total = 0;
  
  inputs.forEach(input => {
    if (input.offsetParent === null && input.type !== 'radio' && input.type !== 'checkbox') return;
    total++;
    
    const isFilled = input.type === 'radio' || input.type === 'checkbox' 
      ? input.checked 
      : (input.value && input.value.trim());
    
    if (isFilled) filled++;
  });
  
  log(`📊 Verification: ${filled}/${total} (${Math.round(filled/total*100)}%)`);
  return { filled, total };
}

// Click buttons
function clickAllButtons() {
  const actions = ['submit', 'apply', 'next', 'continue', 'save', 'send', 'confirm', 'proceed'];
  let count = 0;
  
  document.querySelectorAll('button, input[type="submit"]').forEach(btn => {
    const text = (btn.textContent || btn.value || '').toLowerCase().trim();
    if (actions.some(a => text.includes(a)) && text.length < 30) {
      btn.click();
      count++;
      log(`  👆 Clicked: ${text}`);
    }
  });
  
  log(`Clicked ${count} action buttons`);
}

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent.trim().toLowerCase() : '';
}