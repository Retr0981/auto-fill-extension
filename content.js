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
    if (input.type === 'email' && !extracted.email)