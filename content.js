// Field alias mappings - passed from popup.js
let fieldMappings = {};

// Helper: Check if field matches any alias for a standard key
function matchesAnyAlias(fieldIdentifier, standardKey) {
  if (!fieldIdentifier || !standardKey) return false;
  const aliases = fieldMappings[standardKey] || [standardKey];
  const cleanIdentifier = fieldIdentifier.toLowerCase().replace(/[\s_-]/g, '');
  return aliases.some(alias => alias.toLowerCase().replace(/[\s_-]/g, '') === cleanIdentifier);
}

// Helper: Get matching value for a field by checking name, id, and label
function getMatchingFieldValue(element, data) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const label = getLabel(element).toLowerCase();
  
  for (const [standardKey, standardValue] of Object.entries(data)) {
    if (!standardValue) continue;
    
    const aliases = fieldMappings[standardKey] || [standardKey];
    const matches = aliases.some(alias => 
      name.includes(alias.toLowerCase()) || 
      id.includes(alias.toLowerCase()) || 
      label.includes(alias.toLowerCase())
    );
    
    if (matches) return standardValue;
  }
  return null;
}

// CV Upload Agent - Enhanced with multiple strategies
async function uploadCVAgent(cvData, cvFileName, cvFileType) {
  console.log('🤖 CV Upload Agent: Scanning page for CV fields...');
  
  return new Promise(async (resolve) => {
    const uint8Array = new Uint8Array(cvData);
    const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
    const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
    
    // Strategy 1: Find file inputs directly
    const fileInputs = document.querySelectorAll('input[type="file"]');
    let uploadSuccess = false;
    
    for (const input of fileInputs) {
      const label = getLabel(input).toLowerCase();
      const name = (input.name || '').toLowerCase();
      const parentText = input.parentElement?.textContent?.toLowerCase() || '';
      const placeholder = input.placeholder?.toLowerCase() || '';
      
      // CV field indicators
      const cvKeywords = ['cv', 'resume', 'curriculum', 'vitae', 'résumé', 'uploadfile', 'fileupload'];
      const isCVField = [...cvKeywords, 'cover', 'letter'].some(keyword => 
        label.includes(keyword) || 
        name.includes(keyword) || 
        parentText.includes(keyword) ||
        placeholder.includes(keyword)
      );
      
      // Upload to CV fields OR if only one file input exists
      if (isCVField || fileInputs.length === 1) {
        try {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          
          // Trigger events
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Visual feedback
          input.style.border = '3px solid #34A853';
          input.style.background = '#d4edda';
          input.title = `✅ CV uploaded: ${cvFileName}`;
          
          // Try to update any associated text/label
          const associatedLabel = document.querySelector(`label[for="${input.id}"]`);
          if (associatedLabel) {
            associatedLabel.textContent = `✅ ${cvFileName}`;
            associatedLabel.style.color = '#34A853';
          }
          
          console.log(`✅ CV uploaded to field: ${name || id || 'unnamed'}`);
          uploadSuccess = true;
          
          // Don't break - try to upload to multiple CV fields if they exist
        } catch (error) {
          console.error(`❌ Failed to upload to field: ${name || id}`, error);
        }
      }
    }
    
    // Strategy 2: Click hidden upload buttons (for custom upload widgets)
    if (!uploadSuccess) {
      const uploadButtons = document.querySelectorAll('button, div[role="button"], label');
      for (const button of uploadButtons) {
        const text = (button.textContent || button.innerText || '').toLowerCase();
        if (text.includes('upload') && (text.includes('cv') || text.includes('resume'))) {
          try {
            button.click();
            await sleep(1000); // Wait for file dialog simulation
            
            // Some sites use hidden file inputs triggered by buttons
            const hiddenInput = button.querySelector('input[type="file"]') || 
                               button.parentElement?.querySelector('input[type="file"]');
            if (hiddenInput) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              hiddenInput.files = dataTransfer.files;
              hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              hiddenInput.style.border = '3px solid #34A853';
              console.log('✅ CV uploaded via hidden input');
              uploadSuccess = true;
            }
          } catch (error) {
            console.error('❌ Failed to trigger upload button:', error);
          }
        }
      }
    }
    
    // Strategy 3: Find drag-and-drop zones
    if (!uploadSuccess) {
      const dropZones = document.querySelectorAll('div[dropzone], .dropzone, [class*="drop"], [class*="upload"]');
      for (const zone of dropZones) {
        const text = zone.textContent?.toLowerCase() || '';
        if (text.includes('drop') && (text.includes('cv') || text.includes('resume'))) {
          try {
            // Simulate file drop
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            const dropEvent = new DragEvent('drop', {
              dataTransfer: dataTransfer,
              bubbles: true,
              cancelable: true
            });
            
            zone.dispatchEvent(dropEvent);
            zone.style.border = '3px solid #34A853';
            zone.style.background = '#d4edda';
            
            console.log('✅ CV uploaded via drag-and-drop simulation');
            uploadSuccess = true;
          } catch (error) {
            console.error('❌ Failed to simulate drop:', error);
          }
        }
      }
    }
    
    setTimeout(() => resolve(uploadSuccess), 500);
  });
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced form filling with upload agent integration
async function fillEverything(data, cvData, cvFileName, cvFileType, fieldMappings = {}) {
  console.log('🚀 Smart Fill Agent: Starting...');
  
  // Store field mappings globally for helper functions
  window.fieldMappings = fieldMappings;
  
  // Fill form fields
  fillTextFields(data);
  fillDropdowns(data);
  fillRadioButtons();
  fillCheckboxes();
  fillDateFields(data);
  
  // Upload CV using agent
  if (cvData && cvFileName) {
    const uploaded = await uploadCVAgent(cvData, cvFileName, cvFileType);
    console.log(uploaded ? '✅ CV upload successful' : '⚠️ No CV field found or upload failed');
  }
  
  console.log('✅ ALL elements processed by Smart Fill Agent');
}

