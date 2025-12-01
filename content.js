// content.js - AutoFill Pro Content Script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 MESSAGE RECEIVED:', request.action);
  
  if (request.action === 'fillForm') {
    const result = fillAllFields(request.data);
    sendResponse(result);
  } else if (request.action === 'extractFromBrowser') {
    const data = extractFormData();
    sendResponse({ data });
  }
  
  return true; // Keep channel open
});

/**
 * Fill all visible, empty fields with matching data
 */
function fillAllFields(data) {
  const selectors = 'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([disabled]), textarea:not([disabled]), select:not([disabled])';
  const inputs = document.querySelectorAll(selectors);
  
  let filled = 0;
  inputs.forEach(input => {
    if (!isVisible(input) || input.value) return;
    
    const value = findMatch(input, data);
    if (value) {
      setFieldValue(input, value);
      filled++;
    }
  });
  
  // Auto-check relevant checkboxes
  document.querySelectorAll('input[type=checkbox]:not(:checked):not([disabled])').forEach(cb => {
    if (isVisible(cb) && shouldAutoCheck(cb)) {
      cb.checked = true;
      triggerEvents(cb);
      cb.style.outline = '3px solid #4CAF50';
      setTimeout(() => cb.style.outline = '', 2000);
    }
  });
  
  console.log(`✅ FILLED ${filled}/${inputs.length} FIELDS`);
  return { filled, total: inputs.length };
}

/**
 * Extract data from visible form fields
 */
function extractFormData() {
  const selectors = 'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([disabled]), textarea:not([disabled]), select:not([disabled])';
  const inputs = document.querySelectorAll(selectors);
  
  const extracted = {};
  inputs.forEach(input => {
    if (!isVisible(input) || !input.value) return;
    
    const name = (input.name || input.id || '').toLowerCase();
    const label = getLabel(input).toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const context = `${name} ${label} ${placeholder}`;
    
    // Match against field aliases
    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (context.includes(alias.toLowerCase())) {
          extracted[key] = input.value;
          return;
        }
      }
    }
    
    // Type-based detection
    if (input.type === 'email' && !extracted.email) {
      extracted.email = input.value;
    } else if (input.type === 'tel' && !extracted.phone) {
      extracted.phone = input.value;
    }
  });
  
  return extracted;
}

/**
 * Find matching value for a field
 */
function findMatch(field, data) {
  const name = (field.name || field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const context = `${name} ${label} ${placeholder}`;
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    
    const aliases = FIELD_ALIASES[key] || [key];
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      if (context.includes(aliasLower)) return value;
    }
  }
  
  // Type-based fallbacks
  if (field.type === 'email' && data.email) return data.email;
  if (field.type === 'tel' && data.phone) return data.phone;
  if (field.type === 'url' && (data.portfolio || data.linkedin)) return data.portfolio || data.linkedin;
  
  return null;
}

/**
 * Set field value with event triggers for framework compatibility
 */
function setFieldValue(field, value) {
  // Set value multiple ways
  field.value = value;
  field.setAttribute('value', value);
  
  // Trigger change events
  ['input', 'change', 'blur'].forEach(eventType => {
    const event = new Event(eventType, { bubbles: true });
    field.dispatchEvent(event);
  });
  
  // React/Vue compatibility
  const prototype = Object.getPrototypeOf(field);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor && descriptor.set) {
    descriptor.set.call(field, value);
  }
  
  // Visual feedback
  field.style.border = '3px solid #4CAF50';
  field.style.background = '#E8F5E9';
  setTimeout(() => {
    field.style.border = '';
    field.style.background = '';
  }, 2000);
}

/**
 * Get label text for a field
 */
function getLabel(field) {
  // Check associated labels
  if (field.labels && field.labels.length > 0) {
    return field.labels[0].textContent.trim();
  }
  
  // Check label with for attribute
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Check parent label
  const parentLabel = field.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();
  
  // Fallbacks
  return field.placeholder || field.getAttribute('aria-label') || '';
}

/**
 * Check if element is visible
 */
function isVisible(element) {
  return element.offsetParent !== null && 
         !element.disabled && 
         !element.hidden;
}

/**
 * Determine if checkbox should be auto-checked
 */
function shouldAutoCheck(checkbox) {
  const label = getLabel(checkbox).toLowerCase();
  const name = (checkbox.name || checkbox.id || '').toLowerCase();
  const combined = `${label} ${name}`;
  
  return combined.includes('agree') || 
         combined.includes('accept') || 
         combined.includes('terms') || 
         combined.includes('consent') ||
         combined.includes('privacy') ||
         combined.includes('conditions');
}

/**
 * Trigger events on an element
 */
function triggerEvents(element) {
  ['change', 'input', 'blur'].forEach(eventType => {
    const event = new Event(eventType, { bubbles: true });
    element.dispatchEvent(event);
  });
}