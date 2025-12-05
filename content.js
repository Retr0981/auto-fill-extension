// AutoFill Pro Content Script - Enhanced Automatic Selection
console.log('🎯 AutoFill Pro Content Script loaded');

// Configuration
const CONFIG = {
  autoCheckBoxes: true,
  autoSelectOptions: true,
  highlightFilled: true,
  showNotifications: true,
  prioritizeRequired: true,  
  notificationDuration: 3000,
  fieldCheckInterval: 1000,
  maxRetryAttempts: 3,
  // NEW: Enhanced value mappings
  valueMappings: {
    // Gender options
    gender: {
      male: ['male', 'm', 'man', 'boy', 'male/man', 'he/him', 'mr', 'sir', 'gentleman'],
      female: ['female', 'f', 'woman', 'girl', 'female/woman', 'she/her', 'mrs', 'ms', 'miss', 'lady'],
      other: ['other', 'non-binary', 'non binary', 'prefer not to say', 'prefer-not-to-say', 'they/them', 'prefer not to answer', 'decline to answer']
    },
    
    // Boolean/Terms
    boolean: {
      true: ['true', 'yes', 'y', '1', 'on', 'checked', 'agree', 'accept', 'ok', 'enable', 'i agree', 'i accept', 'subscribe', 'opt-in', 'opt in'],
      false: ['false', 'no', 'n', '0', 'off', 'unchecked', 'decline', 'disable', 'i disagree', 'unsubscribe', 'opt-out', 'opt out']
    },
    
    // Work location
    remoteWork: {
      remote: ['remote', 'work from home', 'wfh', 'fully remote', '100% remote', 'home office', 'telecommute'],
      hybrid: ['hybrid', 'mixed', 'hybrid work', 'partial remote', 'flexible', 'hybrid-remote', 'some remote'],
      onsite: ['onsite', 'on-site', 'office', 'in-office', 'on site', 'in office', 'in-person', 'on location', 'in person']
    },
    
    // Countries (expanded)
    country: {
      'united states': ['usa', 'us', 'united states', 'united states of america', 'america', 'u.s.', 'u.s.a.', 'united states of america (usa)'],
      'canada': ['canada', 'ca', 'can'],
      'united kingdom': ['uk', 'united kingdom', 'great britain', 'gb', 'england', 'scotland', 'wales', 'northern ireland', 'britain'],
      'australia': ['australia', 'au', 'aus'],
      'germany': ['germany', 'de', 'deutschland', 'deu'],
      'france': ['france', 'fr', 'fra'],
      'italy': ['italy', 'it', 'ita'],
      'spain': ['spain', 'es', 'esp'],
      'japan': ['japan', 'jp', 'jpn'],
      'china': ['china', 'cn', 'chn'],
      'india': ['india', 'in', 'ind']
    },
    
    // US States (expanded)
    state: {
      'alabama': ['al', 'alabama', 'ala'],
      'alaska': ['ak', 'alaska'],
      'arizona': ['az', 'arizona', 'ariz'],
      'arkansas': ['ar', 'arkansas', 'ark'],
      'california': ['ca', 'california', 'calif', 'cal'],
      'colorado': ['co', 'colorado', 'colo'],
      'connecticut': ['ct', 'connecticut', 'conn'],
      'delaware': ['de', 'delaware', 'del'],
      'florida': ['fl', 'florida', 'fla'],
      'georgia': ['ga', 'georgia', 'ga.'],
      'hawaii': ['hi', 'hawaii'],
      'idaho': ['id', 'idaho'],
      'illinois': ['il', 'illinois', 'ill', 'ill.'],
      'indiana': ['in', 'indiana', 'ind'],
      'iowa': ['ia', 'iowa'],
      'kansas': ['ks', 'kansas', 'kan'],
      'kentucky': ['ky', 'kentucky', 'kent', 'ken'],
      'louisiana': ['la', 'louisiana'],
      'maine': ['me', 'maine'],
      'maryland': ['md', 'maryland', 'md.'],
      'massachusetts': ['ma', 'massachusetts', 'mass'],
      'michigan': ['mi', 'michigan', 'mich'],
      'minnesota': ['mn', 'minnesota', 'minn'],
      'mississippi': ['ms', 'mississippi', 'miss'],
      'missouri': ['mo', 'missouri'],
      'montana': ['mt', 'montana', 'mont'],
      'nebraska': ['ne', 'nebraska', 'neb', 'nebr'],
      'nevada': ['nv', 'nevada', 'nev'],
      'new hampshire': ['nh', 'new hampshire', 'n.h.'],
      'new jersey': ['nj', 'new jersey', 'n.j.'],
      'new mexico': ['nm', 'new mexico', 'n.m.'],
      'new york': ['ny', 'new york', 'n.y.'],
      'north carolina': ['nc', 'north carolina', 'n.c.'],
      'north dakota': ['nd', 'north dakota', 'n.d.'],
      'ohio': ['oh', 'ohio'],
      'oklahoma': ['ok', 'oklahoma', 'okla'],
      'oregon': ['or', 'oregon', 'ore', 'oreg'],
      'pennsylvania': ['pa', 'pennsylvania', 'penn', 'pa.'],
      'rhode island': ['ri', 'rhode island', 'r.i.'],
      'south carolina': ['sc', 'south carolina', 's.c.'],
      'south dakota': ['sd', 'south dakota', 's.d.'],
      'tennessee': ['tn', 'tennessee', 'tenn'],
      'texas': ['tx', 'texas', 'tex', 'tex.'],
      'utah': ['ut', 'utah'],
      'vermont': ['vt', 'vermont', 'vt.'],
      'virginia': ['va', 'virginia', 'va.'],
      'washington': ['wa', 'washington', 'wash'],
      'west virginia': ['wv', 'west virginia', 'w.v.'],
      'wisconsin': ['wi', 'wisconsin', 'wis', 'wisc'],
      'wyoming': ['wy', 'wyoming', 'wyo']
    }
  }
};

