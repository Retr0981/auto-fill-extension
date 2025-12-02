// content.js - Enhanced Form Filling Engine
console.log('🚀 AutoFill Pro content script loaded');

// Verify FIELD_ALIASES is available
if (typeof FIELD_ALIASES === 'undefined') {
  console.error('❌ CRITICAL: FIELD_ALIASES not found! Check manifest ordering.');
  var FIELD_ALIASES = {}; // Emergency fallback
}

// Keywords for auto-checking consent boxes
const CONSENT_KEYWORDS = ['agree', 'accept', 'terms', 'consent', 'privacy', 'policy', 'conditions', 'confirm', 'i agree', 'i accept'];

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 MESSAGE RECEIVED:', request.action, request.data);
  
  try {
    if (request.action === 'fillForm') {
      const result = fillAllFields(request.data || {});
      sendResponse(result);
    } else if (request.action === 'extractFromBrowser') {
      const data = extractFormData();
      sendResponse({ data });
    } else if (request.action === 'ping') {
      sendResponse({ status: 'ready' });
    }
  } catch (error) {
    console.error('❌ Message handling error:', error);
    sendResponse({ error: error.message, filled: 0, total: 0 });
  }
  
  return true; // Keep channel open
});

/**
 * Main function to fill all form fields
 */
function fillAllFields(data) {
  console.log('🔍 Starting form fill with data:', data);
  
  // Select ALL interactive form fields INCLUDING checkboxes and radios
  const selectors = `
    input:not([type=button]):not([type=submit]):not([type=reset]):not([type=file]):not([disabled]),
    textarea:not([disabled]),
    select:not([disabled])
  `;
  
  const inputs = document.querySelectorAll(selectors);
  let filled = 0;
  let totalAttempted = 0;
  
  // Process each field
  inputs.forEach(field => {
    if (!isVisible(field)) {
      console.log('👻 Skipping hidden field:', getFieldIdentifier(field));
      return;
    }
    
    totalAttempted++;
    
    // Skip text fields that already have values (but NOT checkboxes/radios)
    const fieldType = field.type || field.tagName.toLowerCase();
    if (fieldType !== 'checkbox' && fieldType !== 'radio' && field.value?.trim()) {
      console.log('⏭️ Skipping pre-filled field:', getFieldIdentifier(field));
      return;
    }
    
    // Find matching value from profile data
    const matchResult = findMatch(field, data);
    
    if (matchResult !== null && matchResult !== undefined) {
      console.log('✅ Filling:', getFieldIdentifier(field), '→', matchResult);
      
      try {
        setFieldValue(field, matchResult);
        filled++;
      } catch (error) {
        console.error('❌ Failed to set value for', getFieldIdentifier(field), error);
      }
    }
  });
  
  // Auto-check consent checkboxes that weren't explicitly set
  autoCheckConsentBoxes();
  
  console.log(`✅ FILLED ${filled}/${totalAttempted} fields (found: ${inputs.length})`);
  return { filled, total: totalAttempted, found: inputs.length };
}

function getFieldIdentifier(field) {
  return `${field.tagName.toLowerCase()}[${field.type || 'text'}]${field.name ? `[name="${field.name}"]` : ''}${field.id ? `#${field.id}` : ''}`;
}

/**
 * Finds matching value for a field from profile data
 */
function findMatch(field, data) {
  const context = getFieldContext(field);
  const fieldType = field.type || field.tagName.toLowerCase();
  
  // Try direct key matching first
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') continue;
    
    const aliases = FIELD_ALIASES[key] || [key];
    
    // Check if this field matches any alias
    for (const alias of aliases) {
      if (context.includes(alias.toLowerCase())) {
        console.log(`🔎 Match: ${alias} → ${key} = ${value}`);
        return value;
      }
    }
  }
  
  // Type-based fallbacks
  if (fieldType === 'email' && data.email) return data.email;
  if (fieldType === 'tel' && data.phone) return data.phone;
  
  return null;
}

/**
 * Get searchable context for a field
 */
function getFieldContext(field) {
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const ariaLabel = (field.getAttribute('aria-label') || '').toLowerCase();
  
  return `${name} ${id} ${label} ${placeholder} ${ariaLabel}`.trim();
}

/**
 * Enhanced field value setter that handles all field types
 */
