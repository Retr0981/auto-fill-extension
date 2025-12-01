// content.js - EXTREME FORM FILLING MODE
// This will fill EVERYTHING it can find - aggressive, no mercy!

// Use global config loaded from config.js
let fieldMappings = FIELD_ALIASES;

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize() {
  console.log('🎯 AutoFill Pro: EXTREME MODE ACTIVATED - Will fill EVERYTHING');
  setupFormObserver();
}

// Aggressive form observer
function setupFormObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        const hasInputs = Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && node.querySelector?.('input, select, textarea')
        );
        if (hasInputs) {
          console.log('🔥 NEW FIELDS DETECTED - Ready to fill them all');
        }
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  fieldMappings = request.fieldMappings || FIELD_ALIASES;
  
  if (request.action === "smartFill") {
    console.log('🚀 EXTREME FILL COMMAND RECEIVED');
    smartFillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType, request.formType)
      .then(result => {
        console.log('✅ EXTREME FILL COMPLETE:', result);
        sendResponse({ success: true, ...result });
      })
      .catch(err => {
        console.error('❌ EXTREME FILL FAILED:', err);
        sendResponse({ error: err.message });
      });
    return true;
  } else if (request.action === "verifyFill") {
    const result = verifyAllFields();
    console.log('📊 VERIFICATION:', result);
    sendResponse(result);
  } else if (request.action === "extractAutofill") {
    extractBrowserData().then(sendResponse);
    return true;
  }
});

// EXTREME FILL - fills EVERYTHING
async function smartFillEverything(data, cvData, cvFileName, cvFileType, formType) {
  console.log(`🔥 EXTREME FILL: ${formType || 'form'} with ${Object.keys(data).length} data fields`);
  
  // Wait for dynamic content
  await waitForDynamicContent();
  
  // Get EVERY possible field
  const allFields = getEverySingleField();
  console.log(`📋 FOUND ${allFields.length} FIELDS TO ATTACK`);
  
  // Fill EVERY field with ANYTHING that might match
  let filledCount = 0;
  for (const field of allFields) {
    // Try to find ANY value for this field
    let value = null;
    
    // Strategy 1: Smart matching
    value = getAnyPossibleMatch(field, data);
    
    // Strategy 2: If no match but field is required, use aggressive defaults
    if (!value && field.required) {
      value = getAggressiveDefault(field);
    }
    
    // Strategy 3: If still no value, use ANY data we have (desperate mode)
    if (!value && Object.keys(data).length > 0) {
      const keys = Object.keys(data);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      // Only do this for text fields that might accept anything
      if (field.type === 'text' || field.tagName === 'TEXTAREA') {
        value = data[randomKey];
      }
    }
    
    if (value) {
      const success = await fillFieldExtreme(field, value);
      if (success) {
        filledCount++;
        field.style.border = '3px solid #4CAF50';
        console.log(`  ✅ FILLED: ${field.name || field.id || field.type} = "${value}"`);
      } else {
        field.style.border = '3px solid #FF9800';
        console.log(`  ⚠️ PARTIAL: ${field.name || field.id}`);
      }
    } else {
      // Mark empty fields
      field.style.border = '3px solid #f44336';
    }
    
    await sleep(10); // Minimal delay
  }
  
  // Now handle checkboxes and radios
  await fillEveryCheckbox(data, formType);
  await fillEveryRadio(data, formType);
  
  // Upload CV
  if (cvData && cvFileName) {
    await uploadCVAgent(cvData, cvFileName, cvFileType);
  }
  
  // Final check
  const result = verifyAllFields();
  console.log(`🏆 EXTREME FILL COMPLETE: ${result.filled}/${result.total}`);
  
  return result;
}

// Wait for ANY dynamic content
async function waitForDynamicContent() {
  return new Promise(resolve => {
    let checks = 0;
    const check = () => {
      checks++;
      const loading = document.querySelectorAll('.loading, .spinner, [aria-busy="true"], .skeleton, .placeholder');
      if (loading.length === 0 || checks > 20) {
        console.log(`⏱️ Waited ${checks * 300}ms for content`);
        resolve();
      } else {
        setTimeout(check, 300);
      }
    };
    setTimeout(check, 300);
  });
}

