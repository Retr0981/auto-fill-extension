// content.js - Universal Form Filling Engine
console.log('🎯 AutoFill Pro: Content script injected successfully');

// Emergency fallback if config fails to load
if (typeof FIELD_ALIASES === 'undefined') {
  console.error('❌ CRITICAL: FIELD_ALIASES not loaded! Check manifest script order.');
  const FIELD_ALIASES = {};
}

// Message listener with comprehensive error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  try {
    switch (request.action) {
      case 'fillForm':
        const result = fillAllFields(request.data || {});
        sendResponse(result);
        break;
        
      case 'extractFromBrowser':
        sendResponse({ data: extractFormData() });
        break;
        
      case 'ping':
        sendResponse({ status: 'ready', timestamp: Date.now() });
        break;
        
      default:
        console.warn('⚠️ Unknown action:', request.action);
        sendResponse({ error: 'Unknown action', filled: 0 });
    }
  } catch (error) {
    console.error('❌ Message handler error:', error);
    sendResponse({ error: error.message, filled: 0, total: 0 });
  }
  
  return true; // Keep channel open for async
});

/**
 * Main form filling orchestrator
 */
function fillAllFields(profileData) {
  console.log('🔍 Starting intelligent form fill...');
  console.log('📦 Profile data:', profileData);
  
  const startTime = performance.now();
  
  // Select ALL form controls (including radios and checkboxes)
  const selectors = `
    input:not([type=button]):not([type=submit]):not([type=reset]):not([type=file]):not([type=hidden]):not([disabled]),
    textarea:not([disabled]),
    select:not([disabled])
  `;
  
  const fields = document.querySelectorAll(selectors);
  console.log(`📋 Found ${fields.length} potential fields`);
  
  let filledCount = 0;
  let skippedCount = 0;
  
  fields.forEach(field => {
    if (!isVisible(field)) {
      skippedCount++;
      return;
    }
    
    const fieldType = field.type || field.tagName.toLowerCase();
    const identifier = getFieldIdentifier(field);
    
    // Skip pre-filled text fields but not checkboxes/radios
    if (fieldType !== 'checkbox' && fieldType !== 'radio' && field.value?.trim()) {
      console.log(`⏭️ Skipping pre-filled: ${identifier}`);
      skippedCount++;
      return;
    }
    
    // Find matching profile value
    const matchedValue = findMatch(field, profileData);
    
    if (matchedValue !== null && matchedValue !== undefined) {
      try {
        setFieldValue(field, matchedValue);
        filledCount++;
        console.log(`✅ Filled: ${identifier} = ${matchedValue}`);
      } catch (error) {
        console.error(`❌ Failed to fill ${identifier}:`, error);
      }
    }
  });
  
  // Auto-check consent boxes as fallback
  autoCheckConsentBoxes();
  
  const duration = (performance.now() - startTime).toFixed(2);
  console.log(`🏁 Fill complete: ${filledCount} filled, ${skippedCount} skipped in ${duration}ms`);
  
  return {
    filled: filledCount,
    total: fields.length,
    skipped: skippedCount,
    duration: duration
  };
}

/**
 * Get field identifier for logging
 */
function getFieldIdentifier(field) {
  const tag = field.tagName.toLowerCase();
  const type = field.type ? `[${field.type}]` : '';
  const name = field.name ? `[name="${field.name}"]` : '';
  const id = field.id ? `#${field.id}` : '';
  return `${tag}${type}${name}${id}`;
}

/**
 * Find matching profile value for a field
 */
function findMatch(field, data) {
  const context = getFieldContext(field);
  const fieldType = field.type || field.tagName.toLowerCase();
  
  // 1. Direct alias matching
  for (const [key, value] of Object.entries(data)) {
    if (!value && value !== false) continue; // Allow false for checkboxes
    
    const aliases = FIELD_ALIASES[key] || [key];
    
    for (const alias of aliases) {
      if (context.includes(alias.toLowerCase())) {
        console.log(`🔎 Matched: "${alias}" → ${key} = ${value}`);
        return value;
      }
    }
  }
  
  // 2. Type-based fallbacks
  if (fieldType === 'email' && data.email) return data.email;
  if (fieldType === 'tel' && data.phone) return data.phone;
  if (fieldType === 'url' && data.website) return data.website;
  if (fieldType === 'date' && data.birthDate) return data.birthDate;
  
  return null;
}

/**
 * Get searchable context string
 */
function getFieldContext(field) {
  return [
    field.name || '',
    field.id || '',
    field.className || '',
    field.placeholder || '',
    getLabel(field),
    field.getAttribute('aria-label') || '',
    field.getAttribute('aria-labelledby') || '',
    field.getAttribute('data-testid') || '',
    field.getAttribute('autocomplete') || ''
  ].join(' ').toLowerCase();
}

/**
 * Universal field value setter
 */