function setFieldValue(field, value) {
  const fieldType = field.type || field.tagName.toLowerCase();
  const stringValue = String(value);
  
  // Visual feedback
  field.style.outline = '3px solid #4CAF50';
  field.style.background = 'rgba(76, 175, 80, 0.1)';
  setTimeout(() => {
    field.style.outline = '';
    field.style.background = '';
  }, 1500);
  
  try {
    switch (fieldType) {
      case 'checkbox':
        // Accept boolean or string values
        const shouldCheck = typeof value === 'boolean' 
          ? value 
          : ['true', 'yes', '1', 'on', 'checked'].includes(stringValue.toLowerCase());
        
        field.checked = shouldCheck;
        console.log(`☑️ Checkbox ${field.name || field.id} = ${shouldCheck}`);
        break;
        
      case 'radio':
        // Find the specific radio button that matches the value
        const radioGroup = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
        const targetRadio = Array.from(radioGroup).find(radio => {
          const radioValue = radio.value.toLowerCase();
          const radioId = radio.id.toLowerCase();
          const radioLabel = getLabel(radio).toLowerCase();
          return radioValue === stringValue.toLowerCase() || 
                 radioId === stringValue.toLowerCase() ||
                 radioLabel === stringValue.toLowerCase();
        });
        
        if (targetRadio) {
          targetRadio.checked = true;
          console.log(`🔘 Radio ${field.name} = ${targetRadio.value}`);
        } else {
          console.warn(`⚠️ No matching radio button for value: ${value}`);
          return; // Don't trigger events if no match
        }
        break;
        
      case 'select-one':
      case 'select-multiple':
        // Find matching option
        const options = Array.from(field.options || []);
        const exactMatch = options.find(opt => 
          opt.value.toLowerCase() === stringValue.toLowerCase() ||
          opt.text.toLowerCase() === stringValue.toLowerCase()
        );
        
        if (exactMatch) {
          field.value = exactMatch.value;
          console.log(`📋 Select ${field.name} = ${exactMatch.value}`);
        } else {
          // Try partial match
          const partialMatch = options.find(opt => 
            stringValue.toLowerCase().includes(opt.value.toLowerCase()) ||
            opt.text.toLowerCase().includes(stringValue.toLowerCase())
          );
          
          if (partialMatch) {
            field.value = partialMatch.value;
            console.log(`📋 Select ${field.name} = ${partialMatch.value} (partial match)`);
          } else {
            console.warn(`⚠️ No matching option for: ${value}`);
          }
        }
        break;
        
      default:
        // Text, email, tel, textarea, etc.
        field.value = stringValue;
        field.setAttribute('value', stringValue);
        console.log(`📝 Field ${field.name || field.id} = ${stringValue}`);
    }
    
    // Trigger events for framework compatibility
    triggerEvents(field, fieldType);
    
  } catch (error) {
    console.error('❌ Error setting field value:', error);
    throw error;
  }
}

/**
 * Trigger proper events based on field type
 */
function triggerEvents(field, fieldType) {
  const eventTypes = [];
  
  switch (fieldType) {
    case 'checkbox':
    case 'radio':
      eventTypes.push('change', 'click', 'input');
      break;
    case 'select-one':
    case 'select-multiple':
      eventTypes.push('change', 'input');
      break;
    default:
      eventTypes.push('input', 'change', 'blur');
  }
  
  // Dispatch events
  eventTypes.forEach(eventType => {
    try {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      field.dispatchEvent(event);
      
      // Special InputEvent for 'input'
      if (eventType === 'input' && typeof InputEvent !== 'undefined') {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: field.value || '',
          inputType: 'insertText'
        });
        field.dispatchEvent(inputEvent);
      }
    } catch (e) {
      console.warn(`⚠️ Could not dispatch ${eventType}:`, e);
    }
  });
  
  // Framework setter triggers
  try {
    const proto = Object.getPrototypeOf(field);
    
    if (fieldType !== 'checkbox' && fieldType !== 'radio') {
      const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (valueSetter) valueSetter.call(field, field.value);
    } else {
      const checkedSetter = Object.getOwnPropertyDescriptor(proto, 'checked')?.set;
      if (checkedSetter) checkedSetter.call(field, field.checked);
    }
  } catch (e) {
    console.warn('⚠️ Framework setter failed:', e);
  }
}

/**
 * Get label text for a field
 */
function getLabel(field) {
  try {
    if (field.labels?.[0]) return field.labels[0].textContent.trim();
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim();
    }
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    return field.placeholder || field.getAttribute('aria-label') || '';
  } catch (e) {
    return '';
  }
}

/**
 * Check if element is visible
 */
function isVisible(element) {
  try {
    if (element.offsetParent === null) return false;
    if (element.disabled) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  } catch (e) {
    return false;
  }
}

/**
 * Auto-check consent checkboxes
 */
function autoCheckConsentBoxes() {
  document.querySelectorAll('input[type=checkbox]:not([disabled])').forEach(cb => {
    if (!isVisible(cb) || cb.checked) return;
    
    const context = getFieldContext(cb);
    const isConsent = CONSENT_KEYWORDS.some(word => context.includes(word));
    
    if (isConsent) {
      cb.checked = true;
      triggerEvents(cb, 'checkbox');
      console.log(`☑️ Auto-checked consent: ${cb.name || cb.id}`);
    }
  });
}

/**
 * Extract form data for learning
 */
function extractFormData() {
  const inputs = document.querySelectorAll('input, textarea, select');
  const extracted = {};
  
  inputs.forEach(input => {
    if (!isVisible(input) || !input.value?.trim()) return;
    
    const context = getFieldContext(input);
    const value = input.value.trim();
    
    if (value.length < 2 || value.length > 100) return;
    
    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (context.includes(alias.toLowerCase())) {
          extracted[key] = value;
          return;
        }
      }
    }
  });
  
  console.log('📤 Extracted data:', extracted);
  return extracted;
}