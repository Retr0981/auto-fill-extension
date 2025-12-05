// content.js - Enhanced AutoFill Pro Content Script
console.log('🎯 AutoFill Pro Enhanced Content Script loaded');

// Enhanced configuration
const CONFIG = {
  aggressiveMode: true, // Automatically handle required fields
  autoSelectRequired: true,
  booleanKeywords: {
    yes: ['yes', 'y', 'true', 'accept', 'agree', 'i agree', 'i accept', 'consent', 'opt-in', 'opt in', 'subscribe', 'enable', 'on', 'checked'],
    no: ['no', 'n', 'false', 'decline', 'disagree', 'opt-out', 'opt out', 'unsubscribe', 'disable', 'off', 'unchecked']
  },
  dropdownMappings: {
    // Common yes/no dropdowns
    confirm: { 'yes': ['yes', 'y', 'confirm', 'confirmed', 'i confirm'], 'no': ['no', 'n', 'cancel', 'decline'] },
    accept: { 'yes': ['accept', 'accepted', 'i accept', 'agree', 'i agree'], 'no': ['decline', 'reject', 'disagree'] },
    subscribe: { 'yes': ['subscribe', 'yes', 'opt-in'], 'no': ['unsubscribe', 'no', 'opt-out'] },
    // Required field defaults
    requiredDefault: 'yes' // Default answer for required fields when uncertain
  }
};

// State management
let state = {
  isFilling: false,
  filledFields: new Set(),
  requiredFields: new Set(),
  formsProcessed: 0
};

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'smartFill':
          const result = await handleUltimateFill(request.data, request.settings);
          sendResponse(result);
          break;
        case 'ping':
          sendResponse({ status: 'ready', timestamp: Date.now() });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Message handler error:', error);
      sendResponse({ error: error.message, filled: 0 });
    }
  })();
  return true;
});

// Ultimate fill handler
async function handleUltimateFill(profileData, settings = {}) {
  if (state.isFilling) return { error: 'Already filling', filled: 0 };
  
  state.isFilling = true;
  console.log('🚀 Starting ULTIMATE fill mode');
  
  try {
    const forms = document.querySelectorAll('form, [role="form"], .form');
    const standaloneFields = getStandaloneFields();
    
    let totalFilled = 0;
    let requiredFilled = 0;
    let totalRequired = 0;
    
    // Process all forms
    for (const form of forms) {
      const result = await fillFormUltimate(form, profileData);
      totalFilled += result.filled;
      requiredFilled += result.requiredFilled;
      totalRequired += result.totalRequired;
    }
    
    // Process standalone fields
    const standaloneResult = fillStandaloneFieldsUltimate(standaloneFields, profileData);
    totalFilled += standaloneResult.filled;
    
    // Auto-handle consent and required fields
    const consentResult = autoHandleConsentAndRequired();
    totalFilled += consentResult.filled;
    requiredFilled += consentResult.requiredFilled;
    
    state.isFilling = false;
    
    // Show summary notification
    if (totalFilled > 0) {
      showNotification(`✅ Filled ${totalFilled} fields (${requiredFilled}/${totalRequired} required)`);
    }
    
    return {
      success: true,
      filled: totalFilled,
      requiredFilled: requiredFilled,
      totalRequired: totalRequired,
      formsProcessed: forms.length
    };
    
  } catch (error) {
    state.isFilling = false;
    throw error;
  }
}

// Get standalone fields
function getStandaloneFields() {
  const selectors = [
    'input:not([type="hidden"]):not([type="submit"]):not(form input)',
    'textarea:not(form textarea)',
    'select:not(form select)',
    '[contenteditable="true"]:not(form [contenteditable="true"])'
  ];
  return document.querySelectorAll(selectors.join(', '));
}

