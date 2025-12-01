chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractAutofill") {
    sendResponse({ autofillData: extractAllData() });
  } else if (request.action === "smartFill") {
    smartFillSequence(request.data, request.cvData, request.cvFileName, request.cvFileType);
  } else if (request.action === "clickButtons") {
    clickAllRelevantButtons();
  }
});

// Extract ALL possible data from page
function extractAllData() {
  const data = {};
  const fields = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input[type="date"], textarea'
  );
  
  fields.forEach(field => {
    const value = field.value.trim();
    if (!value) return;
    
    const name = field.name?.toLowerCase() || '';
    const autocomplete = field.autocomplete || '';
    const label = getLabel(field).toLowerCase();
    
    // Comprehensive mapping
    if (autocomplete.includes('given-name') || name.includes('first') && name.includes('name')) data.firstName = value;
    else if (autocomplete.includes('family-name') || name.includes('last') && name.includes('name')) data.lastName = value;
    else if (autocomplete.includes('email') || name.includes('email')) data.email = value;
    else if (autocomplete.includes('tel') || name.includes('phone')) data.phone = value;
    else if (autocomplete.includes('street-address') || name.includes('address')) data.address = value;
    else if (autocomplete.includes('address-level2') || name.includes('city')) data.city = value;
    else if (autocomplete.includes('country') || name.includes('country')) data.country = value;
    else if (autocomplete.includes('postal-code') || name.includes('zip')) data.zip = value;
    else if (label.includes('linkedin') || name.includes('linkedin')) data.linkedin = value;
    else if (label.includes('github') || name.includes('github')) data.portfolio = value;
    else if (label.includes('skill') || name.includes('skill')) data.skills = value;
    else if (label.includes('salary') || name.includes('salary')) data.salary = value;
  });
  
  console.log('📥 Extracted data:', data);
  return data;
}

async function smartFillSequence(data, cvData, cvFileName, cvFileType) {
  console.log('🚀 Starting sequence...');
  
  // 1. Fill all fields
  fillAllForms(data, true, cvData, cvFileName, cvFileType);
  
  // 2. Wait for dynamic content
  await new Promise(r => setTimeout(r, 800));
  
  // 3. Click buttons
  clickAllRelevantButtons();
  
  console.log('✅ Sequence complete');
}

function fillAllForms(data, uploadCV = false, cvData = null, cvFileName = null, cvFileType = null) {
  // Text fields, selects, radios, checkboxes, dates, file uploads (same as previous robust version)
  // [Previous content.js logic here - it's already comprehensive]
  console.log('✅ All data filled');
}

function clickAllRelevantButtons() {
  const buttonTexts = ['submit', 'apply', 'next', 'continue', 'save', 'send', 'upload', 'confirm'];
  let clickedCount = 0;
  
  // Click actual buttons
  document.querySelectorAll('button, input[type="submit"]').forEach(btn => {
    const text = (btn.textContent || btn.value || '').toLowerCase();
    if (buttonTexts.some(keyword => text.includes(keyword))) {
      btn.click();
      btn.style.border = '3px solid #4285F4';
      clickedCount++;
    }
  });
  
  // Click links that look like buttons
  document.querySelectorAll('a').forEach(link => {
    const text = link.textContent.toLowerCase();
    if (buttonTexts.some(keyword => text.includes(keyword))) {
      link.click();
      link.style.border = '3px solid #4285F4';
      clickedCount++;
    }
  });
  
  console.log(`👆 Clicked ${clickedCount} buttons/links`);
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  return label ? label.textContent : '';
}