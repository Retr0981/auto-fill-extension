// Listen for fill command
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    console.log('🔥 FILLING FORM WITH:', request.data);
    
    const result = fillAllFields(request.data);
    sendResponse(result);
  }
});

function fillAllFields(data) {
  const inputs = document.querySelectorAll('input:not([type=button]):not([type=submit]), textarea, select');
  let filled = 0;
  
  inputs.forEach(input => {
    if (input.disabled || !isVisible(input) || input.value) return;
    
    const value = findMatch(input, data);
    if (value) {
      input.value = value;
      triggerEvents(input);
      filled++;
      input.style.border = '2px solid #4CAF50';
    }
  });
  
  // Handle checkboxes/radios
  document.querySelectorAll('input[type=checkbox]:not(:checked)').forEach(cb => {
    if (isVisible(cb)) {
      cb.checked = true;
      triggerEvents(cb);
    }
  });
  
  console.log(`✅ Filled ${filled} out of ${inputs.length} fields`);
  return { filled: filled, total: inputs.length };
}

function findMatch(field, data) {
  const name = (field.name || field.id || '').toLowerCase();
  const label = getLabel(field).toLowerCase();
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    
    const aliases = FIELD_ALIASES[key] || [key];
    for (const alias of aliases) {
      if (name.includes(alias.toLowerCase()) || label.includes(alias.toLowerCase())) {
        return value;
      }
    }
  }
  
  // Type-based
  if (field.type === 'email' && data.email) return data.email;
  if (field.type === 'tel' && data.phone) return data.phone;
  
  return null;
}

function getLabel(field) {
  if (field.labels?.length) return field.labels[0].textContent;
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent;
  }
  return field.placeholder || '';
}

function triggerEvents(element) {
  ['input', 'change', 'blur'].forEach(ev => {
    element.dispatchEvent(new Event(ev, { bubbles: true }));
  });
}

function isVisible(element) {
  return element.offsetParent !== null;
}