// Ultimate form filling with required field detection
async function fillFormUltimate(form, profileData) {
  const fields = form.querySelectorAll('input, textarea, select, [contenteditable="true"]');
  const result = { filled: 0, requiredFilled: 0, totalRequired: 0, skipped: 0 };
  
  for (const field of fields) {
    if (!isFieldVisible(field) || state.filledFields.has(field)) continue;
    
    const analysis = analyzeFieldUltimate(field);
    if (analysis.isRequired) result.totalRequired++;
    
    // Try to find a value from profile
    let value = findBestFieldMatch(analysis, profileData);
    
    // If no match and field is required, use intelligent defaults
    if (value === null && analysis.isRequired) {
      value = getIntelligentDefault(analysis);
    }
    
    // For dropdowns with yes/no, handle even if not required (user convenience)
    if (value === null && analysis.isSelect && isYesNoDropdown(field)) {
      value = 'yes'; // Default to yes for convenience
    }
    
    if (value !== null) {
      const success = fillFieldUltimate(field, value, analysis);
      if (success) {
        result.filled++;
        if (analysis.isRequired) result.requiredFilled++;
        state.filledFields.add(field);
        highlightField(field);
      }
    } else if (analysis.isRequired) {
      console.log(`⚠️ Could not fill required field: ${analysis.name}`);
    }
  }
  
  return result;
}

