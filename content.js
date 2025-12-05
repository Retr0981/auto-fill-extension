// AutoFill Pro v6.1 - Content Script with Built-in Configuration
console.log('🎯 AutoFill Pro v6.1 Content Script Loaded');

// =========================================
// CONFIGURATION (Consolidated to avoid loading issues)
// =========================================
const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name', 'firstname', 'fname', 'givenName', 'name_first', 'first', 'forename'],
  lastName: ['lastName', 'last_name', 'lastname', 'lname', 'surname', 'name_last', 'last', 'familyName'],
  fullName: ['fullName', 'full_name', 'name', 'completeName', 'displayName'],
  email: ['email', 'e-mail', 'emailAddress', 'mail', 'contact_email', 'e_mail', 'emailaddress'],
  phone: ['phone', 'phoneNumber', 'telephone', 'mobile', 'cell', 'contactNumber', 'tel', 'phonenumber'],
  
  address: ['address', 'streetAddress', 'address1', 'street', 'mailingAddress', 'streetaddress'],
  city: ['city', 'town', 'locality', 'addressCity'],
  state: ['state', 'province', 'region', 'county', 'department', 'prefecture', 'territory'],
  zipCode: ['zip', 'zipCode', 'postalCode', 'postcode', 'postal', 'zipcode'],
  country: ['country', 'nation', 'nationality', 'countryName'],
  
  company: ['company', 'organization', 'employer', 'currentCompany'],
  jobTitle: ['jobTitle', 'position', 'title', 'role', 'designation', 'occupation'],
  
  // Boolean/Selection fields
  gender: ['gender', 'sex'],
  newsletter: ['newsletter', 'subscribe', 'subscription', 'marketing', 'updates', 'notifications'],
  terms: ['terms', 'conditions', 'agreement', 'consent', 'privacy', 'policy', 'termsAndConditions'],
  remoteWork: ['remoteWork', 'workType', 'workPreference', 'locationType', 'work_mode'],
  
  experience: ['experience', 'yearsExperience', 'workExperience', 'totalexperience'],
  education: ['education', 'degree', 'highestEducation', 'qualification'],
  skills: ['skills', 'technicalSkills', 'competencies', 'expertise', 'abilities'],
  salary: ['salary', 'expectedSalary', 'compensation', 'desiredSalary'],
  notice: ['notice', 'noticePeriod', 'availability', 'joiningDate']
};

const VALUE_MAPPINGS = {
  boolean: {
    true: ['yes', 'true', 'agree', 'accept', 'subscribe', 'i agree', 'i accept', 'enable', 'on', '1', 'checked', 'consent', 'approve'],
    false: ['no', 'false', 'decline', 'reject', 'unsubscribe', 'disable', 'off', '0', 'unchecked', 'disagree']
  },
  
  gender: {
    male: ['male', 'man', 'm', 'he/him', 'mr', 'sir', 'boy'],
    female: ['female', 'woman', 'f', 'she/her', 'ms', 'mrs', 'miss', 'girl'],
    other: ['other', 'non-binary', 'prefer not to say', 'decline to answer', 'they/them', 'nonbinary', 'genderqueer']
  },
  
  remoteWork: {
    remote: ['remote', 'work from home', 'wfh', 'fully remote', 'home office', 'telecommute', 'virtual'],
    hybrid: ['hybrid', 'mixed', 'partial remote', 'flexible', 'hybrid-remote', 'some remote'],
    onsite: ['onsite', 'office', 'in office', 'in-person', 'on-site', 'collocated', 'on location']
  },
  
  country: {
    'united states': ['usa', 'us', 'united states of america', 'america', 'u.s.a.', 'united states of america (usa)'],
    'canada': ['ca', 'can', 'canada'],
    'united kingdom': ['uk', 'great britain', 'gb', 'britain', 'england', 'scotland', 'wales'],
    'australia': ['au', 'aus', 'australia'],
    'germany': ['de', 'deutschland', 'deu', 'germany']
  }
};

