// === AUTOFORM PRO - Handles ALL Form Controls ===

let fieldMappings = {};

// Debug logger
function log(message, data = '') {
  console.log(`[AutoForm Pro] ${message}`, data);
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
  
  log(`🔤 Processing ${textFields.length} text fields...`);
  
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
  log(`🔽 Processing ${selectFields.length} dropdowns...`);
  
  selectFields.forEach(select => {
    const name = (select.name || '').toLowerCase();
    const label = getLabel(select);
    const options = Array.from(select.options);
    
    let targetValue = '';
    
    // Try to match with user data first
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
    
    // Smart fallback
    if (!targetValue && options.length > 1) {
      if (name.includes('country')) {
        targetValue = options.find(opt => 
          opt.text.includes('United States') || opt.value.includes('US') ||
          opt.text.includes('USA') || opt.text.includes('America')
        )?.value;
      } else if (name.includes('year') || name.includes('experience')) {
        targetValue = options.find(opt => 
          opt.text.includes('5') || opt.value.includes('5') ||
          opt.text.toLowerCase().includes('five')
        )?.value;
      } else {
        // Select first real option (skip placeholders)
        targetValue = options.find(opt => 
          !opt.text.toLowerCase().includes('select') && 
          !opt.value.toLowerCase().includes('select') &&
          opt.text.trim() !== ''
        )?.value;
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
  log(`☑️  Processing ${checkboxFields.length} checkboxes...`);
  
  checkboxFields.forEach(checkbox => {
    const name = (checkbox.name || '').toLowerCase();
    const label = getLabel(checkbox);
    
    // Smart logic for checking/unchecking
    let shouldCheck = false;
    let shouldUncheck = false;
    
    // Check if data explicitly controls this checkbox
    for (const [key, value] of Object.entries(data)) {
      if (value && [name, label].some(n => n.includes(key.toLowerCase()))) {
        shouldCheck = ['yes', 'true', '1', 'agree', 'accept', 'on'].includes(value.toLowerCase());
        break;
      }
    }
    
    // Heuristic rules
    if (!shouldCheck && !shouldUncheck) {
      shouldCheck = ['term', 'agree', 'consent', 'remote', 'policy', 'condition', 'certify', 'eligibility'].some(k => 
        name.includes(k) || label.includes(k)
      );
      shouldUncheck = ['newsletter', 'spam', 'marketing', 'promo', 'offer', 'advert', 'notification'].some(k => 
        name.includes(k) || label.includes(k)
      );
    }
    
    if (shouldUncheck) {
      checkbox.checked = false;
      checkbox.style.outline = '3px solid #f44336';
      log(`  ❌ UNCHECK: ${name || label}`);
    } else if (shouldCheck) {
      checkbox.checked = true;
      triggerEvents(checkbox);
      checkbox.style.outline = '3px solid #4CAF50';
      checkbox.style.background = 'rgba(76, 175, 80, 0.1)';
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
  
  log(`⭕ Processing ${Object.keys(radioGroups).length} radio groups...`);
  
  Object.entries(radioGroups).forEach(([groupName, radios]) => {
    if (radios.length === 0) return;
    
    let selectedRadio = null;
    
    // Try to find matching value in data
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      
      const match = radios.find(r => 
        r.value.toLowerCase() === value.toLowerCase() ||
        (['yes', 'true', '1'].includes(value.toLowerCase()) && 
         ['yes', 'true', '1', 'agree', 'accept'].some(v => r.value.toLowerCase().includes(v)))
      );
      
      if (match) {
        selectedRadio = match;
        break;
      }
    }
    
    // Smart default selection
    if (!selectedRadio) {
      const priorityValues = ['yes', 'true', '1', 'agree', 'accept', 'male', 'full-time', 'remote', 'on'];
      selectedRadio = radios.find(r => 
        priorityValues.some(v => r.value.toLowerCase().includes(v))
      ) || radios[0];
    }
    
    if (selectedRadio) {
      selectedRadio.checked = true;
      triggerEvents(selectedRadio);
      selectedRadio.style.outline = '3px solid #FF9800';
      selectedRadio.style.background = 'rgba(255, 152, 0, 0.1)';
      log(`  ✅ RADIO: ${groupName} = "${selectedRadio.value}"`);
    }
  });
}

// === VALUE MATCHING ENGINE ===
function getMatchingValue(element, data) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const label = getLabel(element).toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  
  // Try exact match first
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const aliases = fieldMappings[key] || [key];
    
    if (aliases.some(alias => name === alias.toLowerCase() || id === alias.toLowerCase())) {
      return value;
    }
  }
  
  // Try contains match
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const aliases = fieldMappings[key] || [key];
    
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_-]/g, '');
      if (name.includes(cleanAlias) || 
          id.includes(cleanAlias) || 
          label.includes(cleanAlias) || 
          placeholder.includes(cleanAlias)) {
        return value;
      }
    }
  }
  
  return null;
}