// Analyze field with enhanced required detection
function analyzeFieldUltimate(field) {
  const name = (field.name || field.id || '').toLowerCase();
  const label = getFieldLabel(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const type = field.type || field.tagName.toLowerCase();
  
  // Enhanced required detection
  const isRequired = field.hasAttribute('required') || 
                    field.getAttribute('aria-required') === 'true' ||
                    field.classList.contains('required') ||
                    field.classList.contains('mandatory') ||
                    field.classList.contains('validate-required') ||
                    field.classList.contains('is-required') ||
                    // Check for asterisk in label or nearby text
                    label.includes('*') ||
                    placeholder.includes('*') ||
                    // Check surrounding text for asterisk
                    hasAsteriskNearby(field) ||
                    // Common required field patterns
                    /(required|mandatory|must be filled|cannot be empty)/i.test(label + placeholder);
  
  // Check if it's a yes/no dropdown
  const isYesNo = isYesNoDropdown(field);
  
  return {
    element: field,
    name: name,
    label: label,
    placeholder: placeholder,
    type: type,
    isRequired: isRequired,
    isSelect: type === 'select-one' || type === 'select-multiple',
    isCheckbox: type === 'checkbox',
    isRadio: type === 'radio',
    isYesNo: isYesNo,
    context: name + ' ' + label + ' ' + placeholder
  };
}

// Check if asterisk is near the field
function hasAsteriskNearby(field) {
  try {
    // Check previous sibling
    const prev = field.previousElementSibling;
    if (prev && prev.textContent && prev.textContent.includes('*')) return true;
    
    // Check parent labels
    const parentLabel = field.closest('label');
    if (parentLabel && parentLabel.textContent.includes('*')) return true;
    
    // Check next sibling
    const next = field.nextElementSibling;
    if (next && next.textContent && next.textContent.includes('*')) return true;
    
    // Check for common required indicators in parent
    const parent = field.parentElement;
    if (parent && parent.textContent.includes('*')) return true;
    
    return false;
  } catch (e) {
    return false;
  }
}

// Check if select is yes/no type
function isYesNoDropdown(select) {
  if (!select || select.tagName !== 'SELECT') return false;
  
  const options = Array.from(select.options).map(opt => opt.text.toLowerCase().trim());
  const hasYes = options.some(opt => ['yes', 'y', 'true', 'accept'].includes(opt));
  const hasNo = options.some(opt => ['no', 'n', 'false', 'decline'].includes(opt));
  
  // Also check for common yes/no patterns
  const isBooleanDropdown = hasYes && hasNo;
  const isConfirmDropdown = options.some(opt => 
    ['confirm', 'subscribe', 'agree', 'accept', 'opt-in', 'opt-out'].includes(opt)
  );
  
  return isBooleanDropdown || isConfirmDropdown;
}

// Find best match for field
function findBestFieldMatch(analysis, profileData) {
  let bestScore = 0;
  let bestValue = null;
  
  // Direct field name matching
  for (const [key, value] of Object.entries(profileData)) {
    if (!value) continue;
    
    const score = calculateMatchScore(analysis, key, value);
    if (score > bestScore) {
      bestScore = score;
      bestValue = value;
    }
  }
  
  // Special handling for boolean/yes-no fields
  if (analysis.isYesNo && !bestValue) {
    // Check if profile has boolean preference
    if (profileData.terms === 'true' || profileData.accept === 'true') {
      return 'yes';
    }
  }
  
  return bestScore > 30 ? bestValue : null;
}

// Calculate match score
function calculateMatchScore(analysis, key, value) {
  const keyLower = key.toLowerCase();
  const name = analysis.name;
  const label = analysis.label;
  
  let score = 0;
  
  // Exact name match
  if (name === keyLower) score += 100;
  // Partial name match
  else if (name.includes(keyLower) || keyLower.includes(name)) score += 60;
  
  // Label matching
  if (label.includes(keyLower)) score += 40;
  
  // Type-specific bonuses
  if (analysis.type === 'email' && keyLower === 'email') score += 30;
  if (analysis.type === 'tel' && keyLower === 'phone') score += 30;
  
  // Required field gets bonus
  if (analysis.isRequired) score += 20;
  
  return score;
}

// Get intelligent default for required fields
function getIntelligentDefault(analysis) {
  // For boolean/checkbox fields that are required, default to true (checked)
  if (analysis.isCheckbox) {
    return true; // Check required checkboxes
  }
  
  // For yes/no dropdowns that are required, default to "yes"
  if (analysis.isYesNo) {
    return 'yes';
  }
  
  // For text fields that are required, try common values
  if (analysis.type === 'text') {
    const context = analysis.context;
    if (context.includes('name')) return 'N/A';
    if (context.includes('email')) return 'example@example.com';
    if (context.includes('phone')) return '000-000-0000';
    if (context.includes('city')) return 'Unknown';
    if (context.includes('country')) return 'United States';
  }
  
  // For select fields without a match but required, select first non-empty option
  if (analysis.isSelect) {
    const firstValidOption = Array.from(analysis.element.options).find(opt => 
      opt.value && opt.text.toLowerCase() !== 'select' && opt.text.toLowerCase() !== 'choose'
    );
    if (firstValidOption) return firstValidOption.value;
  }
  
  return null;
}

// Fill field with value
function fillFieldUltimate(field, value, analysis) {
  try {
    const stringValue = String(value).trim();
    
    // Handle checkboxes
    if (analysis.isCheckbox) {
      const shouldCheck = parseBoolean(value);
      if (field.checked !== shouldCheck) {
        field.checked = shouldCheck;
        triggerEvents(field, 'checkbox');
        return true;
      }
      return false;
    }
    
    // Handle radio buttons
    if (analysis.isRadio) {
      const radios = document.querySelectorAll(`input[name="${field.name}"]`);
      for (const radio of radios) {
        if (radio.value.toLowerCase() === stringValue.toLowerCase()) {
          radio.checked = true;
          triggerEvents(radio, 'radio');
          return true;
        }
      }
      return false;
    }
    
    // Handle select dropdowns
    if (analysis.isSelect) {
      return selectOptionUltimate(field, value);
    }
    
    // Handle text inputs and textareas
    if (['text', 'email', 'tel', 'number', 'textarea'].includes(analysis.type)) {
      if (field.value !== stringValue) {
        field.value = stringValue;
        triggerEvents(field, 'text');
        return true;
      }
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Fill error:', error);
    return false;
  }
}

// Ultimate dropdown selection
function selectOptionUltimate(select, value) {
  const stringValue = String(value).toLowerCase().trim();
  const options = Array.from(select.options);
  
  // Remove placeholder options
  const validOptions = options.filter(opt => {
    const text = opt.text.toLowerCase();
    return opt.value && !text.includes('select') && !text.includes('choose') && text !== '';
  });
  
  if (validOptions.length === 0) return false;
  
  // Try exact match
  let match = validOptions.find(opt => 
    opt.value.toLowerCase() === stringValue || opt.text.toLowerCase() === stringValue
  );
  
  // Try contains match
  if (!match) {
    match = validOptions.find(opt => 
      opt.text.toLowerCase().includes(stringValue) || stringValue.includes(opt.text.toLowerCase())
    );
  }
  
  // For yes/no values, try boolean mapping
  if (!match && isYesNoDropdown(select)) {
    const boolValue = parseBoolean(value) ? 'yes' : 'no';
    match = validOptions.find(opt => CONFIG.booleanKeywords[boolValue].includes(opt.text.toLowerCase()));
  }
  
  if (match) {
    select.value = match.value;
    triggerEvents(select, 'select');
    return true;
  }
  
  return false;
}

// Parse boolean value
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  
  const str = String(value).toLowerCase().trim();
  const trueValues = ['true', 'yes', 'y', '1', 'on', 'checked', 'accept', 'agree', 'subscribe', 'enable'];
  const falseValues = ['false', 'no', 'n', '0', 'off', 'unchecked', 'decline', 'disable'];
  
  if (trueValues.some(v => str.includes(v))) return true;
  if (falseValues.some(v => str.includes(v))) return false;
  
  return str.length > 0; // Non-empty strings are truthy
}

// Trigger events on field
function triggerEvents(field, type) {
  const events = {
    checkbox: ['click', 'change', 'input'],
    radio: ['click', 'change', 'input'],
    select: ['change', 'input'],
    text: ['input', 'change', 'focus', 'blur']
  };
  
  (events[type] || ['input', 'change']).forEach(eventType => {
    try {
      field.dispatchEvent(new Event(eventType, { bubbles: true }));
    } catch (e) {}
  });
  
  // Trigger input event with data
  if (typeof InputEvent !== 'undefined') {
    try {
      field.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        data: field.value || ''
      }));
    } catch (e) {}
  }
}