// All other functions remain the same as in previous version
function fillTextFields(data) {
  const fields = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], 
    input[type="url"], input[type="number"], textarea
  `);
  
  fields.forEach(field => {
    const value = getMatchingFieldValue(field, data);
    if (value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.style.border = '2px solid #34A853';
    }
  });
}

function fillDropdowns(data) {
  document.querySelectorAll('select').forEach(select => {
    const name = select.name?.toLowerCase() || '';
    const label = getLabel(select).toLowerCase();
    const options = Array.from(select.options);
    
    let valueToSelect = '';
    
    // Country selection
    if (name.includes('country') || label.includes('country')) {
      const option = options.find(opt => 
        opt.text.includes('United States') || opt.value.includes('US') ||
        opt.text.includes('USA') || opt.value.includes('USA')
      );
      if (option) valueToSelect = option.value;
    }
    
    // Experience/Years
    else if (name.includes('year') || name.includes('experience')) {
      const option = options.find(opt => 
        opt.text.includes('5') || opt.value.includes('5') ||
        opt.text.toLowerCase().includes('five')
      );
      if (option) valueToSelect = option.value;
    }
    
    // Generic selection (avoid "Select..." options)
    else if (options.length > 1) {
      const realOptions = options.filter(opt => 
        !opt.text.toLowerCase().includes('select') && 
        !opt.value.toLowerCase().includes('select')
      );
      if (realOptions.length > 0) valueToSelect = realOptions[0].value;
    }
    
    if (valueToSelect) {
      select.value = valueToSelect;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.style.border = '2px solid #34A853';
    }
  });
}

function fillRadioButtons() {
  const groups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.name) {
      if (!groups[radio.name]) groups[radio.name] = [];
      groups[radio.name].push(radio);
    }
  });
  
  Object.values(groups).forEach(group => {
    const priorityValues = ['yes', 'true', '1', 'male', 'full-time', 'remote', 'full time'];
    let toCheck = group.find(r => 
      priorityValues.some(val => r.value.toLowerCase().includes(val))
    );
    if (!toCheck) toCheck = group[group.length - 1];
    
    if (toCheck) {
      toCheck.checked = true;
      toCheck.dispatchEvent(new Event('change', { bubbles: true }));
      toCheck.style.outline = '3px solid #34A853';
    }
  });
}

function fillCheckboxes() {
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    const name = checkbox.name?.toLowerCase() || '';
    const label = getLabel(checkbox).toLowerCase();
    
    // Check these
    const shouldCheck = 
      name.includes('term') || name.includes('agree') || name.includes('consent') || 
      name.includes('remote') || name.includes('eligibility') || name.includes('policy') ||
      name.includes('condition') || name.includes('certify') ||
      label.includes('agree') || label.includes('terms') || label.includes('condition');
    
    // Uncheck these
    const shouldUncheck = 
      name.includes('newsletter') || name.includes('spam') || name.includes('marketing') || 
      name.includes('promo') || name.includes('advert') || name.includes('offer') ||
      label.includes('newsletter') || label.includes('marketing');
    
    if (shouldCheck) {
      checkbox.checked = true;
      checkbox.style.outline = '3px solid #34A853';
    } else if (shouldUncheck) {
      checkbox.checked = false;
    }
    
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function fillDateFields(data) {
  document.querySelectorAll('input[type="date"]').forEach(input => {
    const name = input.name?.toLowerCase() || '';
    const label = getLabel(input).toLowerCase();
    let dateValue = '';
    
    if (name.includes('birth') || label.includes('birth')) {
      dateValue = data.birthDate || '1990-01-01';
    } else if (name.includes('start') || label.includes('start')) {
      dateValue = data.workStartDate || '2020-01-01';
    } else if (name.includes('end') || label.includes('end')) {
      dateValue = data.workEndDate || '2023-12-31';
    }
    
    if (dateValue) {
      input.value = dateValue;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.style.border = '2px solid #34A853';
    }
  });
}

function clickAllButtons() {
  const actions = ['submit', 'apply', 'next', 'continue', 'save', 'send', 'confirm', 'proceed', 'finish'];
  let count = 0;
  
  document.querySelectorAll('button, input[type="submit"], a').forEach(element => {
    const text = (element.textContent || element.value || '').toLowerCase().trim();
    const isButton = element.tagName === 'BUTTON' || element.type === 'submit';
    const hasActionText = actions.some(action => text.includes(action));
    
    // Only click elements that look like submission buttons
    if (isButton && hasActionText && text.length < 30) {
      element.click();
      element.style.border = '3px solid #4285F4';
      element.style.background = '#e8f0fe';
      count++;
    }
  });
  
  console.log(`👆 Clicked ${count} actionable elements`);
}

function verifyAllFields() {
  const allInputs = document.querySelectorAll(`
    input[type="text"], input[type="email"], input[type="tel"], input[type="url"], 
    input[type="number"], input[type="date"], textarea, select, 
    input[type="radio"], input[type="checkbox"]
  `);
  
  let filled = 0, total = 0;
  
  allInputs.forEach(input => {
    if (input.offsetParent === null && input.type !== 'radio' && input.type !== 'checkbox') return;
    
    total++;
    
    let isFilled = false;
    if (input.type === 'radio' || input.type === 'checkbox') {
      isFilled = input.checked;
    } else {
      isFilled = input.value && input.value.trim() !== '';
    }
    
    if (isFilled) {
      filled++;
      input.style.border = '2px solid #34A853';
    } else {
      input.style.border = '2px solid #EA4335';
    }
  });
  
  console.log(`📊 Verification: ${filled}/${total} (${Math.round((filled/total)*100)}%)`);
  return { filled, total };
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent.trim().toLowerCase() : '';
}

// Make functions available globally for debugging
window.autofillPro = {
  fillEverything,
  uploadCVAgent,
  verifyAllFields,
  extractAllData: () => extractAllData(fieldMappings)
};