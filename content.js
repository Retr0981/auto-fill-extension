// Add this to content.js for better form detection:

// Enhanced form selector patterns
const FORM_PATTERNS = {
  // Common form patterns
  standard: /form|application|registration|signup|sign-up|signin|login|checkout|payment|contact|lead|survey|questionnaire/i,
  job: /job|application|candidate|resume|career|employment|work|position|role|vacancy/i,
  contact: /contact|message|inquiry|query|feedback|support|help|request/i,
  account: /account|profile|user|member|registration|signup|createaccount/i,
  checkout: /checkout|cart|basket|order|payment|shipping|billing|delivery/i
};

// Enhanced field detection function
function detectFormType() {
  const pageText = document.body.innerText.toLowerCase();
  const url = window.location.href.toLowerCase();
  
  for (const [type, pattern] of Object.entries(FORM_PATTERNS)) {
    if (pattern.test(pageText) || pattern.test(url)) {
      console.log(`📋 Detected ${type} form`);
      return type;
    }
  }
  
  // Check for form elements
  const formCount = document.querySelectorAll('form, [role="form"]').length;
  if (formCount > 0) {
    console.log(`📋 Found ${formCount} form(s)`);
    return 'generic';
  }
  
  return 'unknown';
}

// Enhanced smart fill function
async function smartFillAllForms(profileData) {
  console.log('🚀 Starting comprehensive form fill...');
  
  const results = {
    totalFilled: 0,
    formsProcessed: 0,
    fieldsProcessed: 0,
    details: []
  };
  
  // Strategy 1: Fill visible forms
  const forms = document.querySelectorAll('form, [role="form"]');
  console.log(`📋 Found ${forms.length} forms`);
  
  for (const form of forms) {
    const formResult = await fillSingleForm(form, profileData);
    results.totalFilled += formResult.filled;
    results.formsProcessed++;
    results.details.push(formResult);
  }
  
  // Strategy 2: Fill standalone fields not in forms
  if (results.totalFilled === 0) {
    const standaloneResult = fillStandaloneFields(profileData);
    results.totalFilled = standaloneResult.filled;
    results.details.push(standaloneResult);
  }
  
  // Strategy 3: Fill iframe forms
  const iframeResults = await fillIframeForms(profileData);
  results.totalFilled += iframeResults.totalFilled;
  
  // Show results
  showResultsNotification(results);
  
  return results;
}

// Fill single form comprehensively
function fillSingleForm(form, profileData) {
  const result = {
    filled: 0,
    total: 0,
    fields: []
  };
  
  // Get all possible input elements
  const fieldTypes = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '.form-control',
    '.form-input',
    '.input-field',
    '[role="textbox"]',
    '[role="combobox"]'
  ];
  
  const selectors = fieldTypes.join(', ');
  const fields = form.querySelectorAll(selectors);
  result.total = fields.length;
  
  console.log(`📝 Processing ${fields.length} fields in form`);
  
  fields.forEach((field, index) => {
    try {
      if (!isVisible(field) || field.disabled) {
        return;
      }
      
      const filled = fillField(field, profileData);
      if (filled) {
        result.filled++;
        result.fields.push({
          index,
          name: field.name || field.id || `field-${index}`,
          type: field.type || field.tagName,
          value: filled
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error filling field ${index}:`, error);
    }
  });
  
  // Auto-submit forms if configured
  if (result.filled > 0 && shouldAutoSubmit(form)) {
    setTimeout(() => autoSubmitForm(form), 1000);
  }
  
  return result;
}

// Enhanced field filling logic
function fillField(field, profileData) {
  const fieldType = field.type || field.tagName.toLowerCase();
  const fieldName = (field.name || field.id || '').toLowerCase();
  const fieldLabel = getFieldLabel(field).toLowerCase();
  
  // Try multiple matching strategies
  let valueToFill = null;
  
  // Strategy 1: Direct field name matching
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    if (profileData[key]) {
      // Check field name
      if (fieldName && aliases.some(alias => fieldName.includes(alias.toLowerCase()))) {
        valueToFill = profileData[key];
        break;
      }
      // Check field label
      if (fieldLabel && aliases.some(alias => fieldLabel.includes(alias.toLowerCase()))) {
        valueToFill = profileData[key];
        break;
      }
      // Check placeholder
      if (field.placeholder && aliases.some(alias => 
        field.placeholder.toLowerCase().includes(alias.toLowerCase()))) {
        valueToFill = profileData[key];
        break;
      }
    }
  }
  
  // Strategy 2: Autocomplete attribute matching
  if (!valueToFill && field.autocomplete) {
    const autocompleteMap = {
      'name': profileData.firstName,
      'given-name': profileData.firstName,
      'family-name': profileData.lastName,
      'email': profileData.email,
      'tel': profileData.phone,
      'address-line1': profileData.address,
      'address-level2': profileData.city,
      'address-level1': profileData.state,
      'postal-code': profileData.zipCode,
      'country': profileData.country,
      'organization': profileData.company,
      'organization-title': profileData.jobTitle
    };
    
    if (autocompleteMap[field.autocomplete]) {
      valueToFill = autocompleteMap[field.autocomplete];
    }
  }
  
  // Strategy 3: Context-based matching
  if (!valueToFill) {
    valueToFill = contextBasedMatch(field, profileData);
  }
  
  if (valueToFill) {
    return applyValueToField(field, valueToFill);
  }
  
  return null;
}

// Apply value with proper field type handling
function applyValueToField(field, value) {
  const fieldType = field.type || field.tagName.toLowerCase();
  
  switch (fieldType) {
    case 'checkbox':
      return handleCheckbox(field, value);
    case 'radio':
      return handleRadio(field, value);
    case 'select-one':
    case 'select-multiple':
      return handleSelect(field, value);
    case 'date':
      return handleDate(field, value);
    case 'file':
      return handleFile(field, value);
    default:
      return handleTextInput(field, value);
  }
}