// State management
let state = {
  isFilling: false,
  lastFillTime: null,
  filledFields: new Set(),
  formDetection: {
    detectedForms: [],
    totalFields: 0
  }
};

// === IMPORT FIELD_ALIASES FROM CONFIG ===
const FIELD_ALIASES = {
  // Personal Information
  firstName: ['firstName', 'first_name', 'firstname', 'fname', 'givenName', 'given_name', 'forename', 'user.firstName', 'customer.firstName', 'applicant.firstName', 'candidate.firstName', 'first', 'fn', 'given', 'fName', 'firstName1', 'firstname1', 'name_first'],
  lastName: ['lastName', 'last_name', 'lastname', 'lname', 'surname', 'familyName', 'family_name', 'user.lastName', 'customer.lastName', 'applicant.lastName', 'candidate.lastName', 'last', 'ln', 'family', 'lName', 'lastname1', 'name_last'],
  fullName: ['fullName', 'full_name', 'fullname', 'name', 'completeName', 'user.name', 'customer.name', 'applicant.name', 'candidate.name', 'person.name', 'displayName', 'display_name'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail', 'e mail', 'emailaddress', 'contact', 'contactEmail', 'candidate.email', 'applicant.email', 'user.email', 'person.email', 'contact_email', 'emailAddr', 'mailAddress', 'email_address', 'e-mailAddress', 'email_addr'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'tel', 'contact', 'contactNumber', 'candidate.phone', 'applicant.phone', 'user.phone', 'person.phone', 'contact_phone', 'phone_no', 'telephone_no', 'mobileNumber', 'phoneNumber1', 'telephoneNumber', 'mobilePhone', 'cellPhone'],
  address: ['address', 'streetAddress', 'street_address', 'addressLine1', 'address1', 'line1', 'street', 'location', 'mailingAddress', 'residentialAddress', 'homeAddress', 'workAddress', 'address_line1', 'addr1', 'streetAddr', 'streetaddress', 'addrLine1', 'street_address1'],
  city: ['city', 'town', 'cityName', 'locality', 'addressCity', 'homeCity', 'workCity', 'city_name', 'locationCity', 'address_city', 'cityTown', 'city_town', 'address_city', 'locality_city'],
  
  // === ENHANCED: State/Province/County with broader matching ===
  state: [
    'state', 'province', 'region', 'stateProvince', 'addressState', 'homeState',
    'workState', 'state_name', 'regionState', 'address_state', 'stateProv',
    'provState', 'state_province', 'region_state', 'provincia', 'county',
    'department', 'prefecture', 'territory', 'division', 'district', 'zone'
  ],
  
  zipCode: ['zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode', 'addressZip', 'homeZip', 'workZip', 'zip_code', 'postal_code', 'address_zip', 'postCode', 'zipPostal', 'zip_postal', 'postalcode'],
  country: ['country', 'countryName', 'nation', 'addressCountry', 'homeCountry', 'workCountry', 'country_name', 'nationality', 'country_nation', 'address_country', 'residenceCountry', 'residence_country', 'citizenship'],
  
  company: ['company', 'organization', 'employer', 'companyName', 'company_name', 'organizationName', 'currentCompany', 'employerName', 'companyName1', 'compName', 'orgName', 'employer_name', 'current_employer', 'currentCompany'],
  jobTitle: ['jobTitle', 'job_title', 'position', 'title', 'role', 'occupation', 'jobPosition', 'jobRole', 'jobtitle', 'jobName', 'designation', 'currentTitle', 'current_position', 'professional_title', 'role_title'],
  website: ['website', 'personalWebsite', 'portfolio', 'url', 'websiteUrl', 'webSite', 'site', 'personal_site', 'portfolio_url', 'website_url'],
  linkedin: ['linkedin', 'linkedinProfile', 'linkedin_url', 'linkedinUrl', 'social.linkedin', 'linkedin_profile', 'linkedin_link'],
  github: ['github', 'githubProfile', 'github_url', 'githubUrl', 'social.github', 'github_profile', 'github_link'],
  experience: ['experience', 'workExperience', 'yearsExperience', 'totalExperience', 'professionalExperience', 'relevantExperience', 'years_experience', 'total_experience', 'work_experience'],
  education: ['education', 'degree', 'qualification', 'highestEducation', 'educationalBackground', 'academicBackground', 'highest_degree', 'education_level'],
  skills: ['skills', 'technicalSkills', 'competencies', 'expertise', 'abilities', 'proficiencies', 'technical_skills', 'key_skills', 'core_skills'],
  salary: ['salary', 'salaryExpectation', 'expectedSalary', 'compensation', 'desiredSalary', 'salary_expectation', 'expected_salary', 'compensation_expectation'],
  notice: ['noticePeriod', 'notice', 'availability', 'whenAvailable', 'notice_period', 'availability_date', 'start_date', 'joining_date']
};

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received:', request.action);
  
  try {
    switch (request.action) {
      case 'smartFill':
        handleSmartFill(request.data, request.settings, sendResponse);
        break;
      case 'fillForm':
        handleFillForm(request.data, sendResponse);
        break;
      case 'extractFromBrowser':
        handleExtractData(sendResponse);
        break;
      case 'ping':
        sendResponse({ status: 'ready', version: '5.2', timestamp: Date.now() });
        break;
      case 'detectForms':
        handleDetectForms(sendResponse);
        break;
      case 'fillField':
        handleSingleField(request.field, request.value, sendResponse);
        break;
      case 'autoSubmit':
        handleAutoSubmit(sendResponse);
        break;
      default:
        console.warn('⚠️ Unknown action:', request.action);
        sendResponse({ error: 'Unknown action', action: request.action });
    }
  } catch (error) {
    console.error('❌ Message handler error:', error);
    sendResponse({ error: error.message, filled: 0 });
  }
  
  return true;
});

