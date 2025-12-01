// content.js - Ultra-Intelligent Form Filling Engine

// Configuration loaded from config.js
let fieldMappings = FIELD_ALIASES;

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize() {
  console.log('🎯 AutoFill Pro: Content script active');
  setupFormObserver();
}

// Watch for dynamic forms
function setupFormObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        const hasInputs = Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && node.querySelector?.('input, select, textarea')
        );
        if (hasInputs) console.log('🔄 Dynamic form detected');
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  fieldMappings = request.fieldMappings || FIELD_ALIASES;
  
  if (request.action === "smartFill") {
    smartFillEverything(request.data, request.cvData, request.cvFileName, request.cvFileType, request.formType)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  } else if (request.action === "verifyFill") {
    sendResponse(verifyAllFields());
  } else if (request.action === "extractAutofill") {
    extractBrowserData().then(sendResponse);
    return true;
  }
});

// Main fill function
async function smartFillEverything(data, cvData, cvFileName, cvFileType, formType) {
  console.log(`🚀 Filling ${formType || 'form'} with ${Object.keys(data).length} fields`);
  
  await waitForDynamicContent();
  
  const fieldGroups = analyzeFormConfidence(data, formType);
  
  // Fill in order
  await fillHighConfidenceFields(fieldGroups.high, data);
  await fillMediumConfidenceFields(fieldGroups.medium, data);
  await fillLowConfidenceFields(fieldGroups.low, data);
  
  // Fill special controls
  await fillCheckboxesIntelligent(data, formType);
  await fillRadioButtonsIntelligent(data, formType);
  await fillDropdownsIntelligent(data, formType);
  await fillDateFields(data);
  
  // Upload CV
  if (cvData && cvFileName) {
    await uploadCVAgent(cvData, cvFileName, cvFileType);
  }
  
  return verifyAllFields();
}

// Wait for dynamic content
async function waitForDynamicContent() {
  return new Promise(resolve => {
    let checks = 0;
    const check = () => {
      checks++;
      const loading = document.querySelectorAll('.loading, .spinner, [aria-busy="true"]');
      if (loading.length === 0 || checks > 10) resolve();
      else setTimeout(check, 500);
    };
    setTimeout(check, 300);
  });
}

// Analyze form confidence
function analyzeFormConfidence(data, formType) {
  const inputs = getAllVisibleFields();
  const groups = { high: [], medium: [], low: [] };
  
  inputs.forEach(field => {
    const score = calculateFieldConfidence(field, data, formType);
    if (score > 75) groups.high.push(field);
    else if (score > 50) groups.medium.push(field);
    else groups.low.push(field);
    field.dataset.confidence = score;
  });
  
  console.log(`📊 Confidence: ${groups.high.length} high, ${groups.medium.length} medium, ${groups.low.length} low`);
  return groups;
}

// Calculate field confidence
function calculateFieldConfidence(field, data, formType) {
  let score = 0;
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  const context = `${name} ${id} ${label}`;
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const aliases = fieldMappings[key] || [key];
    
    aliases.forEach(alias => {
      const aliasLower = alias.toLowerCase();
      if (name === aliasLower || id === aliasLower) score += 100;
      else if (name.includes(aliasLower) || id.includes(aliasLower)) score += 80;
      else if (label.includes(aliasLower)) score += 60;
      
      // Fuzzy match
      if (levenshteinDistance(context, aliasLower) < 3) score += 40;
    });
  }
  
  // Form bonuses
  if (formType === 'jobApplication') {
    if (['position', 'company', 'experience', 'salary'].some(f => context.includes(f))) score += 20;
  }
  
  return Math.min(100, score);
}

// Fill high confidence
async function fillHighConfidenceFields(fields, data) {
  for (const field of fields) {
    const value = getMatchingValueIntelligent(field, data);
    if (value) {
      await fillField(field, value);
      field.style.border = '3px solid #4CAF50';
    }
    await sleep(30);
  }
}

// Fill medium confidence
async function fillMediumConfidenceFields(fields, data) {
  for (const field of fields) {
    const value = getMatchingValueIntelligent(field, data) || getSmartDefault(field);
    if (value) {
      await fillField(field, value);
      field.style.border = '3px solid #FF9800';
    }
    await sleep(30);
  }
}

