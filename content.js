chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm" || request.action === "fillAndUploadCV") {
    fillAllForms(request.data, request.action === "fillAndUploadCV", request.cvData, request.cvFileName, request.cvFileType);
  }
});

function fillAllForms(data, uploadCV = false, cvData = null, cvFileName = null, cvFileType = null) {
  console.log("🤖 Starting intelligent form fill...");
  
  // TEXT INPUTS & TEXTAREAS
  const textFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], textarea');
  textFields.forEach(field => {
    const name = field.name?.toLowerCase() || '';
    const placeholder = field.placeholder?.toLowerCase() || '';
    const label = getLabel(field).toLowerCase();
    
    let value = '';
    
    // Smart field matching
    if (name.includes('first') && name.includes('name')) value = data.firstName;
    else if ((name.includes('last') || name.includes('sur')) && name.includes('name')) value = data.lastName;
    else if (name.includes('name') && !name.includes('company')) value = `${data.firstName} ${data.lastName}`;
    else if (name.includes('email')) value = data.email;
    else if (name.includes('phone') || name.includes('mobile') || name.includes('contact')) value = data.phone;
    else if (name.includes('linkedin')) value = data.linkedin;
    else if (name.includes('portfolio') || name.includes('github') || name.includes('website')) value = data.portfolio;
    else if (name.includes('address')) value = data.address;
    else if (name.includes('city')) value = data.city || 'New York';
    else if (name.includes('country')) value = data.country || 'United States';
    else if (field.tagName === 'TEXTAREA' || name.includes('summary') || name.includes('about') || name.includes('description') || name.includes('cover')) value = data.summary;
    else if (name.includes('degree') || name.includes('education')) value = data.degree;
    else if (name.includes('university') || name.includes('college') || name.includes('school')) value = data.university;
    else if (name.includes('graduation') || name.includes('year')) value = data.graduationYear;
    else if (name.includes('company') || name.includes('employer')) value = data.company;
    else if (name.includes('position') || name.includes('title') || name.includes('role')) value = data.position;
    else if (name.includes('skill')) value = data.skills;
    else if (name.includes('salary') || name.includes('compensation')) value = data.salary || '90000';
    else if (name.includes('experience') || name.includes('year')) value = data.experience || '5';
    
    if (value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Filled: ${name || placeholder} = ${value.substring(0,20)}...`);
    }
  });

  // DROPDOWNS & SELECTS
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    const name = select.name?.toLowerCase() || '';
    const options = Array.from(select.options);
    
    let valueToSelect = '';
    
    if (name.includes('country')) {
      const usaOption = options.find(opt => 
        opt.text.includes('United States') || opt.value.includes('US') || 
        opt.text.includes('America') || opt.value.includes('USA')
      );
      if (usaOption) valueToSelect = usaOption.value;
    }
    else if (name.includes('year') || name.includes('experience')) {
      const option = options.find(opt => opt.text.includes('5') || opt.value.includes('5'));
      if (option) valueToSelect = option.value;
    }
    else if (name.includes('degree')) {
      const option = options.find(opt => 
        opt.text.includes('Bachelor') || opt.text.includes('BSc') || 
        opt.value.includes('bachelor')
      );
      if (option) valueToSelect = option.value;
    }
    else if (options.length > 1) {
      // Skip placeholder/select options
      const realOptions = options.filter(opt => 
        opt.value && !opt.text.toLowerCase().includes('select') && 
        !opt.text.toLowerCase().includes('choose')
      );
      if (realOptions.length > 0) valueToSelect = realOptions[0].value;
    }
    
    if (valueToSelect) {
      select.value = valueToSelect;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Selected dropdown: ${name} = ${valueToSelect}`);
    }
  });

  // RADIO BUTTONS - Check appropriate ones
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.name) {
      if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
      radioGroups[radio.name].push(radio);
    }
  });
  
  Object.values(radioGroups).forEach(group => {
    // Prioritize positive/rightmost options
    const positiveOption = group.find(r => 
      r.value.toLowerCase() === 'yes' || r.value === '1' || 
      r.id.toLowerCase().includes('yes') || r.id.toLowerCase().includes('true') ||
      r.value.toLowerCase() === 'male' // For gender fields
    );
    if (positiveOption) positiveOption.checked = true;
    else if (group.length > 0) group[group.length - 1].checked = true; // Select last option
    
    group.forEach(r => r.dispatchEvent(new Event('change', { bubbles: true })));
  });

  // CHECKBOXES - Smart checking
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    const name = checkbox.name?.toLowerCase() || '';
    const id = checkbox.id?.toLowerCase() || '';
    const label = getLabel(checkbox).toLowerCase();
    
    // Check agreement boxes
    if (name.includes('term') || name.includes('agree') || name.includes('consent') || 
        name.includes('condition') || name.includes('policy') ||
        id.includes('term') || id.includes('agree') || label.includes('agree')) {
      checkbox.checked = true;
    }
    // Uncheck newsletter/spam boxes
    else if (name.includes('newsletter') || name.includes('spam') || name.includes('marketing') ||
             id.includes('newsletter') || label.includes('newsletter')) {
      checkbox.checked = false;
    }
    // Check remote work if available
    else if (name.includes('remote') || id.includes('remote') || label.includes('remote')) {
      checkbox.checked = true;
    }
    
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // DATE PICKERS
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    const name = input.name?.toLowerCase() || '';
    if (name.includes('start')) input.value = data.workStartDate;
    else if (name.includes('end') || name.includes('until')) input.value = data.workEndDate;
    else if (name.includes('birth')) input.value = data.birthDate || '1990-01-01';
  });

  // FILE UPLOAD - THE MAGIC
  if (uploadCV && cvData && cvFileName) {
    console.log('📎 Attempting CV upload...');
    
    // Convert ArrayBuffer back to File
    const uint8Array = new Uint8Array(cvData);
    const blob = new Blob([uint8Array], { type: cvFileType || 'application/pdf' });
    const file = new File([blob], cvFileName, { type: cvFileType || 'application/pdf' });
    
    // Find file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    let cvInputFound = false;
    
    fileInputs.forEach(input => {
      const label = getLabel(input).toLowerCase();
      const name = input.name?.toLowerCase() || '';
      
      // Check if this is a CV/resume field
      if (label.includes('cv') || label.includes('resume') || 
          name.includes('cv') || name.includes('resume') ||
          input.accept.includes('pdf') || input.accept.includes('doc')) {
        
        cvInputFound = true;
        
        // Create a DataTransfer object to set the file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // Trigger events
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Visual feedback
        input.style.border = '3px solid #34A853';
        input.style.backgroundColor = '#d4edda';
        
        console.log(`✅ CV "${cvFileName}" auto-uploaded!`);
      }
    });
    
    if (!cvInputFound) {
      console.warn('⚠️ No CV file input found on this page');
      // Highlight all file inputs anyway
      fileInputs.forEach(input => {
        input.style.border = '3px solid #f39c12';
        input.style.backgroundColor = '#fff3cd';
      });
    }
  }
  
  console.log("✅ Form filling complete!");
}

function getLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`) || field.closest('label');
  if (label) return label.textContent;
  
  // Try to find label by proximity
  const parent = field.parentElement;
  if (parent && parent.textContent.trim().length < 50) {
    return parent.textContent;
  }
  return '';
}