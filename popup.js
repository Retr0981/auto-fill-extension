// content.js - Ultra-Intelligent Form Filling Engine

let fieldMappings = {};
let formObserver = null;

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize() {
  console.log('🎯 AutoFill Pro: Content script loaded');
  setupFormObserver();
}

// Observe for dynamic forms
function setupFormObserver() {
  formObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        // Check if any added node is a form or contains inputs
        const hasInputs = Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && (node.tagName === 'FORM' || node.querySelector('input, select, textarea'))
        );
        
        if (hasInputs) {
          console.log('🔄 Dynamic form detected');
          // Will be filled when user triggers Smart Fill
        }
      }
    });
  });
  
  formObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  fieldMappings = request.fieldMappings || FIELD_ALIASES;
  
  if (request.action === "smartFill") {
    smartFillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType, request.formType)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async
  } else if (request.action === "verifyFill") {
    sendResponse(verifyAllFields());
  } else if (request.action === "extractAutofill") {
    extractBrowserData().then(sendResponse);
    return true;
  }
});

// Main smart fill function
async function smartFillEverything(data, cvData, cvFileName, cvFileType, formType) {
  console.log(`🚀 INTELLIGENT FILL STARTED for ${formType || 'general form'}`);
  console.log('Available data:', Object.keys(data));
  
  const startTime = performance.now();
  
  // Wait for any dynamic content to load
  await waitForDynamicContent();
  
  // Group fields by confidence
  const fieldGroups = analyzeFormStructure(data, formType);
  
  // Fill in order of confidence
  await fillHighConfidenceFields(fieldGroups.high, data);
  await fillMediumConfidenceFields(fieldGroups.medium, data);
  await fillLowConfidenceFields(fieldGroups.low, data);
  
  // Fill special controls
  await fillCheckboxesIntelligent(data, formType);
  await fillRadioButtonsIntelligent(data, formType);
  await fillDropdownsIntelligent(data, formType);
  await fillDateFields(data);
  
  // Upload CV if available
  if (cvData && cvFileName) {
    await uploadCVAgent(cvData, cvFileName, cvFileType);
  }
  
  const endTime = performance.now();
  console.log(`🏆 FILL COMPLETED in ${Math.round(endTime - startTime)}ms`);
  
  return {
    filled: fieldGroups.high.length + fieldGroups.medium.length,
    total: fieldGroups.high.length + fieldGroups.medium.length + fieldGroups.low.length,
    confidence: 'high'
  };
}

// Wait for dynamic content
async function waitForDynamicContent() {
  return new Promise(resolve => {
    let readyChecks = 0;
    const maxChecks = 10;
    
    const checkReady = () => {
      readyChecks++;
      const loadingElements = document.querySelectorAll('.loading, .spinner, [aria-busy="true"]');
      const isReady = loadingElements.length === 0 || readyChecks >= maxChecks;
      
      if (isReady) {
        resolve();
      } else {
        setTimeout(checkReady, 500);
      }
    };
    
    setTimeout(checkReady, 1000);
  });
}

// Analyze form structure and group fields by confidence
function analyzeFormStructure(data, formType) {
  const inputs = getAllInputFields();
  const groups = { high: [], medium: [], low: [] };
  
  inputs.forEach(field => {
    const confidence = calculateFieldConfidence(field, data, formType);
    
    if (confidence > 80) groups.high.push(field);
    else if (confidence > 50) groups.medium.push(field);
    else groups.low.push(field);
    
    field.dataset.confidence = confidence;
  });
  
  console.log(`📊 Field Analysis: ${groups.high.length} high, ${groups.medium.length} medium, ${groups.low.length} low confidence`);
  
  return groups;
}