function setFieldValue(field, value) {
  const fieldType = field.type || field.tagName.toLowerCase();
  const stringValue = String(value);
  
  // Apply visual feedback
  field.style.outline = '3px solid #4CAF50';
  field.style.background = 'rgba(76, 175, 80, 0.1)';
  field.style.transition = 'all 0.3s ease';
  
  setTimeout(() => {
    field.style.outline = '';
    field.style.background = '';
  }, 2000);
  
  try {
    switch (fieldType) {
      case 'checkbox':
        const shouldCheck = typeof value === 'boolean' 
          ? value 
          : ['true', 'yes', '1', 'on', 'checked', 'agree', 'accept'].includes(stringValue.toLowerCase());
        
        field.checked = shouldCheck;
        console.log(`☑️ Checkbox: ${field.name || field.id} = ${shouldCheck}`);
        break;
        
      case 'radio':
        // Find matching radio in the same group
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
          console.log(`🔘 Radio selected: ${field.name} = ${targetRadio.value}`);
        } else {
          console.warn(`⚠️ No radio match for "${value}" in group "${field.name}"`);
          return; // Don't trigger events
        }
        break;
        
      case 'select-one':
      case 'select-multiple':
        handleSelect(field, stringValue);
        break;
        
      default:
        // Text, email, tel, textarea, etc.
        field.value = stringValue;
        field.setAttribute('value', stringValue);
        console.log(`📝 Field: ${field.name || field.id} = "${stringValue}"`);
    }
    
    // Trigger framework events
    triggerEvents(field, fieldType);
    
  } catch (error) {
    console.error(`❌ Value setter failed for ${getFieldIdentifier(field)}:`, error);
    throw error;
  }
}

/**
 * Handle select dropdowns intelligently
 */
function handleSelect(select, targetValue) {
  const options = Array.from(select.options || []);
  const targetLower = targetValue.toLowerCase();
  
  // Exact match
  const exactMatch = options.find(opt => 
    opt.value.toLowerCase() === targetLower || opt.text.toLowerCase() === targetLower
  );
  
  if (exactMatch) {
    select.value = exactMatch.value;
    console.log(`📋 Select: ${select.name} = ${exactMatch.text}`);
    return;
  }
  
  // Partial match
  const partialMatch = options.find(opt => 
    targetLower.includes(opt.value.toLowerCase()) ||
    opt.text.toLowerCase().includes(targetLower) ||
    opt.value.toLowerCase().includes(targetLower) ||
    targetLower.includes(opt.text.toLowerCase())
  );
  
  if (partialMatch) {
    select.value = partialMatch.value;
    console.log(`📋 Select (partial): ${select.name} = ${partialMatch.text}`);
  } else {
    console.warn(`⚠️ No select option match for "${targetValue}"`);
  }
}

/**
 * Trigger all necessary events
 */
function triggerEvents(field, fieldType) {
  const events = [];
  
  switch (fieldType) {
    case 'checkbox':
    case 'radio':
      events.push('click', 'change', 'input');
      break;
    case 'select-one':
    case 'select-multiple':
      events.push('change', 'input');
      break;
    default:
      events.push('input', 'change', 'blur');
  }
  
  events.forEach(eventType => {
    try {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      field.dispatchEvent(event);
      
      // Special input event for frameworks
      if (eventType === 'input' && typeof InputEvent !== 'undefined') {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: false,
          data: field.value || '',
          inputType: 'insertText'
        });
        field.dispatchEvent(inputEvent);
      }
    } catch (e) {
      console.warn(`⚠️ Event dispatch failed: ${eventType}`, e);
    }
  });
  
  // Framework setters
  try {
    const proto = Object.getPrototypeOf(field);
    
    if (fieldType === 'checkbox' || fieldType === 'radio') {
      const checkedSetter = Object.getOwnPropertyDescriptor(proto, 'checked')?.set;
      if (checkedSetter) checkedSetter.call(field, field.checked);
    } else {
      const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (valueSetter) valueSetter.call(field, field.value);
    }
  } catch (e) {
    console.warn('⚠️ Framework setter failed:', e);
  }
}

/**
 * Get label text with fallback
 */
function getLabel(field) {
  try {
    // Standard label association
    if (field.labels?.[0]) return field.labels[0].textContent.trim();
    
    // For attribute
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim();
    }
    
    // Parent label
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    // ARIA
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    
    const labelledBy = field.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent.trim();
    }
    
    return field.placeholder || '';
  } catch (e) {
    return '';
  }
}

/**
 * Robust visibility check
 */
function isVisible(element) {
  try {
    if (!element.offsetParent) return false;
    if (element.disabled) return false;
    if (element.hidden) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  } catch (e) {
    return false;
  }
}

/**
 * Auto-check consent boxes
 */
function autoCheckConsentBoxes() {
  const consentWords = ['agree', 'accept', 'terms', 'consent', 'privacy', 'policy', 'conditions', 'confirm', 'legal'];
  
  document.querySelectorAll('input[type="checkbox"]:not([disabled])').forEach(cb => {
    if (!isVisible(cb) || cb.checked) return;
    
    const context = getFieldContext(cb);
    const isConsent = consentWords.some(word => context.includes(word));
    
    if (isConsent) {
      cb.checked = true;
      triggerEvents(cb, 'checkbox');
      console.log(`☑️ Auto-consent: ${cb.name || cb.id}`);
    }
  });
}

/**
 * Extract data from page for learning
 */
function extractFormData() {
  const inputs = document.querySelectorAll('input, textarea, select');
  const extracted = {};
  
  inputs.forEach(input => {
    if (!isVisible(input) || !input.value?.trim()) return;
    
    const value = input.value.trim();
    if (value.length < 2 || value.length > 150) return;
    
    const context = getFieldContext(input);
    
    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (context.includes(alias.toLowerCase())) {
          extracted[key] = value;
          break;
        }
      }
    }
  });
  
  console.log('📤 Extracted browser data:', extracted);
  return extracted;
}