// Smart fill handler
async function handleSmartFill(profileData, settings, sendResponse) {
  if (state.isFilling) {
    sendResponse({ error: 'Already filling forms', filled: 0 });
    return;
  }
  
  state.isFilling = true;
  
  try {
    console.log('🚀 Starting smart fill');
    
    if (settings) {
      CONFIG.highlightFilled = settings.highlightFields !== false;
      CONFIG.showNotifications = settings.showNotifications !== false;
    }
    
    const forms = detectAllForms();
    console.log(`📋 Detected ${forms.length} form(s)`);
    
    const results = [];
    let totalFilled = 0;
    let totalFields = 0;
    
    for (const form of forms) {
      const result = await fillFormComprehensive(form, profileData);
      results.push(result);
      totalFilled += result.filled;
      totalFields += result.total;
    }
    
    const standaloneResult = fillStandaloneFields(profileData);
    totalFilled += standaloneResult.filled;
    
    state.lastFillTime = Date.now();
    state.isFilling = false;
    
    if (CONFIG.showNotifications && totalFilled > 0) {
      showFillNotification(totalFilled, forms.length);
    }
    
    sendResponse({
      success: true,
      filled: totalFilled,
      totalFields: totalFields,
      formsProcessed: forms.length,
      results: results,
      timestamp: state.lastFillTime
    });
    
  } catch (error) {
    console.error('❌ Smart fill error:', error);
    state.isFilling = false;
    sendResponse({ error: error.message, filled: 0 });
  }
}