// Calculate confidence score for a field
function calculateFieldConfidence(field, data, formType) {
  let score = 0;
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const type = field.type || 'text';
  
  // Check for exact matches
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const aliases = fieldMappings[key] || [key];
    
    aliases.forEach(alias => {
      const aliasLower = alias.toLowerCase();
      if (name === aliasLower || id === aliasLower) {
        score += 100;
      } else if (name.includes(aliasLower) || id.includes(aliasLower)) {
        score += 80;
      } else if (label.includes(aliasLower) || placeholder.includes(aliasLower)) {
        score += 60;
      }
    });
  }
  
  // Boost score for form type specific fields
  if (formType === 'jobApplication') {
    const jobFields = ['position', 'company', 'experience', 'skills', 'salary'];
    if (jobFields.some(f => name.includes(f) || label.includes(f))) {
      score += 20;
    }
  }
  
  // Penalize hidden fields
  if (type === 'hidden' || field.offsetParent === null) {
    score -= 50;
  }
  
  return Math.min(100, score);
}

// Fill fields with high confidence
async function fillHighConfidenceFields(fields, data) {
  console.log(`🔥 Filling ${fields.length} high-confidence fields`);
  
  for (const field of fields) {
    const value = getMatchingValueIntelligent(field, data);
    if (value) {
      await fillField(field, value);
      field.style.border = '3px solid #4CAF50';
      field.style.background = '#E8F5E9';
      console.log(`  ✅ HIGH: ${field.name || field.id} = "${value}"`);
    }
    await sleep(50); // Small delay for responsiveness
  }
}

// Fill medium confidence fields
async function fillMediumConfidenceFields(fields, data) {
  console.log(`🔶 Filling ${fields.length} medium-confidence fields`);
  
  for (const field of fields) {
    const value = getMatchingValueIntelligent(field, data) || getSmartDefault(field);
    if (value) {
      await fillField(field, value);
      field.style.border = '3px solid #FF9800';
      field.style.background = '#FFE0B2';
      console.log(`  ⚠️ MEDIUM: ${field.name || field.id} = "${value}"`);
    }
    await sleep(30);
  }
}

// Fill low confidence fields with defaults
async function fillLowConfidenceFields(fields, data) {
  console.log(`⚪ Skipping ${fields.length} low-confidence fields (use defaults if needed)`);
  
  // Only fill if required field
  for (const field of fields) {
    if (field.required) {
      const value = getSmartDefault(field);
      if (value) {
        await fillField(field, value);
        field.style.border = '3px solid #2196F3';
        console.log(`  🔷 DEFAULT: ${field.name || field.id} = "${value}"`);
      }
    }
  }
}

// Get smart default based on field type
function getSmartDefault(field) {
  const name = (field.name || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  
  if (name.includes('country') || label.includes('country')) {
    return SMART_DEFAULTS.country[0];
  }
  
  if (name.includes('experience') || label.includes('experience')) {
    return SMART_DEFAULTS.experience[0];
  }
  
  if (name.includes('availability') || label.includes('availability')) {
    return SMART_DEFAULTS.availability[0];
  }
  
  if (name.includes('salary') || label.includes('salary') || name.includes('compensation')) {
    return SMART_DEFAULTS.salary[0];
  }
  
  if (name.includes('type') && (label.includes('work') || label.includes('employment'))) {
    return SMART_DEFAULTS.workType[0];
  }
  
  return '';
}

// Get all input fields
function getAllInputFields() {
  return Array.from(document.querySelectorAll(`
    input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([disabled]),
    textarea:not([disabled]),
    select:not([disabled])
  `)).filter(field => field.offsetParent !== null);
}

// Intelligent field matching
function getMatchingValueIntelligent(field, data) {
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const type = field.type || 'text';
  
  // Create search string
  const searchContext = `${name} ${id} ${label} ${placeholder}`;
  
  // Score each data field
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    
    const aliases = fieldMappings[key] || [key];
    let score = 0;
    
    aliases.forEach(alias => {
      const aliasLower = alias.toLowerCase();
      const distance = levenshteinDistance(searchContext, aliasLower);
      
      if (searchContext.includes(aliasLower)) {
        score = Math.max(score, 100 - distance);
      }
      
      // Check individual components
      if (name.includes(aliasLower) || id.includes(aliasLower)) score = Math.max(score, 90);
      if (label.includes(aliasLower) || placeholder.includes(aliasLower)) score = Math.max(score, 70);
    });
    
    // Boost for form-specific fields
    if (key === 'email' && type === 'email') score += 20;
    if (key === 'phone' && type === 'tel') score += 20;
    
    if (score > bestScore && score > 60) {
      bestScore = score;
      bestMatch = value;
    }
  }
  
  return bestMatch;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  if (str1.length < str2.length) return levenshteinDistance(str2, str1);
  if (str2.length === 0) return str1.length;
  
  let previousRow = Array.from({ length: str2.length + 1 }, (_, i) => i);
  
  for (let i = 0; i < str1.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < str2.length; j++) {
      const cost = str1[i] === str2[j] ? 0 : 1;
      currentRow.push(
        Math.min(
          previousRow[j + 1] + 1,
          currentRow[j] + 1,
          previousRow[j] + cost
        )
      );
    }
    previousRow = currentRow;
  }
  
  return previousRow[previousRow.length - 1];
}

