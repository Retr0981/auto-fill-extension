// AutoFill Pro v6.0 - Intelligent Form Filler
console.log('🎯 AutoFill Pro v6.0 Content Script Loaded');

// Import configuration (loaded via manifest)
let FIELD_ALIASES, VALUE_MAPPINGS, REQUIRED_INDICATORS;

// State management
const state = {
  isFilling: false,
  filledFields: new Set(),
  detectedForms: [],
  config: {
    highlightFilled: true,
    showNotifications: true,
    autoCheckConsent: true,
    autoSelectRequired: true,
    requiredBonus: 30,
    minScoreThreshold: 25,
    requiredMinScore: 15
  }
};

// Initialize configuration from window
function initializeConfig() {
  FIELD_ALIASES = window.FIELD_ALIASES || FIELD_ALIASES;
  VALUE_MAPPINGS = window.VALUE_MAPPINGS || VALUE_MAPPINGS;
  REQUIRED_INDICATORS = window.REQUIRED_INDICATORS || REQUIRED_INDICATORS;
}

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    'smartFill': () => handleSmartFill(request.data, request.settings, sendResponse),
    'ping': () => sendResponse({ status: 'ready', version: '6.0' }),
    'extractFromBrowser': () => handleExtractData(sendResponse)
  };
  
  const handler = handlers[request.action];
  if (handler) {
    handler();
    return true;
  }
  sendResponse({ error: 'Unknown action' });
});

// Smart fill orchestrator
async function handleSmartFill(profileData, settings, sendResponse) {
  if (state.isFilling) {
    sendResponse({ error: 'Already filling', filled: 0 });
    return;
  }
  
  state.isFilling = true;
  state.filledFields.clear();
  
  try {
    // Update configuration
    Object.assign(state.config, settings);
    
    // Detect all forms and standalone fields
    const forms = detectForms();
    const standaloneFields = detectStandaloneFields();
    
    let totalFilled = 0;
    let totalFields = 0;
    
    // Process forms
    for (const form of forms) {
      const result = fillForm(form, profileData);
      totalFilled += result.filled;
      totalFields += result.total;
    }
    
    // Process standalone fields
    const standaloneResult = fillFields(standaloneFields, profileData);
    totalFilled += standaloneResult.filled;
    totalFields += standaloneResult.total;
    
    // Show notification
    if (state.config.showNotifications && totalFilled > 0) {
      showNotification(totalFilled, forms.length);
    }
    
    sendResponse({
      success: true,
      filled: totalFilled,
      totalFields: totalFields,
      formsProcessed: forms.length
    });
    
  } catch (error) {
    console.error('❌ Smart fill error:', error);
    sendResponse({ error: error.message, filled: 0 });
  } finally {
    state.isFilling = false;
  }
}

// Form detection
function detectForms() {
  const selectors = [
    'form',
    '[role="form"]',
    '.form',
    '.application-form',
    '.registration-form',
    '.signup-form'
  ];
  
  const forms = [];
  const seen = new Set();
  
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach(form => {
      if (!seen.has(form)) {
        forms.push(form);
        seen.add(form);
      }
    });
  }
  
  return forms;
}

// Standalone field detection
function detectStandaloneFields() {
  return Array.from(document.querySelectorAll(`
    input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not(form input),
    textarea:not(form textarea),
    select:not(form select)
  `)).filter(isFieldVisible);
}

// Main form filling logic
function fillForm(form, profileData) {
  const fields = getFillableFields(form);
  const requiredFields = fields.filter(field => isRequiredField(field));
  const optionalFields = fields.filter(field => !isRequiredField(field));
  
  console.log(`📋 Form: ${fields.length} fields (${requiredFields.length} required)`);
  
  const result = { filled: 0, total: fields.length };
  
  // Fill required fields first with higher priority
  for (const field of requiredFields) {
    if (fillField(field, profileData)) {
      result.filled++;
    }
  }
  
  // Then fill optional fields
  for (const field of optionalFields) {
    if (fillField(field, profileData)) {
      result.filled++;
    }
  }
  
  // Auto-handle consent boxes if enabled
  if (state.config.autoCheckConsent) {
    autoHandleConsentBoxes(form);
  }
  
  return result;
}