// Comprehensive form filling
async function fillFormComprehensive(form, profileData) {
  const result = {
    formId: form.id || form.name || `form_${Date.now()}`,
    filled: 0,
    total: 0,
    fields: []
  };
  
  const fieldSelectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '.form-control',
    '.form-input',
    '.input-field',
    '.form-field',
    '[data-field]',
    '[data-input]'
  ];
  
  const fields = form.querySelectorAll(fieldSelectors.join(', '));
  result.total = fields.length;
  
  console.log(`📝 Processing ${fields.length} fields in form`);
  
  // Fill in batches
  const batchSize = 10;
  for (let i = 0; i < fields.length; i += batchSize) {
    const batch = Array.from(fields).slice(i, i + batchSize);
    
    for (const field of batch) {
      if (!isFieldFillable(field)) continue;
      
      const fieldInfo = analyzeField(field);
      const value = findBestMatch(fieldInfo, profileData);
      
      if (value !== null) {
        const success = fillFieldWithValue(field, value, fieldInfo);
        
        if (success) {
          result.filled++;
          state.filledFields.add(field);
          
          if (CONFIG.highlightFilled) {
            highlightField(field);
          }
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Auto-check consent boxes
  if (CONFIG.autoCheckBoxes) {
    autoCheckConsentBoxes(form);
  }
  
  // Auto-select common options
  if (CONFIG.autoSelectOptions) {
    autoSelectCommonOptions(form, profileData);
  }
  
  console.log(`✅ Form: Filled ${result.filled} of ${result.total} fields`);
  return result;
}

// Fill standalone fields
function fillStandaloneFields(profileData) {
  const result = { filled: 0, total: 0 };
  
  const standaloneSelectors = [
    'body input:not(form input):not([type="hidden"])',
    'body textarea:not(form textarea)',
    'body select:not(form select)',
    'body [contenteditable="true"]:not(form [contenteditable="true"])'
  ];
  
  const fields = document.querySelectorAll(standaloneSelectors.join(', '));
  result.total = fields.length;
  
  fields.forEach(field => {
    if (!isFieldFillable(field) || state.filledFields.has(field)) return;
    
    const fieldInfo = analyzeField(field);
    const value = findBestMatch(fieldInfo, profileData);
    
    if (value !== null) {
      const success = fillFieldWithValue(field, value, fieldInfo);
      
      if (success) {
        result.filled++;
        state.filledFields.add(field);
        
        if (CONFIG.highlightFilled) {
          highlightField(field);
        }
      }
    }
  });
  
  return result;
}

// Analyze field - ENHANCED
function analyzeField(field) {
  const fieldType = field.type || field.tagName.toLowerCase();
  const name = field.name || field.id || '';
  const placeholder = field.placeholder || '';
  const label = getFieldLabel(field);
  const ariaLabel = field.getAttribute('aria-label') || '';
  const dataName = field.getAttribute('data-name') || field.getAttribute('data-field') || '';
  const className = field.className || '';
  const autocomplete = field.getAttribute('autocomplete') || '';
  
  // Get comprehensive context
  const contextText = [
    name,
    placeholder,
    label,
    ariaLabel,
    dataName,
    className,
    autocomplete,
    field.getAttribute('data-testid') || '',
    field.getAttribute('data-qa') || '',
    field.getAttribute('data-cy') || '',
    field.getAttribute('title') || ''
  ].filter(Boolean).join(' ').toLowerCase();
  
  return {
    element: field,
    type: fieldType,
    name: name,
    placeholder: placeholder,
    label: label,
    ariaLabel: ariaLabel,
    dataName: dataName,
    className: className,
    autocomplete: autocomplete,
    context: contextText,
    isCheckbox: fieldType === 'checkbox',
    isRadio: fieldType === 'radio',
    isSelect: fieldType === 'select-one' || fieldType === 'select-multiple',
    isText: ['text', 'email', 'tel', 'url', 'number', 'date', 'password'].includes(fieldType),
    isTextarea: fieldType === 'textarea',
    isContentEditable: field.isContentEditable
  };
}

// ENHANCED findBestMatch with better selection handling
function findBestMatch(fieldInfo, profileData) {
  if (!profileData || Object.keys(profileData).length === 0) return null;
  
  let bestMatch = null;
  let bestScore = 0;
  const debugMatches = [];
  
  const weights = {
    exactNameMatch: 100,
    partialNameMatch: 60,
    exactContextMatch: 40,
    partialContextMatch: 25,
    fieldNameHint: 50,
    typeMatch: 30,
    minScoreThreshold: 20,
    selectionFieldBonus: 15 // NEW: Bonus for selection fields
  };
  
  // Lower threshold for selection fields
  if (fieldInfo.isSelect || fieldInfo.isRadio || fieldInfo.isCheckbox) {
    weights.minScoreThreshold = 15;
  }
  
  console.log(`🔍 Analyzing field: ${fieldInfo.name} (${fieldInfo.type})`);
  
  for (const [key, value] of Object.entries(profileData)) {
    if (!value && value !== false && value !== 0) continue;
    
    let score = 0;
    const aliases = FIELD_ALIASES[key] || [key];
    const fieldName = fieldInfo.name.toLowerCase();
    const context = fieldInfo.context;
    
    // Priority 1: Field name matches
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      
      if (fieldName === aliasLower) {
        score = Math.max(score, weights.exactNameMatch);
        debugMatches.push({key, alias, type: 'exactName', score});
      } else if (fieldName.includes(aliasLower)) {
        score = Math.max(score, weights.partialNameMatch);
        debugMatches.push({key, alias, type: 'partialName', score});
      }
    }
    
    // Priority 2: Special hints
    if (fieldName.includes('surname') && key === 'lastName') {
      score += weights.fieldNameHint;
      debugMatches.push({key, hint: 'surname', type: 'fieldHint', score});
    }
    if (fieldName.includes('forename') && key === 'firstName') {
      score += weights.fieldNameHint;
      debugMatches.push({key, hint: 'forename', type: 'fieldHint', score});
    }
    
    // Priority 3: Context matches
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      const contextWords = context.split(/\W+/).filter(w => w.length > 2);
      
      if (context.includes(aliasLower)) {
        const isGeneric = aliasLower.length <= 4 && contextWords.length > 5;
        const contextualScore = isGeneric ? weights.partialContextMatch : weights.exactContextMatch;
        score = Math.max(score, contextualScore);
        debugMatches.push({key, alias, type: 'context', score});
      }
      else if (contextWords.some(word => 
        word.includes(aliasLower) || aliasLower.includes(word)
      )) {
        score = Math.max(score, weights.partialContextMatch + 5);
        debugMatches.push({key, alias, type: 'partialContext', score});
      }
    }
    
    // Priority 4: Type-based matching
    if (fieldInfo.type === 'email' && key === 'email') score += weights.typeMatch;
    if (fieldInfo.type === 'tel' && key === 'phone') score += weights.typeMatch;
    if (fieldInfo.type === 'url' && key === 'website') score += weights.typeMatch;
    
    // NEW: Bonus for selection fields matching known keys
    if ((fieldInfo.isSelect || fieldInfo.isRadio || fieldInfo.isCheckbox) && 
        ['gender', 'newsletter', 'terms', 'remoteWork', 'country', 'state'].includes(key)) {
      score += weights.selectionFieldBonus;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  
  // Fallback to autocomplete attribute
  if (bestScore < weights.minScoreThreshold && fieldInfo.autocomplete) {
    const autocompleteMap = {
      'name': profileData.fullName,
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
    
    const value = autocompleteMap[fieldInfo.autocomplete];
    if (value) {
      bestMatch = value;
      bestScore = weights.exactNameMatch;
      console.log(`✅ Matched via autocomplete: ${fieldInfo.autocomplete} = ${value}`);
    }
  }
  
  // Apply value mappings if it's a selection field
  if (bestMatch !== null && (fieldInfo.isSelect || fieldInfo.isRadio || fieldInfo.isCheckbox)) {
    const mappedValue = applyValueMapping(bestMatch, fieldInfo);
    if (mappedValue !== bestMatch) {
      console.log(`🔄 Mapped value: ${bestMatch} → ${mappedValue}`);
      bestMatch = mappedValue;
    }
  }
  
  if (bestScore > 0) {
    console.log(`✅ Best match for "${fieldInfo.name}": ${bestMatch} (score: ${bestScore})`);
    console.log('📊 All matches:', debugMatches.filter(m => m.score > 15));
  } else {
    console.log(`❌ No match found for "${fieldInfo.name}"`);
  }
  
  return bestScore >= weights.minScoreThreshold ? bestMatch : null;
}

// NEW: Apply value mappings for intelligent selection
function applyValueMapping(value, fieldInfo) {
  const context = fieldInfo.context;
  const stringValue = String(value).toLowerCase().trim();
  
  // Determine which mapping to use based on context
  let mappingKey = null;
  
  if (context.includes('gender') || context.includes('sex')) {
    mappingKey = 'gender';
  } else if (context.includes('newsletter') || context.includes('subscribe') || context.includes('marketing')) {
    mappingKey = 'boolean';
  } else if (context.includes('terms') || context.includes('conditions') || context.includes('privacy') || context.includes('agree')) {
    mappingKey = 'boolean';
  } else if (context.includes('remote') || context.includes('work type') || context.includes('location') || context.includes('work preference')) {
    mappingKey = 'remoteWork';
  } else if (context.includes('country') || context.includes('nation') || context.includes('nationality')) {
    mappingKey = 'country';
  } else if (context.includes('state') || context.includes('province') || context.includes('region') || context.includes('county') || context.includes('department')) {
    mappingKey = 'state';
  } else if (fieldInfo.isCheckbox) {
    // Default boolean for unknown checkboxes
    mappingKey = 'boolean';
  }
  
  if (mappingKey && CONFIG.valueMappings[mappingKey]) {
    const mappings = CONFIG.valueMappings[mappingKey];
    
    // Find best match in the mapping
    for (const [target, aliases] of Object.entries(mappings)) {
      if (aliases.some(alias => stringValue.includes(alias) || alias.includes(stringValue))) {
        // Return the canonical value for the target
        if (mappingKey === 'boolean') {
          return target === 'true';
        }
        return target;
      }
    }
  }
  
  return value;
}

// Fill field with value
function fillFieldWithValue(field, value, fieldInfo) {
  try {
    let success = false;
    const stringValue = String(value).trim();
    
    switch (fieldInfo.type) {
      case 'checkbox':
        const shouldCheck = parseCheckboxValue(value);
        if (field.checked !== shouldCheck) {
          field.checked = shouldCheck;
          success = true;
        }
        break;
        
      case 'radio':
        const radioGroup = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
        const matchingRadio = findMatchingRadio(radioGroup, value);
        if (matchingRadio && !matchingRadio.checked) {
          matchingRadio.checked = true;
          success = true;
        }
        break;
        
      case 'select-one':
      case 'select-multiple':
        success = selectOption(field, value);
        break;
        
      default:
        if (fieldInfo.isContentEditable) {
          field.textContent = stringValue;
          success = true;
        } else if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
          if (field.value !== stringValue) {
            field.value = stringValue;
            success = true;
          }
        }
    }
    
    if (success) {
      triggerFieldEvents(field, fieldInfo.type);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ Error filling field:`, error);
    return false;
  }
}

// ENHANCED: Intelligent dropdown selection with fuzzy matching
function selectOption(select, value) {
  const stringValue = String(value).toLowerCase().trim();
  const options = Array.from(select.options || []);
  
  if (options.length === 0) return false;
  
  // Try multiple matching strategies in order of preference
  const matchStrategies = [
    // 1. Exact match (value or text)
    () => options.find(opt => opt.value.toLowerCase() === stringValue || opt.text.toLowerCase() === stringValue),
    
    // 2. Starts with match
    () => options.find(opt => opt.value.toLowerCase().startsWith(stringValue) || opt.text.toLowerCase().startsWith(stringValue)),
    
    // 3. Contains match
    () => options.find(opt => opt.value.toLowerCase().includes(stringValue) || opt.text.toLowerCase().includes(stringValue)),
    
    // 4. Word match (split by spaces and check each word)
    () => {
      const valueWords = stringValue.split(/\W+/).filter(w => w.length > 2);
      return options.find(opt => {
        const optText = opt.text.toLowerCase();
        return valueWords.some(word => optText.includes(word));
      });
    },
    
    // 5. Acronym match (e.g., "US" for "United States")
    () => {
      if (stringValue.length <= 3) {
        return options.find(opt => {
          const text = opt.text.toLowerCase();
          // Check if stringValue is acronym of option text
          const words = text.split(/\W+/);
          const acronym = words.map(w => w[0]).join('');
          return acronym === stringValue;
        });
      }
      return null;
    },
    
    // 6. Fuzzy match (Levenshtein distance for typos)
    () => {
      let bestMatch = null;
      let bestScore = 0;
      
      options.forEach(opt => {
        const score = calculateSimilarity(opt.text.toLowerCase(), stringValue);
        if (score > bestScore && score > 0.7) { // 70% similarity threshold
          bestScore = score;
          bestMatch = opt;
        }
      });
      
      return bestMatch;
    }
  ];
  
  // Execute strategies in order
  for (const strategy of matchStrategies) {
    const match = strategy();
    if (match) {
      console.log(`✅ Matched dropdown option: "${match.text}" for value: "${value}"`);
      select.value = match.value;
      return true;
    }
  }
  
  return false;
}

// Calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Get edit distance between two strings
function getEditDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// ENHANCED: Find matching radio button
function findMatchingRadio(radioGroup, value) {
  const stringValue = String(value).toLowerCase().trim();
  
  return Array.from(radioGroup).find(radio => {
    const radioValue = radio.value.toLowerCase().trim();
    const radioId = radio.id.toLowerCase();
    const radioLabel = getFieldLabel(radio).toLowerCase();
    
    // Check multiple match conditions
    return radioValue === stringValue ||
           radioId === stringValue ||
           radioLabel === stringValue ||
           stringValue.includes(radioValue) ||
           radioValue.includes(stringValue) ||
           radioLabel.includes(stringValue) ||
           // Check if radio value maps to the target value
           applyValueMapping(radioValue, {context: radioLabel}) === value;
  });
}

// Helper functions
function isFieldFillable(field) {
  if (!field) return false;
  if (field.disabled) return false;
  if (field.readOnly) return false;
  if (field.type === 'hidden') return false;
  if (field.style.display === 'none') return false;
  if (field.style.visibility === 'hidden') return false;
  if (field.offsetParent === null) return false;
  
  const computedStyle = window.getComputedStyle(field);
  if (computedStyle.display === 'none') return false;
  if (computedStyle.visibility === 'hidden') return false;
  if (computedStyle.opacity === '0') return false;
  
  return true;
}

function getFieldLabel(field) {
  try {
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim();
    }
    
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    
    const labelledBy = field.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent.trim();
    }
    
    const parent = field.parentElement;
    if (parent) {
      const textNodes = Array.from(parent.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .filter(text => text.length > 0);
      
      if (textNodes.length > 0) {
        return textNodes.join(' ');
      }
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

function parseCheckboxValue(value) {
  if (typeof value === 'boolean') return value;
  
  const stringValue = String(value).toLowerCase().trim();
  const truthyValues = CONFIG.valueMappings.boolean.true;
  const falseyValues = CONFIG.valueMappings.boolean.false;
  
  if (truthyValues.some(v => stringValue.includes(v))) return true;
  if (falseyValues.some(v => stringValue.includes(v))) return false;
  
  return stringValue.length > 0;
}

function triggerFieldEvents(field, fieldType) {
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
      events.push('input', 'change');
  }
  
  events.forEach(eventType => {
    try {
      field.dispatchEvent(new Event(eventType, { bubbles: true }));
    } catch (e) {}
  });
  
  if (typeof InputEvent !== 'undefined') {
    try {
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        data: field.value || ''
      });
      field.dispatchEvent(inputEvent);
    } catch (e) {}
  }
}

function highlightField(field) {
  field.classList.add('autofill-highlight');
  
  setTimeout(() => {
    field.classList.remove('autofill-highlight');
  }, 2000);
}

function detectAllForms() {
  const formSelectors = [
    'form',
    '[role="form"]',
    '[data-form]',
    '.form',
    '.application-form',
    '.contact-form',
    '.registration-form',
    '.signup-form',
    '.login-form',
    '.checkout-form'
  ];
  
  const forms = [];
  const seen = new Set();
  
  formSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!seen.has(element)) {
        forms.push(element);
        seen.add(element);
      }
    });
  });
  
  return forms;
}

function autoCheckConsentBoxes(form) {
  const consentPatterns = [
    /agree|accept|terms|conditions|privacy|policy|consent|acknowledge|confirm|i agree|i accept/i,
    /newsletter|subscription|updates|notifications|marketing|promotional|opt.?in|sign.?up|subscribe|register/i
  ];
  
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  
  checkboxes.forEach(checkbox => {
    if (!isFieldFillable(checkbox) || checkbox.checked) return;
    
    const context = getFieldContext(checkbox).toLowerCase();
    const isConsent = consentPatterns.some(pattern => pattern.test(context));
    
    if (isConsent) {
      checkbox.checked = true;
      triggerFieldEvents(checkbox, 'checkbox');
    }
  });
}

// ENHANCED: Auto-select dropdown options
function autoSelectCommonOptions(form, profileData) {
  const selects = form.querySelectorAll('select');
  
  selects.forEach(select => {
    if (!isFieldFillable(select) || select.value) return;
    
    const context = getFieldContext(select).toLowerCase();
    
    // Try to match based on field context
    if (context.includes('country') && profileData.country) {
      console.log(`🌐 Trying to match country: ${profileData.country}`);
      selectOption(select, profileData.country);
    } else if (context.includes('state') || context.includes('province') || context.includes('county') || context.includes('region')) {
      if (profileData.state) {
        console.log(`📍 Trying to match state/province: ${profileData.state}`);
        selectOption(select, profileData.state);
      }
    } else if (context.includes('city') && profileData.city) {
      selectOption(select, profileData.city);
    } else if (context.includes('gender') && profileData.gender) {
      console.log(`⚥ Trying to match gender: ${profileData.gender}`);
      selectOption(select, profileData.gender);
    } else if (context.includes('remote') || context.includes('work type') || context.includes('work preference')) {
      if (profileData.remoteWork) {
        console.log(`🏠 Trying to match work location: ${profileData.remoteWork}`);
        selectOption(select, profileData.remoteWork);
      }
    } else if (context.includes('newsletter') || context.includes('subscribe') || context.includes('marketing')) {
      if (profileData.newsletter) {
        console.log(`📧 Trying to match newsletter preference: ${profileData.newsletter}`);
        selectOption(select, profileData.newsletter === 'true' ? 'yes' : 'no');
      }
    }
  });
}

function getFieldContext(field) {
  const contextParts = [
    field.name || '',
    field.id || '',
    field.placeholder || '',
    getFieldLabel(field),
    field.getAttribute('aria-label') || '',
    field.getAttribute('data-label') || '',
    field.getAttribute('title') || '',
    field.className || ''
  ];
  
  return contextParts.filter(Boolean).join(' ').toLowerCase();
}

function showFillNotification(filledCount, formCount) {
  const notification = document.createElement('div');
  notification.className = 'autofill-notification';
  notification.innerHTML = `
    <div class="autofill-notification__icon">✅</div>
    <div class="autofill-notification__content">
      <strong>AutoFill Pro</strong>
      <div>Filled ${filledCount} field${filledCount !== 1 ? 's' : ''} in ${formCount} form${formCount !== 1 ? 's' : ''}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }, CONFIG.notificationDuration);
}

function handleAutoSubmit(sendResponse) {
  try {
    const submitButtons = document.querySelectorAll(`
      input[type="submit"],
      button[type="submit"],
      button:not([type]):not([type="button"]):not([type="reset"]),
      [type="submit"],
      .submit-btn,
      .submit-button,
      [data-submit],
      [onclick*="submit"],
      [onclick*="Submit"]
    `);
    
    let submitted = false;
    
    for (const button of submitButtons) {
      if (isVisible(button) && !button.disabled) {
        try {
          button.click();
          submitted = true;
          break;
        } catch (error) {}
      }
    }
    
    if (!submitted) {
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        try {
          form.submit();
          submitted = true;
          break;
        } catch (error) {}
      }
    }
    
    sendResponse({ submitted, buttonCount: submitButtons.length });
    
  } catch (error) {
    console.error('❌ Auto-submit error:', error);
    sendResponse({ submitted: false, error: error.message });
  }
}

function handleDetectForms(sendResponse) {
  try {
    const forms = document.querySelectorAll(`
      form,
      [role="form"],
      [data-form],
      .form,
      .application-form,
      .contact-form,
      .registration-form,
      .signup-form,
      .login-form,
      .checkout-form,
      .survey-form,
      .questionnaire
    `);
    
    const fields = document.querySelectorAll(`
      input:not([type="hidden"]),
      textarea,
      select,
      [contenteditable="true"]
    `);
    
    sendResponse({
      formsCount: forms.length,
      fieldsCount: fields.length,
      forms: Array.from(forms).map(form => ({
        id: form.id || 'no-id',
        className: form.className,
        fields: form.querySelectorAll('input, textarea, select').length
      }))
    });
    
  } catch (error) {
    console.error('❌ Form detection error:', error);
    sendResponse({ formsCount: 0, fieldsCount: 0, error: error.message });
  }
}

function handleExtractData(sendResponse) {
  console.log('🔍 Extracting data from browser');
  
  const extracted = {};
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    if (!isFieldFillable(input) || !input.value?.trim()) return;
    
    const value = input.value.trim();
    if (value.length < 2 || value.length > 150) return;
    
    const context = getFieldContext(input).toLowerCase();
    
    const patterns = {
      email: /email|e.?mail|mail.?address/i,
      phone: /phone|mobile|tel|cell|contact.?number/i,
      firstName: /first.?name|fname|given.?name|forename/i,
      lastName: /last.?name|lname|surname|family.?name/i,
      address: /address|street|location|addr/i,
      city: /city|town|locality/i,
      state: /state|province|region|county|department/i,
      zipCode: /zip|postal.?code|postcode/i,
      country: /country|nation|nationality/i,
      company: /company|organization|employer|firm/i,
      jobTitle: /title|position|role|occupation|designation/i
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(context)) {
        extracted[key] = value;
        break;
      }
    }
  });
  
  console.log('📤 Extracted data:', extracted);
  sendResponse({ data: extracted });
}