// Fill a single field with events
async function fillField(field, value) {
  field.focus();
  
  // Handle different field types
  if (field.tagName === 'SELECT') {
    await fillSelect(field, value);
  } else if (field.tagName === 'TEXTAREA') {
    field.value = value;
  } else {
    // Input field
    field.value = value;
  }
  
  // Trigger all necessary events
  triggerEvents(field);
  
  // Blur to trigger validation
  field.blur();
  await sleep(30);
}

// Fill select dropdown intelligently
async function fillSelect(select, value) {
  const options = Array.from(select.options);
  let targetOption = null;
  
  // Exact match
  targetOption = options.find(opt => 
    opt.value.toLowerCase() === value.toLowerCase() ||
    opt.text.toLowerCase() === value.toLowerCase()
  );
  
  // Partial match
  if (!targetOption) {
    targetOption = options.find(opt => 
      opt.value.toLowerCase().includes(value.toLowerCase()) ||
      opt.text.toLowerCase().includes(value.toLowerCase())
    );
  }
  
  // Smart fallback for common fields
  if (!targetOption) {
    const name = (select.name || '').toLowerCase();
    
    if (name.includes('country')) {
      targetOption = options.find(opt => 
        SMART_DEFAULTS.country.some(c => 
          opt.text.includes(c) || opt.value.includes(c)
        )
      );
    } else if (name.includes('year') || name.includes('experience')) {
      targetOption = options.find(opt => 
        parseInt(opt.value) >= 3 || parseInt(opt.text) >= 3
      );
    }
  }
  
  // Select first non-placeholder if still no match
  if (!targetOption) {
    targetOption = options.find(opt => 
      !opt.text.toLowerCase().includes('select') && 
      !opt.value.toLowerCase().includes('select') &&
      opt.value.trim() !== '' &&
      opt.value !== '0'
    );
  }
  
  if (targetOption) {
    select.value = targetOption.value;
  }
}

// Intelligent checkbox filling
async function fillCheckboxesIntelligent(data, formType) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
  console.log(`☑️ Processing ${checkboxes.length} checkboxes intelligently`);
  
  for (const checkbox of checkboxes) {
    const name = (checkbox.name || '').toLowerCase();
    const label = getLabel(checkbox);
    const key = `${name} ${label}`.toLowerCase();
    
    let shouldCheck = false;
    let shouldUncheck = false;
    
    // Form type specific logic
    if (formType === 'jobApplication') {
      // Check positive fields
      shouldCheck = ['agree', 'accept', 'consent', 'certify', 'confirm', 'true', 'yes', 'on'].some(k => 
        key.includes(k)
      );
      
      // Uncheck marketing spam
      shouldUncheck = ['newsletter', 'spam', 'marketing', 'promo', 'advert', 'notification', 'offer'].some(k => 
        key.includes(k)
      );
    }
    
    // Apply decision
    if (shouldUncheck) {
      checkbox.checked = false;
      checkbox.style.outline = '3px solid #f44336';
    } else if (shouldCheck) {
      checkbox.checked = true;
      triggerEvents(checkbox);
      checkbox.style.outline = '3px solid #4CAF50';
    }
    
    await sleep(20);
  }
}