const REQUIRED_INDICATORS = [
  'required',
  'mandatory',
  'obligatory',
  '*', // Direct asterisk
  '(*)', // Asterisk in parentheses
  'required field',
  'must be filled',
  'cannot be empty',
  'field is required'
];

// =========================================
// STATE MANAGEMENT
// =========================================
const state = {
  isFilling: false,
  filledFields: new Set(),
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

// =========================================
// MAIN MESSAGE HANDLER
// =========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request.action);
  
  switch (request.action) {
    case 'smartFill':
      handleSmartFill(request.data, request.settings, sendResponse);
      return true; // Keep channel open for async
    
    case 'ping':
      sendResponse({ status: 'ready', version: '6.1' });
      return false;
    
    case 'extractFromBrowser':
      handleExtractData(sendResponse);
      return true;
    
    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

// =========================================
// SMART FILL ORCHESTRATOR
// =========================================
async function handleSmartFill(profileData, settings, sendResponse) {
  if (state.isFilling) {
    sendResponse({ error: 'Already filling forms', filled: 0 });
    return;
  }
  
  state.isFilling = true;
  state.filledFields.clear();
  
  try {
    // Apply settings
    Object.assign(state.config, settings);
    
    // Detect forms and standalone fields
    const forms = detectForms();
    const standaloneFields = detectStandaloneFields();
    
    let totalFilled = 0;
    
    // Process forms (required fields first)
    for (const form of forms) {
      const result = fillFormPrioritized(form, profileData);
      totalFilled += result.filled;
    }
    
    // Process standalone fields
    const standaloneResult = fillFields(standaloneFields, profileData);
    totalFilled += standaloneResult.filled;
    
    // Show notification
    if (state.config.showNotifications && totalFilled > 0) {
      showNotification(totalFilled, forms.length);
    }
    
    sendResponse({
      success: true,
      filled: totalFilled,
      formsProcessed: forms.length,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Smart fill error:', error);
    sendResponse({ error: error.message, filled: 0 });
  } finally {
    state.isFilling = false;
  }
}

// =========================================
// FORM DETECTION
// =========================================
function detectForms() {
  const selectors = [
    'form',
    '[role="form"]',
    '.form',
    '.application-form',
    '.registration-form',
    '.signup-form',
    '.contact-form',
    '.checkout-form'
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

function detectStandaloneFields() {
  return Array.from(document.querySelectorAll(`
    input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not(form input),
    textarea:not(form textarea),
    select:not(form select)
  `)).filter(isFieldVisible);
}

// =========================================
// PRIORITIZED FORM FILLING
// =========================================
function fillFormPrioritized(form, profileData) {
  const allFields = getFillableFields(form);
  
  // Separate required and optional
  const requiredFields = [];
  const optionalFields = [];
  
  allFields.forEach(field => {
    if (state.filledFields.has(field)) return;
    
    const analysis = analyzeField(field);
    if (analysis.isRequired) {
      requiredFields.push(analysis);
    } else {
      optionalFields.push(analysis);
    }
  });
  
  console.log(`📋 Form: ${allFields.length} fields (${requiredFields.length} required, ${optionalFields.length} optional)`);
  
  let filled = 0;
  
  // Fill required fields FIRST (highest priority)
  for (const fieldAnalysis of requiredFields) {
    if (fillFieldWithAnalysis(fieldAnalysis, profileData)) {
      filled++;
    }
  }
  
  // Then fill optional fields
  for (const fieldAnalysis of optionalFields) {
    if (fillFieldWithAnalysis(fieldAnalysis, profileData)) {
      filled++;
    }
  }
  
  // Auto-handle required consent boxes
  if (state.config.autoCheckConsent) {
    autoHandleRequiredConsent(form);
  }
  
  return { filled, total: allFields.length };
}

// Fill multiple fields
function fillFields(fieldElements, profileData) {
  let filled = 0;
  
  fieldElements.forEach(field => {
    if (state.filledFields.has(field) || !isFieldVisible(field)) return;
    
    const analysis = analyzeField(field);
    if (fillFieldWithAnalysis(analysis, profileData)) {
      filled++;
    }
  });
  
  return { filled, total: fieldElements.length };
}

// =========================================
// FIELD FILLING WITH ANALYSIS
// =========================================
function fillFieldWithAnalysis(analysis, profileData) {
  let value = findBestMatch(analysis, profileData);
  
  // SPECIAL HANDLING FOR REQUIRED FIELDS
  if (analysis.isRequired) {
    console.log(`🔴 Required field: ${analysis.name} (${analysis.type})`);
    
    // If no profile match, use intelligent defaults
    if (value === null) {
      value = getDefaultForRequiredField(analysis);
    }
    
    // For required selection fields, ensure valid value
    if (value !== null && (analysis.isSelect || analysis.isCheckbox)) {
      value = ensureValidSelection(analysis, value);
    }
  }
  
  // Skip if still no value
  if (value === null) {
    console.log(`❌ No value for: ${analysis.name}`);
    return false;
  }
  
  // Set the field value
  if (setFieldValue(analysis.element, value, analysis)) {
    state.filledFields.add(analysis.element);
    
    if (state.config.highlightFilled) {
      highlightField(analysis.element);
    }
    
    return true;
  }
  
  return false;
}

// Get intelligent defaults for required fields
function getDefaultForRequiredField(analysis) {
  // Required checkbox (consent/terms) → auto-check
  if (analysis.isCheckbox) {
    const context = analysis.context;
    if (context.includes('agree') || context.includes('accept') || 
        context.includes('terms') || context.includes('consent') ||
        context.includes('privacy') || context.includes('policy')) {
      console.log(`✅ Auto-agreeing to required: ${analysis.name}`);
      return true;
    }
  }
  
  // Required dropdown with yes/no → auto-select "yes"
  if (analysis.isSelect) {
    const options = Array.from(analysis.element.options).map(opt => opt.text.toLowerCase());
    if (options.includes('yes') && !options.includes('no')) {
      return 'yes';
    }
    if (options.includes('true') && !options.includes('false')) {
      return 'true';
    }
    if (options.includes('agree') && !options.includes('disagree')) {
      return 'agree';
    }
  }
  
  return null;
}

// Ensure valid selection for required dropdowns
function ensureValidSelection(analysis, value) {
  if (!analysis.isSelect) return value;
  
  const options = Array.from(analysis.element.options);
  const stringValue = String(value).toLowerCase();
  
  // Find matching option
  const match = options.find(opt => {
    const optText = opt.text.toLowerCase();
    const optValue = opt.value.toLowerCase();
    return optText === stringValue || optValue === stringValue ||
           optText.includes(stringValue) || optValue.includes(stringValue);
  });
  
  if (match) return match.value || match.text;
  
  // For boolean values, map to yes/no
  if (typeof value === 'boolean') {
    const target = value ? 'yes' : 'no';
    const booleanMatch = options.find(opt => {
      const optText = opt.text.toLowerCase();
      return VALUE_MAPPINGS.boolean.true.includes(optText);
    });
    if (booleanMatch) return booleanMatch.value || booleanMatch.text;
  }
  
  return value;
}

// =========================================
// FIELD ANALYSIS
// =========================================
function analyzeField(field) {
  const type = field.type || field.tagName.toLowerCase();
  const name = (field.name || field.id || '').toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const label = getFieldLabel(field).toLowerCase();
  const ariaLabel = (field.getAttribute('aria-label') || '').toLowerCase();
  
  // DETECT REQUIRED FIELDS (multiple methods)
  const isRequired = (
    field.hasAttribute('required') ||
    field.getAttribute('aria-required') === 'true' ||
    field.classList.contains('required') ||
    field.classList.contains('mandatory') ||
    field.classList.contains('validate-required') ||
    // Check text content for asterisk or required indicators
    label.includes('*') ||
    placeholder.includes('*') ||
    ariaLabel.includes('*') ||
    REQUIRED_INDICATORS.some(ind => 
      label.includes(ind) || placeholder.includes(ind) || ariaLabel.includes(ind)
    ) ||
    // Check parent labels for asterisk
    hasAsteriskInLabel(field)
  );
  
  return {
    element: field,
    type: type,
    name: name,
    label: label,
    placeholder: placeholder,
    ariaLabel: ariaLabel,
    context: [name, label, placeholder, ariaLabel].join(' '),
    isRequired: isRequired,
    isSelect: type === 'select-one' || type === 'select-multiple',
    isCheckbox: type === 'checkbox',
    isRadio: type === 'radio',
    isText: ['text', 'email', 'tel', 'url', 'number', 'date', 'password'].includes(type)
  };
}

// Check for asterisk in field's label element
function hasAsteriskInLabel(field) {
  try {
    // Method 1: Parent label
    const parentLabel = field.closest('label');
    if (parentLabel && parentLabel.textContent.includes('*')) return true;
    
    // Method 2: Label for=""
    if (field.id) {
      const labelFor = document.querySelector(`label[for="${field.id}"]`);
      if (labelFor && labelFor.textContent.includes('*')) return true;
    }
    
    // Method 3: Look for text node before field
    const previous = field.previousSibling;
    if (previous && previous.nodeType === Node.TEXT_NODE && previous.textContent.includes('*')) {
      return true;
    }
  } catch (e) {}
  return false;
}

// =========================================
// MATCHING ALGORITHM
// =========================================
function findBestMatch(analysis, profileData) {
  let bestScore = 0;
  let bestValue = null;
  
  for (const [key, value] of Object.entries(profileData)) {
    if (!value && value !== false && value !== 0) continue;
    
    let score = 0;
    const aliases = FIELD_ALIASES[key] || [key];
    
    // Exact name match (highest score)
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
    
    // Boost for required fields
    if (analysis.isRequired) {
      score += state.config.requiredBonus;
    }
    
    // Type-specific boosts
    if (analysis.type === 'email' && key === 'email') score += 20;
    if (analysis.type === 'tel' && key === 'phone') score += 20;
    
    // Accept if above threshold
    if (score > bestScore && score >= state.config.minScoreThreshold) {
      bestScore = score;
      bestValue = value;
    }
  }
  
  return bestValue;
}

// =========================================
// FIELD VALUE SETTING
// =========================================
function setFieldValue(field, rawValue, analysis) {
  try {
    // Normalize value
    let value = rawValue;
    if (typeof value !== 'boolean') {
      value = String(value).trim();
    }
    
    // Handle different field types
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
        return handleRadioGroup(analysis.element, value);
        
      case 'select-one':
      case 'select-multiple':
        return handleSelect(analysis.element, value);
        
      default:
        // Text/email/number inputs
        const stringValue = String(value);
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

// Handle radio button groups
function handleRadioGroup(radio, value) {
  const name = radio.name;
  const group = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
  const stringValue = String(value).toLowerCase();
  
  for (const option of group) {
    const optionValue = option.value.toLowerCase();
    const optionLabel = getFieldLabel(option).toLowerercase();
    
    if (optionValue === stringValue || optionLabel === stringValue ||
        optionValue.includes(stringValue) || optionLabel.includes(stringValue)) {
      if (!option.checked) {
        option.checked = true;
        triggerEvents(option, ['click', 'change']);
        return true;
      }
      return false;
    }
  }
  
  return false;
}

// Enhanced select handling with YES/NO support
function handleSelect(select, value) {
  const options = Array.from(select.options);
  const stringValue = String(value).toLowerCase();
  
  // Strategy 1: Exact match
  let match = options.find(opt => 
    opt.value.toLowerCase() === stringValue || opt.text.toLowerCase() === stringValue
  );
  if (match) {
    select.value = match.value;
    triggerEvents(select, ['change']);
    return true;
  }
  
  // Strategy 2: Contains match
  match = options.find(opt => 
    opt.value.toLowerCase().includes(stringValue) || opt.text.toLowerCase().includes(stringValue)
  );
  if (match) {
    select.value = match.value;
    triggerEvents(select, ['change']);
    return true;
  }
  
  // Strategy 3: Boolean mapping for yes/no
  if (VALUE_MAPPINGS.boolean.true.includes(stringValue)) {
    match = options.find(opt => VALUE_MAPPINGS.boolean.true.includes(opt.text.toLowerCase()));
    if (match) {
      select.value = match.value;
      triggerEvents(select, ['change']);
      return true;
    }
  }
  
  return false;
}

// =========================================
// AUTO-HANDLE REQUIRED CONSENT BOXES
// =========================================
function autoHandleRequiredConsent(form) {
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  
  for (const checkbox of checkboxes) {
    if (checkbox.checked || !isFieldVisible(checkbox)) continue;
    
    const analysis = analyzeField(checkbox);
    
    // Only auto-check if required AND consent-related
    if (analysis.isRequired && /agree|accept|terms|conditions|privacy|consent|i have read|i understand/i.test(analysis.context)) {
      console.log(`✅ Auto-checking required consent: ${analysis.name}`);
      checkbox.checked = true;
      triggerEvents(checkbox, ['click', 'change']);
      highlightField(checkbox);
    }
  }
}

// =========================================
// UTILITY FUNCTIONS
// =========================================
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
    
    // Method 3: aria-label
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    
    // Method 4: aria-labelledby
    const labelledBy = field.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent.trim();
    }
    
    // Method 5: placeholder fallback
    if (field.placeholder) return field.placeholder.trim();
  } catch (e) {}
  
  return '';
}

function isFieldVisible(field) {
  try {
    if (field.disabled || field.hidden || field.type === 'hidden') return false;
    if (field.style.display === 'none' || field.style.visibility === 'hidden') return false;
    
    const rect = field.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    
    const style = window.getComputedStyle(field);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    return true;
  } catch (e) {
    return false;
  }
}

function getFillableFields(form) {
  return Array.from(form.querySelectorAll(`
    input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]),
    textarea,
    select
  `)).filter(isFieldVisible);
}

function triggerEvents(field, events) {
  events.forEach(eventType => {
    try {
      field.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
    } catch (e) {}
  });
}

function highlightField(field) {
  field.classList.add('autofill-highlight');
  if (isRequiredField(field)) {
    field.classList.add('autofill-required');
  }
  setTimeout(() => field.classList.remove('autofill-highlight'), 2000);
}

function showNotification(filled, forms) {
  const notification = document.createElement('div');
  notification.className = 'autofill-notification';
  notification.innerHTML = `
    <div class="autofill-notification__icon">✅</div>
    <div>
      <strong>AutoFill Pro</strong><br>
      Filled ${filled} field${filled !== 1 ? 's' : ''} in ${forms} form${forms !== 1 ? 's' : ''}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function isRequiredField(field) {
  const analysis = analyzeField(field);
  return analysis.isRequired;
}

// =========================================
// DATA EXTRACTION
// =========================================
function handleExtractData(sendResponse) {
  const extracted = {};
  const inputs = document.querySelectorAll('input, textarea, select');
  
  const patterns = {
    email: /email|e.?mail/i,
    phone: /phone|mobile|tel|cell|contact/i,
    firstName: /first.?name|fname|given.?name/i,
    lastName: /last.?name|lname|surname|family/i,
    company: /company|organization|employer/i,
    jobTitle: /title|position|role|occupation/i
  };
  
  inputs.forEach(input => {
    if (!input.value || !isFieldVisible(input)) return;
    
    const label = getFieldLabel(input).toLowerCase();
    const name = (input.name || '').toLowerase();
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

// =========================================
// INITIALIZATION
// =========================================
console.log('✅ AutoFill Pro content script initialized with required field detection');