// Fill standalone fields
function fillStandaloneFieldsUltimate(fields, profileData) {
  const result = { filled: 0 };
  
  fields.forEach(field => {
    if (!isFieldVisible(field) || state.filledFields.has(field)) return;
    
    const analysis = analyzeFieldUltimate(field);
    const value = findBestFieldMatch(analysis, profileData);
    
    if (value !== null) {
      if (fillFieldUltimate(field, value, analysis)) {
        result.filled++;
        state.filledFields.add(field);
        highlightField(field);
      }
    }
  });
  
  return result;
}

// Auto-handle consent and required fields
function autoHandleConsentAndRequired() {
  const result = { filled: 0, requiredFilled: 0 };
  
  // Find all unchecked checkboxes near consent language
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (!isFieldVisible(checkbox) || checkbox.checked || state.filledFields.has(checkbox)) return;
    
    const analysis = analyzeFieldUltimate(checkbox);
    if (analysis.isRequired || isConsentCheckbox(checkbox)) {
      checkbox.checked = true;
      triggerEvents(checkbox, 'checkbox');
      result.filled++;
      if (analysis.isRequired) result.requiredFilled++;
      state.filledFields.add(checkbox);
    }
  });
  
  return result;
}

// Check if checkbox is consent-related
function isConsentCheckbox(checkbox) {
  const context = getFieldContext(checkbox);
  const consentPatterns = /(agree|accept|consent|terms|conditions|privacy|policy|newsletter|subscribe|opt.?in|i have read|i understand|i agree)/i;
  return consentPatterns.test(context);
}

// Get field context
function getFieldContext(field) {
  const parts = [
    field.name || '',
    field.id || '',
    field.placeholder || '',
    field.textContent || '',
    field.getAttribute('aria-label') || '',
    field.closest('label')?.textContent || '',
    field.parentElement?.textContent || ''
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// Check if field is visible and fillable
function isFieldVisible(field) {
  try {
    if (field.disabled || field.hidden || field.type === 'hidden') return false;
    
    const style = window.getComputedStyle(field);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    return field.offsetWidth > 0 || field.offsetHeight > 0;
  } catch (e) {
    return false;
  }
}

// Highlight filled field
function highlightField(field) {
  field.classList.add('autofill-highlight');
  setTimeout(() => field.classList.remove('autofill-highlight'), 1500);
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'autofill-notification';
  notification.innerHTML = `
    <div style="background:#4CAF50;color:white;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:sans-serif;font-size:14px;z-index:1000000;position:fixed;top:20px;right:20px;max-width:300px;">
      ${message}
    </div>
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

console.log('✅ Enhanced AutoFill Pro initialized');