// Fill multiple fields
function fillFields(fields, profileData) {
  const result = { filled: 0, total: fields.length };
  
  for (const field of fields) {
    if (fillField(field, profileData)) {
      result.filled++;
    }
  }
  
  return result;
}

// Individual field filling with intelligent required handling
function fillField(field, profileData) {
  if (state.filledFields.has(field) || !isFieldVisible(field)) {
    return false;
  }
  
  const analysis = analyzeField(field);
  let value = findBestMatch(analysis, profileData);
  
  // Special handling for required fields
  if (analysis.isRequired) {
    console.log(`🔴 Required field: ${analysis.name} (${analysis.type})`);
    
    // If no profile match found, use intelligent defaults
    if (value === null) {
      value = getDefaultForRequiredField(analysis);
    }
    
    // For required boolean/dropdown fields, ensure we have a value
    if (value !== null && (analysis.isSelect || analysis.isCheckbox || analysis.isRadio)) {
      value = ensureValidSelection(analysis, value);
    }
  }
  
  if (value !== null) {
    const success = setFieldValue(field, value, analysis);
    if (success) {
      state.filledFields.add(field);
      if (state.config.highlightFilled) {
        highlightField(field);
      }
      return true;
    }
  }
  
  return false;
}

// Intelligent default values for required fields
function getDefaultForRequiredField(analysis) {
  // For boolean/checkbox fields that are required, default to true (agree)
  if (analysis.isCheckbox) {
    const context = analysis.context;
    if (REQUIRED_INDICATORS.some(ind => context.includes(ind)) ||
        context.includes('agree') || context.includes('accept') ||
        context.includes('terms') || context.includes('conditions')) {
      console.log(`✅ Auto-agreeing to required: ${analysis.name}`);
      return true;
    }
  }
  
  // For required dropdowns with yes/no, default to "yes"
  if (analysis.isSelect) {
    const options = Array.from(analysis.element.options).map(opt => opt.text.toLowerCase());
    if (options.includes('yes') && !options.includes('no')) {
      console.log(`✅ Auto-selecting "yes" for required: ${analysis.name}`);
      return 'yes';
    }
    if (options.includes('true') && !options.includes('false')) {
      console.log(`✅ Auto-selecting "true" for required: ${analysis.name}`);
      return 'true';
    }
  }
  
  return null;
}

// Ensure valid selection for dropdowns
function ensureValidSelection(analysis, value) {
  if (!analysis.isSelect) return value;
  
  const select = analysis.element;
  const options = Array.from(select.options).map(opt => ({
    value: opt.value.toLowerCase(),
    text: opt.text.toLowerCase()
  }));
  
  const stringValue = String(value).toLowerCase();
  
  // Find exact match
  const match = options.find(opt => 
    opt.value === stringValue || opt.text === stringValue ||
    opt.value.includes(stringValue) || opt.text.includes(stringValue)
  );
  
  if (match) {
    return match.value || match.text;
  }
  
  // For boolean values, try mapped options
  if (typeof value === 'boolean') {
    const target = value ? 'yes' : 'no';
    const booleanMatch = options.find(opt => 
      VALUE_MAPPINGS.boolean.true.includes(opt.text) || 
      VALUE_MAPPINGS.boolean.true.includes(opt.value)
    );
    if (booleanMatch) {
      return booleanMatch.value || booleanMatch.text;
    }
  }
  
  return value;
}

// Field analysis
function analyzeField(field) {
  const type = field.type || field.tagName.toLowerCase();
  const name = (field.name || field.id || '').toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const label = getFieldLabel(field).toLowerCase();
  const ariaLabel = (field.getAttribute('aria-label') || '').toLowerCase();
  
  // Check for required indicators (multiple methods)
  const isRequired = (
    field.hasAttribute('required') ||
    field.getAttribute('aria-required') === 'true' ||
    field.classList.contains('required') ||
    field.classList.contains('mandatory') ||
    REQUIRED_INDICATORS.some(ind => 
      label.includes(ind) || 
      placeholder.includes(ind) ||
      ariaLabel.includes(ind) ||
      name.includes(ind.replace(/\W/g, ''))
    ) ||
    // Check for asterisk in label text or nearby
    (label.includes('*') || placeholder.includes('*') || ariaLabel.includes('*')) ||
    // Check parent labels for asterisk
    hasAsteriskInLabel(field)
  );
  
  return {
    element: field,
    type: type,
    name: name,
    label: label,
    placeholder: placeholder,
    context: [name, label, placeholder, ariaLabel].join(' '),
    isRequired: isRequired,
    isSelect: type === 'select-one' || type === 'select-multiple',
    isCheckbox: type === 'checkbox',
    isRadio: type === 'radio',
    isText: ['text', 'email', 'tel', 'url', 'number', 'date'].includes(type)
  };
}

