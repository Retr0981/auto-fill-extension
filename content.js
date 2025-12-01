// content.js - AGGRESSIVE FORM FILLING

// Use global config from config.js
let fieldMappings = FIELD_ALIASES;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "smartFill") {
    console.log('🔥 AGGRESSIVE FILL STARTED');
    fillEverythingAggressive(request.data, request.cvData, request.cvFileName, request.cvFileType)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  } else if (request.action === "verifyFill") {
    sendResponse(verifyAllFields());
  } else if (request.action === "extractAutofill") {
    const data = extractBrowserData();
    sendResponse({ autofillData: data });
  }
});

// Fill absolutely everything
async function fillEverythingAggressive(data, cvData, cvFileName, cvFileType) {
  console.log(`🔥 FILLING WITH ${Object.keys(data).length} DATA FIELDS`);
  
  // Try to fill every input on the page
  const inputs = document.querySelectorAll(`
    input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]),
    textarea, select
  `);
  
  console.log(`📋 FOUND ${inputs.length} INPUTS`);
  
  // Fill text inputs first
  for (const input of inputs) {
    if (input.disabled || input.offsetParent === null) continue;
    
    const value = getMatchingValueExtreme(input, data);
    if (value) {
      await fillInputExtreme(input, value);
      console.log(`  ✅ ${input.name || input.id}: ${value}`);
    }
  }
  
  // Fill checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
  for (const cb of checkboxes) {
    const shouldCheck = Math.random() > 0.5; // Aggressive: check half
    cb.checked = shouldCheck;
    triggerEventsExtreme(cb);
    await sleep(10);
  }
  
  // Fill radios
  const radios = document.querySelectorAll('input[type="radio"]:not([disabled])');
  const radioGroups = {};
  radios.forEach(r => {
    if (r.name) radioGroups[r.name] = [...(radioGroups[r.name]||[]), r];
  });
  
  for (const group of Object.values(radioGroups)) {
    if (group.length > 0) {
      group[0].checked = true;
      triggerEventsExtreme(group[0]);
    }
    await sleep(10);
  }
  
  // Upload CV
  if (cvData && cvFileName) {
    await uploadCVExtreme(cvData, cvFileName, cvFileType);
  }
  
  return verifyAllFields();
}

// EXTREME matching - tries everything
function getMatchingValueExtreme(field, data) {
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabelExtreme(field).toLowerCase();
  const context = `${name} ${id} ${label}`;
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    
    const aliases = fieldMappings[key] || [key];
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      
      // Multiple matching strategies
      if (context.includes(aliasLower)) return value;
      if (name === aliasLower || id === aliasLower) return value;
      if (name.includes(aliasLower) || id.includes(aliasLower) || label.includes(aliasLower)) return value;
      if (new RegExp(`\\b${aliasLower}\\b`).test(context)) return value;
      if (levenshteinDistance(context, aliasLower) < 4) return value;
    }
  }
  
  // Type-based fallback
  if (field.type === 'email' && data.email) return data.email;
  if (field.type === 'tel' && data.phone) return data.phone;
  if (field.type === 'url' && data.portfolio) return data.portfolio;
  
  return null;
}

// EXTREME input filling - tries 10 different methods
async function fillInputExtreme(input, value) {
  try {
    input.focus();
    
    // Strategy 1: Direct value set
    input.value = value;
    
    // Strategy 2: Property descriptor override
    try {
      Object.defineProperty(input, 'value', {
        value: value,
        writable: true,
        configurable: true
      });
    } catch (e) {}
    
    // Strategy 3: Setter calls
    if (input.__lookupSetter__('value')) {
      input.__lookupSetter__('value').call(input, value);
    }
    
    // Strategy 4: jQuery if available
    if (window.jQuery) {
      window.jQuery(input).val(value).trigger('input').trigger('change').trigger('blur');
    }
    
    // Strategy 5: Angular
    if (input.ngModel) input.ngModel = value;
    
    // Strategy 6: Vue
    if (input.__vue__) input.__vue__.value = value;
    
    // Strategy 7: React value tracker
    if (input._valueTracker) input._valueTracker.setValue('');
    
    // Strategy 8: Event storm
    triggerEventsExtreme(input);
    
    // Strategy 9: Native setters
    input.setAttribute('value', value);
    
    // Strategy 10: Double-check
    if (input.value !== value) {
      input.value = value;
      triggerEventsExtreme(input);
    }
    
    await sleep(50);
    input.blur();
    return true;
  } catch (error) {
    console.warn(`⚠️ Failed to fill ${input.name}:`, error);
    return false;
  }
}

// Get label - EXTREME
function getLabelExtreme(field) {
  if (field.labels?.length > 0) return field.labels[0].textContent.trim();
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent.trim();
  }
  const ariaLabel = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby');
  if (ariaLabel) return ariaLabel;
  if (field.placeholder) return field.placeholder;
  
  let parent = field.parentElement;
  for (let i = 0; i < 5 && parent; i++) {
    const text = parent.textContent.trim();
    if (text.length > 3 && text.length < 300) return text;
    parent = parent.parentElement;
  }
  return '';
}

// Aggressive CV upload
async function uploadCVExtreme(cvData, cvFileName, cvFileType) {
  const response = await fetch(cvData);
  const blob = await response.blob();
  const file = new File([blob], cvFileName, { type: cvFileType });
  
  const fileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');
  
  for (const input of fileInputs) {
    const name = (input.name || '').toLowerCase();
    const label = getLabelExtreme(input).toLowerCase();
    
    // More aggressive detection
    const isCVField = ['cv', 'resume', 'document', 'upload', 'file', 'attachment'].some(k => 
      name.includes(k) || label.includes(k)
    );
    
    if (isCVField || fileInputs.length === 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      triggerEventsExtreme(input);
      input.style.border = '3px solid #FF9800';
      console.log(`  📎 CV UPLOADED: ${cvFileName}`);
      return true;
    }
  }
  return false;
}

// Aggressive event triggering
function triggerEventsExtreme(element) {
  const events = ['input', 'change', 'blur', 'focus', 'keyup', 'keydown', 'click', 'paste'];
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    
    // React
    const reactEvent = new Event(eventType, { bubbles: true });
    reactEvent.simulated = true;
    element.dispatchEvent(reactEvent);
  });
}

// Extract browser data
function extractBrowserData() {
  const data = {};
  const fields = document.querySelectorAll('input[autocomplete]');
  
  fields.forEach(field => {
    const value = field.value.trim();
    if (value) {
      const mapping = {
        'given-name': 'firstName',
        'family-name': 'lastName',
        'email': 'email',
        'tel': 'phone',
        'organization': 'company',
      };
      if (mapping[field.autocomplete]) {
        data[mapping[field.autocomplete]] = value;
      }
    }
  });
  
  return data;
}

// Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
    }
  }
  return matrix[str2.length][str1.length];
}

// Sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Verify all fields
function verifyAllFields() {
  const inputs = document.querySelectorAll('input, textarea, select');
  let filled = 0, total = 0;
  
  inputs.forEach(input => {
    if (input.disabled || input.offsetParent === null) return;
    total++;
    
    const isFilled = input.type === 'radio' || input.type === 'checkbox' 
      ? input.checked 
      : (input.value?.trim().length > 0);
    
    if (isFilled) filled++;
    
    if (!['radio', 'checkbox', 'file'].includes(input.type)) {
      input.style.border = isFilled ? '3px solid #4CAF50' : '3px solid #f44336';
    }
  });
  
  return { filled, total };
}