// Intelligent radio button filling
async function fillRadioButtonsIntelligent(data, formType) {
  const radioGroups = {};
  
  document.querySelectorAll('input[type="radio"]:not([disabled])').forEach(radio => {
    if (radio.name) {
      radioGroups[radio.name] = radioGroups[radio.name] || [];
      radioGroups[radio.name].push(radio);
    }
  });
  
  console.log(`⭕ Processing ${Object.keys(radioGroups).length} radio groups intelligently`);
  
  for (const [groupName, radios] of Object.entries(radioGroups)) {
    if (radios.length === 0) continue;
    
    let selectedRadio = null;
    
    // Form-specific selection
    if (formType === 'jobApplication') {
      // Prefer positive/employable options
      const preferences = ['yes', 'true', '1', 'agree', 'accept', 'full-time', 'remote', 'immediate', 'available'];
      selectedRadio = radios.find(r => 
        preferences.some(p => r.value.toLowerCase().includes(p))
      );
    }
    
    // Fall back to data matching
    if (!selectedRadio) {
      for (const [key, value] of Object.entries(data)) {
        if (!value) continue;
        
        selectedRadio = radios.find(r => 
          r.value.toLowerCase() === value.toLowerCase() ||
          (['yes', 'true', '1'].includes(value.toLowerCase()) && 
           ['yes', 'true', '1', 'agree'].some(v => r.value.toLowerCase().includes(v)))
        );
        
        if (selectedRadio) break;
      }
    }
    
    // Final fallback: select first
    if (!selectedRadio) {
      selectedRadio = radios[0];
    }
    
    if (selectedRadio) {
      selectedRadio.checked = true;
      triggerEvents(selectedRadio);
      selectedRadio.style.outline = '3px solid #FF9800';
      console.log(`  ✅ RADIO: ${groupName} = "${selectedRadio.value}"`);
    }
    
    await sleep(30);
  }
}

// Intelligent dropdown filling
async function fillDropdownsIntelligent(data, formType) {
  const selects = document.querySelectorAll('select:not([disabled])');
  console.log(`🔽 Processing ${selects.length} dropdowns intelligently`);
  
  for (const select of selects) {
    const value = getMatchingValueIntelligent(select, data) || getSmartDefault(select);
    if (value) {
      await fillSelect(select, value);
      select.style.border = '3px solid #2196F3';
      console.log(`  ✅ DROPDOWN: ${select.name || select.id} = "${value}"`);
    }
    await sleep(30);
  }
}

// Fill date fields
async function fillDateFields(data) {
  const dateInputs = document.querySelectorAll('input[type="date"]:not([disabled])');
  console.log(`📅 Processing ${dateInputs.length} date fields`);
  
  for (const input of dateInputs) {
    const name = input.name?.toLowerCase() || '';
    let dateValue = '';
    
    if (name.includes('birth')) dateValue = data.birthDate || '1990-01-01';
    else if (name.includes('start')) dateValue = data.workStartDate || '2020-01-01';
    else if (name.includes('end')) dateValue = data.workEndDate || '2023-12-31';
    else if (name.includes('graduation')) dateValue = data.graduationYear + '-06-01' || '2020-06-01';
    else dateValue = '2024-01-01';
    
    input.value = dateValue;
    triggerEvents(input);
    input.style.border = '3px solid #9C27B0';
    console.log(`  📅 DATE: ${input.name || input.id} = ${dateValue}`);
    
    await sleep(30);
  }
}

// CV Upload Agent
async function uploadCVAgent(cvData, cvFileName, cvFileType) {
  console.log('📎 CV Upload Agent: Starting...');
  
  // Convert base64 back to blob
  const base64Response = await fetch(cvData);
  const blob = await base64Response.blob();
  const file = new File([blob], cvFileName, { type: cvFileType });
  
  const fileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');
  
  for (const input of fileInputs) {
    const name = (input.name || '').toLowerCase();
    const label = getLabel(input).toLowerCase();
    
    const isCVField = ['cv', 'resume', 'curriculum', 'vitae', 'document', 'upload'].some(k => 
      name.includes(k) || label.includes(k)
    );
    
    if (isCVField || fileInputs.length === 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      triggerEvents(input);
      
      input.style.border = '3px solid #FF9800';
      input.style.background = '#FFE0B2';
      console.log(`  ✅ CV UPLOADED: ${cvFileName} → ${name || label}`);
      return true;
    }
  }
  
  console.log('  ⚠️ No CV upload field found');
  return false;
}