// Check if field's label contains an asterisk
function hasAsteriskInLabel(field) {
  try {
    const label = field.closest('label');
    if (label && label.textContent.includes('*')) return true;
    
    const labelFor = field.id && document.querySelector(`label[for="${field.id}"]`);
    if (labelFor && labelFor.textContent.includes('*')) return true;
    
    return false;
  } catch (e) {
    return false;
  }
}

// Find best match for a field
function findBestMatch(analysis, profileData) {
  let bestScore = 0;
  let bestValue = null;
  
  for (const [key, value] of Object.entries(profileData)) {
    if (!value && value !== false && value !== 0) continue;
    
    let score = 0;
    const aliases = FIELD_ALIASES[key] || [key];
    
    // Exact name match (highest priority)
    if (aliases.some(alias => analysis.name === alias.toLowerCase())) {
      score = 100;
    }
    // Partial name match
    else if (aliases.some(alias => analysis.name.includes(alias.toLowerCase()))) {
      score = 60;
    }
    // Context match
    else if (aliases.some(alias => analysis.context.includes(alias.toLowerCase()))) {
      score = 40;
    }
    
    // Bonus for required fields
    if (analysis.isRequired) {
      score += state.config.requiredBonus;
    }
    
    // Type-specific bonuses
    if (analysis.type === 'email' && key === 'email') score += 20;
    if (analysis.type === 'tel' && key === 'phone') score += 20;
    
    if (score > bestScore && score >= state.config.minScoreThreshold) {
      bestScore = score;
      bestValue = value;
    }
  }
  
  return bestValue;
}

// Set field value with proper event triggering
function setFieldValue(field, value, analysis) {
  try {
    const stringValue = String(value).trim();
    
    switch (analysis.type) {
      case 'checkbox':
        const shouldCheck = Boolean(value);
        if (field.checked !== shouldCheck) {
          field.checked = shouldCheck;
          triggerEvents(field, ['click', 'change']);
          return true;
        }
        break;
        
      case 'radio':
        return handleRadio(field, value);
        
      case 'select-one':
      case 'select-multiple':
        return handleSelect(field, value);
        
      default:
        if (field.value !== stringValue) {
          field.value = stringValue;
          triggerEvents(field, ['input', 'change']);
          return true;
        }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Set field value error:', error);
    return false;
  }
}

// Enhanced select handling for yes/no and required fields
function handleSelect(select, value) {
  const options = Array.from(select.options);
  const stringValue = String(value).toLowerCase();
  
  // Try multiple matching strategies
  const strategies = [
    // Exact match
    () => options.find(opt => opt.value.toLowerCase() === stringValue || opt.text.toLowerCase() === stringValue),
    // Contains
    () => options.find(opt => opt.value.toLowerCase().includes(stringValue) || opt.text.toLowerCase().includes(stringValue)),
    // Boolean mapping for yes/no
    () => {
      const isTrue = VALUE_MAPPINGS.boolean.true.some(v => v === stringValue);
      if (isTrue) {
        return options.find(opt => 
          VALUE_MAPPINGS.boolean.true.includes(opt.text.toLowerCase()) ||
          opt.value.toLowerCase() === 'yes' || opt.text.toLowerCase() === 'yes'
        );
      }
      return null;
    }
  ];
  
  for (const strategy of strategies) {
    const match = strategy();
    if (match) {
      select.value = match.value;
      triggerEvents(select, ['change']);
      return true;
    }
  }
  
  return false;
}

// Radio button handling
function handleRadio(radio, value) {
  if (radio.checked) return false;
  
  const name = radio.name;
  const group = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
  const stringValue = String(value).toLowerCase();
  
  for (const option of group) {
    if (option.value.toLowerCase() === stringValue ||
        option.id.toLowerCase() === stringValue ||
        getFieldLabel(option).toLowerCase() === stringValue) {
      option.checked = true;
      triggerEvents(option, ['click', 'change']);
      return true;
    }
  }
  
  return false;
}

// Auto-handle consent boxes (checkboxes that need to be checked)
function autoHandleConsentBoxes(form) {
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  
  for (const checkbox of checkboxes) {
    if (checkbox.checked || !isFieldVisible(checkbox)) continue;
    
    const label = getFieldLabel(checkbox).toLowerCase();
    const isConsent = /agree|accept|terms|conditions|privacy|consent|i have read|i understand/i.test(label);
    const isRequired = isRequiredField(checkbox);
    
    // Always check required consent boxes
    if (isConsent && isRequired) {
      console.log(`✅ Auto-checking required consent: ${checkbox.name}`);
      checkbox.checked = true;
      triggerEvents(checkbox, ['click', 'change']);
      highlightField(checkbox);
    }
  }
}

// Get field label with fallback methods
function getFieldLabel(field) {
  try {
    // Method 1: label for=""
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim();
    }
    
    // Method 2: parent label
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    // Method 3: aria-labelledby
    const labelledBy = field.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent.trim();
    }
    
    // Method 4: aria-label
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    
    // Method 5: placeholder
    if (field.placeholder) return field.placeholder.trim();
  } catch (e) {}
  
  return '';
}