function handleFillForm(profileData, sendResponse) {
  try {
    const result = fillAllForms(profileData);
    sendResponse(result);
  } catch (error) {
    console.error('❌ Fill form error:', error);
    sendResponse({ error: error.message, filled: 0, total: 0 });
  }
}

function fillAllForms(profileData) {
  const startTime = performance.now();
  let filled = 0;
  let total = 0;
  
  const forms = detectAllForms();
  
  forms.forEach(form => {
    const fields = form.querySelectorAll('input, textarea, select');
    total += fields.length;
    
    fields.forEach(field => {
      if (isFieldFillable(field)) {
        const fieldInfo = analyzeField(field);
        const value = findBestMatch(fieldInfo, profileData);
        
        if (value !== null) {
          const success = fillFieldWithValue(field, value, fieldInfo);
          if (success) filled++;
        }
      }
    });
  });
  
  const duration = (performance.now() - startTime).toFixed(2);
  
  return {
    filled: filled,
    total: total,
    forms: forms.length,
    duration: duration,
    success: filled > 0
  };
}

function handleSingleField(fieldInfo, value, sendResponse) {
  try {
    const field = document.querySelector(fieldInfo.selector);
    if (!field) {
      sendResponse({ error: 'Field not found', success: false });
      return;
    }
    
    const success = fillFieldWithValue(field, value, fieldInfo);
    sendResponse({ success: success, value: value });
  } catch (error) {
    sendResponse({ error: error.message, success: false });
  }
}

function isVisible(element) {
  try {
    if (!element) return false;
    if (element.disabled) return false;
    if (element.hidden) return false;
    if (element.getAttribute('type') === 'hidden') return false;
    if (element.style.display === 'none') return false;
    if (element.style.visibility === 'hidden') return false;
    if (element.style.opacity === '0') return false;
    if (element.offsetWidth === 0 && element.offsetHeight === 0) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    
    return true;
  } catch (e) {
    return false;
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .autofill-highlight {
    animation: pulse 0.5s ease-in-out;
    box-shadow: 0 0 0 2px #4CAF50;
    border-color: #4CAF50 !important;
  }
  
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }
`;
document.head.appendChild(style);

// Initialize
console.log('✅ AutoFill Pro content script initialized');