// Get EVERY SINGLE field - aggressive
function getEverySingleField() {
  const selectors = `
    input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]),
    textarea,
    select
  `;
  
  // Main document
  let fields = Array.from(document.querySelectorAll(selectors));
  
  // Shadow DOM
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      fields.push(...el.shadowRoot.querySelectorAll(selectors));
    }
  });
  
  // Remove duplicates and disabled
  fields = fields.filter(f => !f.disabled && f.offsetParent !== null);
  
  // Remove duplicates by name/id combo
  const unique = [];
  const seen = new Set();
  fields.forEach(f => {
    const key = `${f.name}-${f.id}-${f.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  });
  
  console.log(`🔍 FOUND ${unique.length} UNIQUE FIELDS`);
  return unique;
}

// Get ANY possible match - EXTREME
function getAnyPossibleMatch(field, data) {
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabelExtreme(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const type = field.type || 'text';
  
  const context = `${name} ${id} ${label} ${placeholder}`;
  
  // Try every data field with every alias
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const aliases = fieldMappings[key] || [key];
    
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      
      // Exact match
      if (name === aliasLower || id === aliasLower) return value;
      
      // Contains
      if (name.includes(aliasLower) || id.includes(aliasLower) || label.includes(aliasLower) || placeholder.includes(aliasLower)) {
        return value;
      }
      
      // Word boundary
      if (new RegExp(`\\b${aliasLower}\\b`).test(context)) {
        return value;
      }
      
      // Fuzzy match (typos)
      if (levenshteinDistance(context, aliasLower) < 4) {
        return value;
      }
    }
  }
  
  // Type-based fallback
  if (type === 'email' && data.email) return data.email;
  if (type === 'tel' && data.phone) return data.phone;
  if (type === 'url' && data.portfolio) return data.portfolio;
  
  return null;
}

// Get label - EXTREME
function getLabelExtreme(field) {
  // Method 1: Standard
  if (field.labels?.length > 0) return field.labels[0].textContent.trim();
  
  // Method 2: For attribute
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Method 3: Aria
  const ariaLabel = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby');
  if (ariaLabel) return ariaLabel;
  
  // Method 4: Placeholder
  if (field.placeholder) return field.placeholder;
  
  // Method 5: Parent hierarchy
  let parent = field.parentElement;
  for (let i = 0; i < 5 && parent; i++) {
    const text = parent.textContent.trim();
    if (text.length > 3 && text.length < 300) {
      return text;
    }
    parent = parent.parentElement;
  }
  
  // Method 6: Previous siblings
  let prev = field;
  for (let i = 0; i < 3; i++) {
    prev = prev.previousElementSibling;
    if (prev && prev.textContent.trim() && prev.textContent.trim().length < 100) {
      return prev.textContent.trim();
    }
  }
  
  return '';
}

// EXTREME field filling - tries EVERYTHING
async function fillFieldExtreme(field, value) {
  try {
    field.focus();
    
    // Strategy 1: Standard
    field.value = value;
    
    // Strategy 2: Property descriptor
    try {
      Object.defineProperty(field, 'value', {
        value: value,
        writable: true,
        configurable: true
      });
    } catch (e) {}
    
    // Strategy 3: Setters
    if (field.__lookupSetter__('value')) {
      field.__lookupSetter__('value').call(field, value);
    }
    
    // Strategy 4: Event storm
    const events = ['input', 'change', 'blur', 'focus', 'keyup', 'keydown', 'click', 'paste'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      field.dispatchEvent(event);
      
      // React
      const reactEvent = new Event(eventType, { bubbles: true });
      reactEvent.simulated = true;
      field.dispatchEvent(reactEvent);
    });
    
    // Strategy 5: Framework hooks
    if (field._valueTracker) field._valueTracker.setValue('');
    if (field.__preactCompatEvn) field.__preactCompatEvn = null;
    if (field._value) field._value = value;
    
    // Strategy 6: jQuery
    if (window.jQuery) {
      window.jQuery(field).val(value).trigger('input').trigger('change').trigger('blur');
    }
    
    // Strategy 7: Angular
    if (field.ngModel) field.ngModel = value;
    
    // Strategy 8: Vue
    if (field.__vue__) field.__vue__.value = value;
    
    await sleep(60);
    field.blur();
    return true;
  } catch (error) {
    console.warn(`⚠️ Extreme fill failed for ${field.name || field.id}:`, error);
    return false;
  }
}

// Fill every checkbox
async function fillEveryCheckbox(data, formType) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
  
  for (const checkbox of checkboxes) {
    const name = (checkbox.name || '').toLowerCase();
    const label = getLabelExtreme(checkbox);
    const context = `${name} ${label}`.toLowerCase();
    
    let shouldCheck = false;
    let shouldUncheck = false;
    
    // Aggressive job application rules
    if (formType === 'jobApplication') {
      const positive = ['agree', 'accept', 'consent', 'certify', 'confirm', 'eligible', 'understand', 'acknowledge', 'yes', 'true', 'on'];
      const negative = ['newsletter', 'spam', 'marketing', 'promo', 'notification', 'advert', 'offer', 'no'];
      
      shouldCheck = positive.some(k => context.includes(k));
      shouldUncheck = negative.some(k => context.includes(k));
    }
    
    // Data-driven
    for (const [key, value] of Object.entries(data)) {
      if (value && context.includes(key.toLowerCase())) {
        shouldCheck = ['yes', 'true', '1', 'agree', 'accept', 'on'].includes(value.toLowerCase());
      }
    }
    
    if (shouldUncheck) {
      checkbox.checked = false;
      checkbox.style.outline = '3px solid #f44336';
    } else if (shouldCheck) {
      checkbox.checked = true;
      triggerEventsAggressive(checkbox);
      checkbox.style.outline = '3px solid #4CAF50';
    }
    
    await sleep(15);
  }
}

// Fill every radio
async function fillEveryRadio(data, formType) {
  const groups = {};
  document.querySelectorAll('input[type="radio"]:not([disabled])').forEach(radio => {
    if (radio.name) groups[radio.name] = [...(groups[radio.name]||[]), radio];
  });
  
  for (const radios of Object.values(groups)) {
    if (radios.length === 0) continue;
    
    let selected = null;
    
    // Form-specific
    if (formType === 'jobApplication') {
      const prefs = ['yes', 'true', 'accept', 'full-time', 'remote', 'immediate', 'available', 'agree'];
      selected = radios.find(r => prefs.some(p => r.value.toLowerCase().includes(p)));
    }
    
    // Data matching
    if (!selected) {
      for (const [key, value] of Object.entries(data)) {
        if (!value) continue;
        selected = radios.find(r => r.value.toLowerCase() === value.toLowerCase());
        if (selected) break;
      }
    }
    
    // Default: first
    if (!selected) selected = radios[0];
    
    if (selected) {
      selected.checked = true;
      triggerEventsAggressive(selected);
      selected.style.outline = '3px solid #FF9800';
    }
    
    await sleep(20);
  }
}

// Aggressive defaults
function getAggressiveDefault(field) {
  const name = (field.name || '').toLowerCase();
  const label = getLabelExtreme(field).toLowerCase();
  
  if (name.includes('country') || label.includes('country')) return SMART_DEFAULTS.country[0];
  if (name.includes('experience') || label.includes('experience')) return SMART_DEFAULTS.experience[0];
  if (name.includes('availability') || label.includes('availability')) return SMART_DEFAULTS.availability[0];
  if (name.includes('salary') || label.includes('salary') || name.includes('compensation')) return SMART_DEFAULTS.salary[0];
  if ((name.includes('type') || name.includes('preference')) && label.includes('work')) return SMART_DEFAULTS.workType[0];
  
  return '';
}

// Trigger events aggressive
function triggerEventsAggressive(element) {
  const events = ['input', 'change', 'blur', 'focus', 'keyup', 'keydown', 'click', 'paste'];
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    
    // React-specific
    const reactEvent = new Event(eventType, { bubbles: true });
    reactEvent.simulated = true;
    element.dispatchEvent(reactEvent);
    
    // jQuery
    if (window.jQuery) {
      window.jQuery(element).trigger(eventType);
    }
  });
}

// Sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Verify all fields
function verifyAllFields() {
  const inputs = document.querySelectorAll('input, textarea, select');
  let filled = 0, total = 0;
  
  inputs.forEach(input => {
    if (input.offsetParent === null) return;
    total++;
    
    const isFilled = input.type === 'radio' || input.type === 'checkbox' 
      ? input.checked 
      : (input.value?.trim().length > 0);
    
    if (isFilled) filled++;
    
    if (!['radio', 'checkbox', 'file'].includes(input.type)) {
      input.style.border = isFilled ? '3px solid #4CAF50' : '3px solid #f44336';
    }
  });
  
  const percent = Math.round((filled/total) * 100);
  console.log(`📊 VERIFICATION: ${percent}% (${filled}/${total})`);
  
  showCompletionPopup(percent, filled, total);
  return { filled, total };
}

// Show completion
function showCompletionPopup(percent, filled, total) {
  document.getElementById('autofill-popup')?.remove();
  
  const popup = document.createElement('div');
  popup.id = 'autofill-popup';
  popup.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${percent >= 80 ? '#4CAF50' : percent >= 50 ? '#FF9800' : '#f44336'};
    color: white; padding: 15px; border-radius: 8px; z-index: 999999;
    font: 14px system-ui; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease; cursor: pointer;
  `;
  
  popup.innerHTML = `<strong>🎯 AutoFill Complete!</strong><br>${percent}% (${filled}/${total} fields)<br><small>Click to dismiss</small>`;
  popup.onclick = () => popup.remove();
  document.body.appendChild(popup);
  
  setTimeout(() => popup.remove(), 6000);
}

// Add animation
if (!document.getElementById('autofill-styles')) {
  const style = document.createElement('style');
  style.id = 'autofill-styles';
  style.textContent = `@keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }`;
  document.head.appendChild(style);
}