// Check if field is visible and fillable
function isFieldVisible(field) {
  try {
    if (field.disabled || field.hidden || field.type === 'hidden') return false;
    if (field.style.display === 'none' || field.style.visibility === 'hidden') return false;
    
    const style = window.getComputedStyle(field);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    return field.offsetWidth > 0 || field.offsetHeight > 0;
  } catch (e) {
    return false;
  }
}

// Check if field is required
function isRequiredField(field) {
  const analysis = analyzeField(field);
  return analysis.isRequired;
}

// Get all fillable fields from a form
function getFillableFields(form) {
  return Array.from(form.querySelectorAll(`
    input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]),
    textarea,
    select
  `)).filter(isFieldVisible);
}

// Trigger DOM events
function triggerEvents(field, events) {
  events.forEach(eventType => {
    try {
      field.dispatchEvent(new Event(eventType, { bubbles: true }));
    } catch (e) {}
  });
}

// Highlight filled field
function highlightField(field) {
  field.classList.add('autofill-highlight');
  if (isRequiredField(field)) {
    field.classList.add('autofill-required');
  }
  
  setTimeout(() => {
    field.classList.remove('autofill-highlight');
  }, 2000);
}

// Show success notification
function showNotification(filledCount, formCount) {
  const notification = document.createElement('div');
  notification.className = 'autofill-notification';
  notification.innerHTML = `
    <div class="autofill-notification__icon">✅</div>
    <div>
      <strong>AutoFill Pro</strong><br>
      Filled ${filledCount} field${filledCount !== 1 ? 's' : ''} in ${formCount} form${formCount !== 1 ? 's' : ''}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Data extraction for browser extraction feature
function handleExtractData(sendResponse) {
  const extracted = {};
  const inputs = document.querySelectorAll('input, textarea, select');
  
  const patterns = {
    email: /email|e.?mail/i,
    phone: /phone|mobile|tel|cell/i,
    firstName: /first.?name|fname|given.?name/i,
    lastName: /last.?name|lname|surname/i,
    company: /company|organization|employer/i,
    jobTitle: /title|position|role|occupation/i
  };
  
  inputs.forEach(input => {
    if (!input.value || !isFieldVisible(input)) return;
    
    const label = getFieldLabel(input).toLowerCase();
    const name = (input.name || '').toLowerCase();
    const context = `${label} ${name}`;
    
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(context) && !extracted[key]) {
        extracted[key] = input.value.trim();
        break;
      }
    }
  });
  
  sendResponse({ data: extracted });
}

// Initialize
initializeConfig();
console.log('✅ AutoFill Pro content script initialized with required field detection');