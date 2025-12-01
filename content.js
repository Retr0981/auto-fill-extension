// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm" || request.action === "fillAndUploadCV") {
    fillAllForms(request.data, request.action === "fillAndUploadCV");
  }
});

function fillAllForms(data, uploadCV = false) {
  console.log("🤖 Starting form fill...");
  
  // TEXT INPUTS & TEXTAREAS
  const textFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea');
  textFields.forEach(field => {
    const name = field.name.toLowerCase();
    const placeholder = field.placeholder.toLowerCase();
    const label = getLabel(field).toLowerCase();
    
    if (name.includes('name') && !name.includes('company')) {
      if (name.includes('first') || label.includes('first')) field.value = data.firstName;
      else if (name.includes('last') || name.includes('sur') || label.includes('last')) field.value = data.lastName;
      else field.value = `${data.firstName} ${data.lastName}`;
    }
    else if (name.includes('email') || placeholder.includes('email')) field.value = data.email;
    else if (name.includes('phone') || name.includes('mobile') || placeholder.includes('phone')) field.value = data.phone;
    else if (name.includes('linkedin') || placeholder.includes('linkedin')) field.value = data.linkedin;
    else if (name.includes('portfolio') || name.includes('github') || name.includes('website')) field.value = data.portfolio;
    else if (name.includes('address')) field.value = data.address;
    else if (name.includes('summary') || name.includes('about') || field.tagName === 'TEXTAREA') field.value = data.summary;
    else if (name.includes('degree') || name.includes('education')) field.value = data.degree;
    else if (name.includes('university') || name.includes('college')) field.value = data.university;
    else if (name.includes('graduation') || name.includes('year')) field.value = data.graduationYear;
    else if (name.includes('company') || name.includes('employer')) field.value = data.company;
    else if (name.includes('position') || name.includes('title')) field.value = data.position;
    else if (name.includes('skill')) field.value = data.skills;
    
    // Trigger change event
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // DROPDOWNS & SELECTS
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    const name = select.name.toLowerCase();
    const options = Array.from(select.options);
    
    if (name.includes('country')) {
      const usaOption = options.find(opt => opt.text.includes('United States') || opt.value.includes('US'));
      if (usaOption) select.value = usaOption.value;
    }
    else if (name.includes('year') || name.includes('experience')) {
      const option = options.find(opt => opt.text.includes('5') || opt.value.includes('5'));
      if (option) select.value = option.value;
    }
    else {
      // Select second option if exists (usually not "Select...")
      if (options.length > 1) select.value = options[1].value;
    }
    
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // RADIO BUTTONS
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    const name = radio.name;
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  });
  
  Object.values(radioGroups).forEach(group => {
    // Check the first or second option (usually "Yes" or positive answer)
    const positiveOption = group.find(r => 
      r.value.toLowerCase() === 'yes' || 
      r.value === '1' || 
      r.id.includes('yes')
    );
    if (positiveOption) positiveOption.checked = true;
    else if (group.length > 1) group[1].checked = true;
    else if (group.length === 1) group[0].checked = true;
  });

  // CHECKBOXES
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    const name = checkbox.name.toLowerCase();
    const id = checkbox.id.toLowerCase();
    
    // Check boxes related to terms, newsletter, or remote work
    if (name.includes('term') || name.includes('agree') || name.includes('consent') || 
        id.includes('term') || id.includes('agree')) {
      checkbox.checked = true;
    }
    // Uncheck newsletter boxes
    else if (name.includes('newsletter') || id.includes('newsletter')) {
      checkbox.checked = false;
    }
  });

  // FILE UPLOAD (CV)
  if (uploadCV) {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      const label = getLabel(input).toLowerCase();
      if (label.includes('cv') || label.includes('resume') || 
          input.accept.includes('pdf') || input.accept.includes('doc')) {
        handleFileUpload(input);
      }
    });
  }
  
  console.log("✅ Form filling complete!");
}

// Helper function to get label text
function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  if (label) return label.textContent;
  return '';
}

// File upload simulation (requires user interaction due to browser security)
function handleFileUpload(inputElement) {
  // IMPORTANT: Due to browser security, we can't set file value programmatically
  // We can only help user by clicking the input
  inputElement.style.border = '3px solid #4285F4';
  inputElement.style.padding = '5px';
  inputElement.style.backgroundColor = '#E3F2FD';
  inputElement.title = 'CLICK HERE to upload your CV';
  
  // Show alert to guide user
  alert('🔵 Please CLICK on the BLUE HIGHLIGHTED file input to manually select your CV file.\n\n⚠️ Browser security prevents automatic file selection');
}