// Fill low confidence (only required)
async function fillLowConfidenceFields(fields, data) {
  for (const field of fields) {
    if (field.required) {
      const value = getSmartDefault(field);
      if (value) {
        await fillField(field, value);
        field.style.border = '3px solid #2196F3';
      }
    }
  }
}

// Get visible fields
function getAllVisibleFields() {
  return Array.from(document.querySelectorAll(`
    input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([disabled]),
    textarea:not([disabled]),
    select:not([disabled])
  `)).filter(f => f.offsetParent !== null);
}

// Intelligent field matching
function getMatchingValueIntelligent(field, data) {
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  const context = `${name} ${id} ${label}`;
  
  let bestMatch = null;
  let bestScore = 60;
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const aliases = fieldMappings[key] || [key];
    
    aliases.forEach(alias => {
      const aliasLower = alias.toLowerCase();
      const strategies = [
        () => context.includes(aliasLower) ? 100 : 0,
        () => name.includes(aliasLower) ? 90 : 0,
        () => label.includes(aliasLower) ? 70 : 0,
        () => levenshteinDistance(context, aliasLower) < 3 ? 50 : 0
      ];
      const score = Math.max(...strategies.map(s => s()));
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = value;
      }
    });
  }
  
  return bestMatch;
}

// Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[str2.length][str1.length];
}

// Fill single field
async function fillField(field, value) {
  field.focus();
  
  if (field.tagName === 'SELECT') {
    await fillSelect(field, value);
  } else {
    field.value = value;
  }
  
  ['input', 'change', 'blur'].forEach(event => {
    field.dispatchEvent(new Event(event, { bubbles: true }));
  });
  
  if (field._valueTracker) field._valueTracker.setValue('');
  field.blur();
  await sleep(30);
}

// Fill select
async function fillSelect(select, value) {
  const options = Array.from(select.options);
  let target = null;
  
  const strategies = [
    () => options.find(o => o.value.toLowerCase() === value.toLowerCase()),
    () => options.find(o => o.text.toLowerCase() === value.toLowerCase()),
    () => options.find(o => o.value.toLowerCase().includes(value.toLowerCase())),
    () => options.find(o => o.text.toLowerCase().includes(value.toLowerCase()))
  ];
  
  for (const strategy of strategies) {
    target = strategy();
    if (target) break;
  }
  
  if (!target) {
    const name = (select.name || '').toLowerCase();
    if (name.includes('country')) {
      target = options.find(o => SMART_DEFAULTS.country.some(c => o.text.includes(c)));
    } else if (name.includes('experience') || name.includes('year')) {
      target = options.find(o => parseInt(o.value) >= 3);
    } else {
      target = options.find(o => !o.text.toLowerCase().includes('select') && o.value);
    }
  }
  
  if (target) {
    select.value = target.value;
    triggerEvents(select);
  }
}

// Intelligent checkbox filling
async function fillCheckboxesIntelligent(data, formType) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
  
  for (const checkbox of checkboxes) {
    const name = (checkbox.name || '').toLowerCase();
    const label = getLabel(checkbox);
    const context = `${name} ${label}`.toLowerCase();
    
    let shouldCheck = false;
    let shouldUncheck = false;
    
    if (formType === 'jobApplication') {
      shouldCheck = ['agree', 'accept', 'consent', 'certify', 'confirm', 'eligible'].some(k => context.includes(k));
      shouldUncheck = ['newsletter', 'spam', 'marketing', 'promo', 'notification'].some(k => context.includes(k));
    }
    
    if (shouldUncheck) checkbox.checked = false;
    else if (shouldCheck) {
      checkbox.checked = true;
      triggerEvents(checkbox);
      checkbox.style.outline = '3px solid #4CAF50';
    }
    
    await sleep(20);
  }
}

// Intelligent radio filling
async function fillRadioButtonsIntelligent(data, formType) {
  const groups = {};
  document.querySelectorAll('input[type="radio"]:not([disabled])').forEach(radio => {
    if (radio.name) groups[radio.name] = [...(groups[radio.name]||[]), radio];
  });
  
  for (const radios of Object.values(groups)) {
    let selected = null;
    
    if (formType === 'jobApplication') {
      const prefs = ['yes', 'true', 'accept', 'full-time', 'remote', 'immediate'];
      selected = radios.find(r => prefs.some(p => r.value.toLowerCase().includes(p)));
    }
    
    if (!selected) {
      for (const [key, value] of Object.entries(data)) {
        if (!value) continue;
        selected = radios.find(r => r.value.toLowerCase() === value.toLowerCase());
        if (selected) break;
      }
    }
    
    if (!selected) selected = radios[0];
    
    if (selected) {
      selected.checked = true;
      triggerEvents(selected);
      selected.style.outline = '3px solid #FF9800';
    }
    
    await sleep(30);
  }
}

