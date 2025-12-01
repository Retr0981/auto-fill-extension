// === AUTOFORM MASTER - Handles ALL Form Controls ===

let fieldMappings = {};

// Debug logger
function log(message, data = '') {
  console.log(`[AutoForm] ${message}`, data);
}

// Trigger ALL events for maximum compatibility
function triggerEvents(element) {
  ['input', 'change', 'blur', 'keyup', 'keydown'].forEach(event => {
    element.dispatchEvent(new Event(event, { bubbles: true, cancelable: true }));
  });
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === TEXT INPUT HANDLER ===
function fillTextInputs(data) {
  const textFields = document.querySelectorAll(`
    input[type="text"]:not([disabled]):not([readonly]),
    input[type="email"]:not([disabled]):not([readonly]),
    input[type="tel"]:not([disabled]):not([readonly]),
    input[type="url"]:not([disabled]):not([readonly]),
    input[type="number"]:not([disabled]):not([readonly]),
    textarea:not([disabled]):not([readonly])
  `);
  
  log(`🔤 Scanning ${textFields.length} text fields...`);
  
  textFields.forEach(field => {
    const value = getMatchingValue(field, data);
    if (value) {
      field.value = value;
      triggerEvents(field);
      field.style.border = '3px solid #4CAF50';
      field.style.background = '#E8F5E9';
      log(`  ✅ TEXT: ${field.name || field.id} = "${value}"`);
    }
  });
}

// === DROPDOWN HANDLER ===
function fillDropdowns(data) {
  const selectFields = document.querySelectorAll('select:not([disabled])');
  log(`🔽 Scanning ${selectFields.length} dropdowns...`);
  
  selectFields.forEach(select => {
    const name = (select.name || '').toLowerCase();
    const label = getLabel(select);
    const options = Array.from(select.options);
    
    let targetValue = '';
    
    // Try to match with data first
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      const aliases = fieldMappings[key] || [key];
      
      if (aliases.some(alias => name.includes(alias.toLowerCase()) || label.includes(alias.toLowerCase()))) {
        const matchingOption = options.find(opt => 
          opt.text.toLowerCase().includes(value.toLowerCase()) ||
          opt.value.toLowerCase().includes(value.toLowerCase())
        );
        if (matchingOption) {
          targetValue = matchingOption.value;
          break;
        }
      }
    }
    
    // Fallback to smart selection
    if (!targetValue) {
      if (name.includes('country')) {
        targetValue = options.find(opt => opt.text.includes('United States') || opt.value.includes('US'))?.value;
      } else if (name.includes('year') || name.includes('experience')) {
        targetValue = options.find(opt => opt.text.includes('5') || opt.value.includes('5'))?.value;
      } else if (options.length > 1) {
        // Select first non-placeholder option
        targetValue = options.find(opt => !opt.text.toLowerCase().includes('select'))?.value;
      }
    }
    
    if (targetValue) {
      select.value = targetValue;
      triggerEvents(select);
      select.style.border = '3px solid #2196F3';
      select.style.background = '#E3F2FD';
      log(`  ✅ DROPDOWN: ${select.name || select.id} = "${targetValue}"`);
    }
  });
}

// === CHECKBOX HANDLER ===
function fillCheckboxes(data) {
  const checkboxFields = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
  log(`☑️  Scanning ${checkboxFields.length} checkboxes...`);
  
  checkboxFields.forEach(checkbox => {
    const name = (checkbox.name || '').toLowerCase();
    const label = getLabel(checkbox);
    
    // Determine if should be checked or unchecked
    let shouldCheck = false;
    
    // Check if data explicitly says to check it
    for (const [key, value] of Object.entries(data)) {
      if (value && [name, label].some(n => n.includes(key.toLowerCase()))) {
        shouldCheck = ['yes', 'true', '1', 'agree', 'accept', 'on'].includes(value.toLowerCase());
        break;
      }
    }
    
    // Heuristic rules
    if (!shouldCheck) {
      shouldCheck = ['term', 'agree', 'consent', 'remote', 'policy', 'condition', 'certify'].some(k => 
        name.includes(k) || label.includes(k)
      );
    }
    
    // Negative rules
    const shouldUncheck = ['newsletter', 'spam', 'marketing', 'promo', 'offer', 'advert'].some(k => 
      name.includes(k) || label.includes(k)
    );
    
    if (shouldUncheck) {
      checkbox.checked = false;
      checkbox.style.outline = '3px solid #f44336';
      log(`  ❌ UNCHECK: ${name || label}`);
    } else if (shouldCheck) {
      checkbox.checked = true;
      triggerEvents(checkbox);
      checkbox.style.outline = '3px solid #4CAF50';
      checkbox.style.background = '#E8F5E9';
      log(`  ✅ CHECKBOX: ${name || label} = CHECKED`);
    }
  });
}