// Extract browser autofill data
async function extractBrowserData() {
  const data = {};
  
  // Look for common autofill attributes
  const fields = document.querySelectorAll('input[autocomplete]');
  fields.forEach(field => {
    const autocomplete = field.autocomplete;
    const value = field.value.trim();
    
    if (value && autocomplete) {
      // Map autocomplete to our field names
      const mapping = {
        'given-name': 'firstName',
        'family-name': 'lastName',
        'email': 'email',
        'tel': 'phone',
        'street-address': 'address',
        'address-level2': 'city',
        'address-level1': 'state',
        'postal-code': 'zip',
        'country': 'country',
        'organization': 'company',
        'organization-title': 'position'
      };
      
      if (mapping[autocomplete]) {
        data[mapping[autocomplete]] = value;
      }
    }
  });
  
  return { autofillData: data };
}

// Get label for field
function getLabel(field) {
  // Try multiple methods to find label
  if (field.labels && field.labels.length > 0) {
    return field.labels[0].textContent.trim();
  }
  
  // Check for aria-labelledby
  if (field.getAttribute('aria-labelledby')) {
    const labelId = field.getAttribute('aria-labelledby');
    const labelElement = document.getElementById(labelId);
    if (labelElement) return labelElement.textContent.trim();
  }
  
  // Check for associated label
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Check parent text
  let parent = field.parentElement;
  for (let i = 0; i < 3 && parent; i++) {
    const text = parent.textContent.trim();
    if (text.length > 2 && text.length < 100) {
      return text;
    }
    parent = parent.parentElement;
  }
  
  return '';
}

// Trigger all events
function triggerEvents(element) {
  const events = ['input', 'change', 'blur', 'keyup', 'keydown', 'focus'];
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  });
  
  // Trigger React/Angular specific events if present
  if (element._valueTracker) {
    element._valueTracker.setValue('');
  }
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Verify all fields
function verifyAllFields() {
  const inputs = document.querySelectorAll('input, textarea, select');
  let filled = 0, total = 0;
  
  inputs.forEach(input => {
    if (input.offsetParent === null) return;
    total++;
    
    const isFilled = input.type === 'radio' || input.type === 'checkbox' 
      ? input.checked 
      : (input.value && input.value.trim().length > 0);
    
    if (isFilled) filled++;
    
    // Visual feedback
    if (input.type !== 'radio' && input.type !== 'checkbox' && input.type !== 'file') {
      input.style.border = isFilled ? '3px solid #4CAF50' : '3px solid #f44336';
    }
  });
  
  console.log(`📊 VERIFICATION: ${filled}/${total} (${Math.round(filled/total*100)}%)`);
  
  // Show summary
  const summary = `Filled: ${filled}/${total} (${Math.round(filled/total*100)}%)`;
  showVisualSummary(summary, filled, total);
  
  return { filled, total };
}

// Show visual summary
function showVisualSummary(summary, filled, total) {
  // Remove old summary if exists
  const oldSummary = document.getElementById('autofill-summary');
  if (oldSummary) oldSummary.remove();
  
  // Create new summary
  const summaryDiv = document.createElement('div');
  summaryDiv.id = 'autofill-summary';
  summaryDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${filled/total > 0.8 ? '#4CAF50' : filled/total > 0.5 ? '#FF9800' : '#f44336'};
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 999999;
    font-family: system-ui;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  
  summaryDiv.innerHTML = `
    <strong>🎯 AutoFill Complete!</strong><br>
    ${summary}<br>
    <small>Click to dismiss</small>
  `;
  
  summaryDiv.addEventListener('click', () => summaryDiv.remove());
  document.body.appendChild(summaryDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (summaryDiv.parentElement) {
      summaryDiv.remove();
    }
  }, 5000);
}

// Add slideIn animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);