// Intelligent dropdown filling
async function fillDropdownsIntelligent(data, formType) {
  const selects = document.querySelectorAll('select:not([disabled])');
  
  for (const select of selects) {
    const value = getMatchingValueIntelligent(select, data) || getSmartDefault(select);
    if (value) {
      await fillSelect(select, value);
      select.style.border = '3px solid #2196F3';
    }
    await sleep(30);
  }
}

// Fill date fields
async function fillDateFields(data) {
  const dateInputs = document.querySelectorAll('input[type="date"]:not([disabled])');
  
  for (const input of dateInputs) {
    const name = input.name?.toLowerCase() || '';
    let dateValue = '';
    
    if (name.includes('birth')) dateValue = data.birthDate || '1990-01-01';
    else if (name.includes('start')) dateValue = data.workStartDate || '2020-01-01';
    else if (name.includes('end')) dateValue = data.workEndDate || '2023-12-31';
    else if (name.includes('graduation')) dateValue = `${data.graduationYear || '2020'}-06-01`;
    else dateValue = '2024-01-01';
    
    input.value = dateValue;
    triggerEvents(input);
    input.style.border = '3px solid #9C27B0';
    await sleep(30);
  }
}

// Get smart defaults
function getSmartDefault(field) {
  const name = (field.name || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  
  if (name.includes('country')) return SMART_DEFAULTS.country[0];
  if (name.includes('experience')) return SMART_DEFAULTS.experience[0];
  if (name.includes('availability')) return SMART_DEFAULTS.availability[0];
  if (name.includes('salary')) return SMART_DEFAULTS.salary[0];
  if (name.includes('type') && label.includes('work')) return SMART_DEFAULTS.workType[0];
  return '';
}

// CV Upload Agent
async function uploadCVAgent(cvData, cvFileName, cvFileType) {
  console.log('📎 Uploading CV...');
  
  const response = await fetch(cvData);
  const blob = await response.blob();
  const file = new File([blob], cvFileName, { type: cvFileType });
  
  const fileInputs = document.querySelectorAll('input[type="file"]:not([disabled])');
  
  for (const input of fileInputs) {
    const name = (input.name || '').toLowerCase();
    const label = getLabel(input).toLowerCase();
    
    const isCVField = ['cv', 'resume', 'document', 'upload'].some(k => 
      name.includes(k) || label.includes(k)
    );
    
    if (isCVField || fileInputs.length === 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      triggerEvents(input);
      input.style.border = '3px solid #FF9800';
      console.log(`  ✅ CV uploaded: ${cvFileName}`);
      return true;
    }
  }
  return false;
}

// Extract browser autofill
async function extractBrowserData() {
  const data = {};
  const fields = document.querySelectorAll('input[autocomplete]');
  
  fields.forEach(field => {
    const value = field.value.trim();
    if (value) {
      const mapping = {
        'given-name': 'firstName',
        'family-name': 'lastName',
        'email': 'email',
        'tel': 'phone',
        'street-address': 'address',
        'address-level2': 'city',
        'postal-code': 'zip',
        'organization': 'company',
        'organization-title': 'position'
      };
      if (mapping[field.autocomplete]) {
        data[mapping[field.autocomplete]] = value;
      }
    }
  });
  
  return { autofillData: data };
}

// Get label text
function getLabel(field) {
  if (field.labels?.length > 0) return field.labels[0].textContent.trim();
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent.trim();
  }
  return field.parentElement?.textContent.trim().slice(0, 100) || '';
}

// Trigger events
function triggerEvents(element) {
  ['input', 'change', 'blur'].forEach(event => {
    element.dispatchEvent(new Event(event, { bubbles: true }));
  });
}

// Sleep helper
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
  
  // Show completion popup
  const percent = Math.round((filled/total) * 100);
  showCompletionPopup(percent, filled, total);
  
  return { filled, total };
}

// Show completion popup
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
  
  setTimeout(() => popup.remove(), 5000);
}