// === MASTER CONTROL ===
async function fillEverything(data, cvData, cvFileName, cvFileType) {
  log('🚀 MASTER FILL SEQUENCE INITIATED');
  log('Available data:', Object.keys(data));
  
  // Three passes for dynamic forms
  for (let pass = 1; pass <= 3; pass++) {
    log(`\n📌 PASS ${pass}/3`);
    
    fillTextInputs(data);
    await sleep(300);
    
    fillDropdowns(data);
    await sleep(300);
    
    fillCheckboxes(data);
    await sleep(300);
    
    fillRadioButtons(data);
    await sleep(300);
    
    // Date fields
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
  }
  
  // CV Upload
  if (cvData && cvFileName) {
    await uploadCVAgent(cvData, cvFileName, cvFileType);
  }
  
  // Final verification
  setTimeout(() => {
    const result = verifyAllFields();
    log(`🎯 FINAL RESULT: ${result.filled}/${result.total} fields filled`);
  }, 500);
  
  log('🏆 MASTER FILL COMPLETED');
}

// CV Upload Agent
async function uploadCVAgent(cvData, cvFileName, cvFileType) {
  log('📎 CV Upload Agent: Starting...');
  
  const uint8Array = new Uint8Array(cvData);
  const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
  const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
  
  const fileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');
  
  for (const input of fileInputs) {
    const name = (input.name || '').toLowerCase();
    const label = getLabel(input);
    
    const isCVField = ['cv', 'resume', 'curriculum', 'vitae'].some(k => 
      name.includes(k) || label.includes(k)
    );
    
    if (isCVField || fileInputs.length === 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      triggerEvents(input);
      
      input.style.border = '3px solid #FF9800';
      input.style.background = '#FFE0B2';
      log(`  ✅ CV UPLOADED: ${cvFileName} → ${name || label}`);
      return true;
    }
  }
  
  log('  ⚠️ No CV upload field found');
  return false;
}

// Verify fields
function verifyAllFields() {
  const inputs = document.querySelectorAll('input, textarea, select');
  let filled = 0, total = 0;
  
  inputs.forEach(input => {
    if (input.offsetParent === null) return;
    total++;
    
    const isFilled = input.type === 'radio' || input.type === 'checkbox' 
      ? input.checked 
      : (input.value && input.value.trim());
    
    if (isFilled) filled++;
    input.style.border = isFilled ? '3px solid #4CAF50' : '3px solid #f44336';
  });
  
  log(`📊 VERIFICATION: ${filled}/${total} (${Math.round(filled/total*100)}%)`);
  return { filled, total };
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  fieldMappings = request.fieldMappings || {};
  
  if (request.action === "smartFill") {
    fillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType)
      .then(() => sendResponse({ success: true, message: "All form controls filled" }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  } else if (request.action === "verifyFill") {
    sendResponse(verifyAllFields());
  }
});