// === RADIO BUTTON HANDLER ===
function fillRadioButtons(data) {
  const radioGroups = {};
  
  document.querySelectorAll('input[type="radio"]:not([disabled])').forEach(radio => {
    if (radio.name) {
      radioGroups[radio.name] = radioGroups[radio.name] || [];
      radioGroups[radio.name].push(radio);
    }
  });
  
  log(`⭕ Scanning ${Object.keys(radioGroups).length} radio groups...`);
  
  Object.entries(radioGroups).forEach(([groupName, radios]) => {
    // Try to find a matching value in data
    let selectedRadio = null;
    
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      
      const matchingRadio = radios.find(r => 
        r.value.toLowerCase() === value.toLowerCase() ||
        (['yes', 'true', '1'].includes(value.toLowerCase()) && 
         ['yes', 'true', '1', 'agree', 'accept'].some(v => r.value.toLowerCase().includes(v)))
      );
      
      if (matchingRadio) {
        selectedRadio = matchingRadio;
        break;
      }
    }
    
    // Default selection if no match
    if (!selectedRadio) {
      const priorityValues = ['yes', 'true', '1', 'agree', 'accept', 'male', 'full-time', 'remote'];
      selectedRadio = radios.find(r => 
        priorityValues.some(v => r.value.toLowerCase().includes(v))
      ) || radios[0];
    }
    
    if (selectedRadio) {
      selectedRadio.checked = true;
      triggerEvents(selectedRadio);
      selectedRadio.style.outline = '3px solid #FF9800';
      selectedRadio.style.background = '#FFF3E0';
      log(`  ✅ RADIO: ${groupName} = "${selectedRadio.value}"`);
    }
  });
}

// === MASTER FILL FUNCTION ===
async function fillEverything(data, cvData, cvFileName, cvFileType) {
  log('🚀 STARTING UNIVERSAL FILL');
  log('Available data:', Object.keys(data));
  
  // **THREE PASSES** to catch dynamic forms
  for (let pass = 1; pass <= 3; pass++) {
    log(`\n📌 PASS ${pass}/3`);
    
    fillTextInputs(data);
    fillDropdowns(data);
    fillCheckboxes(data);
    fillRadioButtons(data);
    
    // Fill date fields
    const dateInputs = document.querySelectorAll('input[type="date"]:not([disabled])');
    dateInputs.forEach(input => {
      const name = input.name?.toLowerCase() || '';
      let dateValue = '';
      
      if (name.includes('birth')) dateValue = data.birthDate || '1990-01-01';
      else if (name.includes('start')) dateValue = data.workStartDate || '2020-01-01';
      else if (name.includes('end')) dateValue = data.workEndDate || '2023-12-31';
      else dateValue = '2024-01-01';
      
      input.value = dateValue;
      triggerEvents(input);
      input.style.border = '3px solid #9C27B0';
      log(`  📅 DATE: ${input.name || input.id} = ${dateValue}`);
    });
    
    await sleep(800); // Wait for dynamic content
  }
  
  // CV Upload
  if (cvData && cvFileName) {
    await uploadCVAgent(cvData, cvFileName, cvFileType);
  }
  
  log('🏆 UNIVERSAL FILL COMPLETED');
}

// CV Upload Agent
async function uploadCVAgent(cvData, cvFileName, cvFileType) {
  log('📎 Uploading CV...');
  
  const uint8Array = new Uint8Array(cvData);
  const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
  const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
  
  const fileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');
  
  for (const input of fileInputs) {
    const name = input.name?.toLowerCase() || '';
    const label = getLabel(input);
    
    const isCVField = ['cv', 'resume'].some(k => name.includes(k) || label.includes(k));
    
    if (isCVField || fileInputs.length === 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      triggerEvents(input);
      
      input.style.border = '3px solid #FF9800';
      input.style.background = '#FFE0B2';
      log(`  ✅ CV UPLOADED: ${cvFileName}`);
      return true;
    }
  }
  
  return false;
}

// Get label text
function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent.trim().toLowerCase() : '';
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  fieldMappings = request.fieldMappings || {};
  
  if (request.action === "smartFill") {
    fillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Async
  } else if (request.action === "verifyFill") {
    // Simple verification - check if fields have values
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea, select');
    const filled = Array.from(inputs).filter(i => i.value && i.value.trim()).length;
    sendResponse({ filled, total: inputs.length });
  }
});