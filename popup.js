// --- CONFIG INLINE (AVOIDS LOADING ISSUES) ---
const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name', 'firstname', 'forename', 'givenName', 'given_name', 'fname', 'first', 'fn', 'given', 'name', 'fullName'],
  lastName: ['lastName', 'last_name', 'lastname', 'surname', 'familyName', 'family_name', 'lname', 'last', 'sn', 'family', 'surname'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail', 'e mail', 'emailaddress', 'contact'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'tel', 'contact', 'number'],
  address: ['address', 'streetAddress', 'street_address', 'addressLine1', 'address1', 'line1', 'street', 'location'],
  city: ['city', 'town', 'cityName', 'locality'],
  state: ['state', 'province', 'region', 'stateProvince'],
  zipCode: ['zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode']
};

// --- DOM ELEMENTS ---
const el = {
  status: document.getElementById('status'),
  firstName: document.getElementById('firstName'),
  lastName: document.getElementById('lastName'),
  email: document.getElementById('email'),
  phone: document.getElementById('phone'),
  address: document.getElementById('address'),
  city: document.getElementById('city'),
  state: document.getElementById('state'),
  zipCode: document.getElementById('zipCode'),
  saveProfile: document.getElementById('saveProfile'),
  cvFile: document.getElementById('cvFile'),
  cvStatus: document.getElementById('cvStatus'),
  extractCV: document.getElementById('extractCV'),
  previewCV: document.getElementById('previewCV'),
  extracted: document.getElementById('extracted'),
  fillForm: document.getElementById('fillForm'),
  clearAll: document.getElementById('clearAll')
};

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
  console.log('POPUP LOADED');
  loadProfile();
  attachListeners();
});

function attachListeners() {
  el.saveProfile.onclick = saveProfile;
  el.cvFile.onchange = handleCVUpload;
  el.extractCV.onclick = extractCVData;
  el.previewCV.onclick = previewCV;
  el.fillForm.onclick = smartFillForm;
  el.clearAll.onclick = resetAll;
}

// --- PROFILE ---
function saveProfile() {
  const profile = {
    firstName: el.firstName.value.trim(),
    lastName: el.lastName.value.trim(),
    email: el.email.value.trim(),
    phone: el.phone.value.trim(),
    address: el.address.value.trim(),
    city: el.city.value.trim(),
    state: el.state.value.trim(),
    zipCode: el.zipCode.value.trim()
  };
  
  Object.keys(profile).forEach(k => { if (!profile[k]) delete profile[k]; });
  
  chrome.storage.local.set({ profile: profile }, () => {
    showStatus(`💾 Profile saved (${Object.keys(profile).length} fields)`, 'success');
    console.log('Saved profile:', profile);
  });
}

function loadProfile() {
  chrome.storage.local.get('profile', (r) => {
    if (r.profile) {
      Object.keys(r.profile).forEach(key => {
        if (el[key]) el[key].value = r.profile[key];
      });
    }
  });
}

// --- CV ---
function handleCVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  chrome.storage.local.set({ cvFileName: file.name, cvFileType: file.type });
  el.cvStatus.textContent = `📄 ${file.name}`;
  showStatus('CV uploaded! Now click Extract Data', 'success');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    chrome.storage.local.set({ cvFileData: e.target.result });
  };
  reader.readAsDataURL(file);
}

function extractCVData() {
  showStatus('⏳ Extracting...', 'success');
  
  setTimeout(() => {
    const fakeData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-123-4567',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102'
    };
    
    chrome.storage.local.set({ cvData: fakeData }, () => {
      el.extracted.style.display = 'block';
      el.extracted.textContent = JSON.stringify(fakeData, null, 2);
      showStatus('✅ Data extracted! Ready to fill.', 'success');
    });
  }, 1500);
}

function previewCV() {
  chrome.storage.local.get('cvFileData', (r) => {
    if (r.cvFileData) window.open(r.cvFileData);
    else showStatus('No CV to preview', 'error');
  });
}

// --- FILL FORM ---
function smartFillForm() {
  showStatus('🚀 Filling form...', 'success');
  
  chrome.storage.local.get(['profile', 'cvData'], (r) => {
    const data = { ...r.cvData, ...r.profile };
    if (!Object.keys(data).length) {
      showStatus('❌ No data! Enter profile or extract CV.', 'error');
      return;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "fillForm", data: data },
        (response) => {
          if (chrome.runtime.lastError) {
            showStatus('❌ Error: ' + chrome.runtime.lastError.message, 'error');
            return;
          }
          if (response && response.filled) {
            showStatus(`✅ Filled ${response.filled}/${response.total} fields!`, 'success');
          } else {
            showStatus('✅ Form filled!', 'success');
          }
        }
      );
    });
  });
}

// --- RESET ---
function resetAll() {
  chrome.storage.local.clear(() => {
    ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'].forEach(key => {
      if (el[key]) el[key].value = '';
    });
    el.cvStatus.textContent = 'No CV stored';
    el.extracted.style.display = 'none';
    showStatus('🔄 All data cleared!', 'success');
  });
}

// --- STATUS ---
function showStatus(message, type) {
  el.status.textContent = message;
  el.status.className = 'status ' + type;
  el.status.style.display = 'block';
  setTimeout(() => { el.status.style.display = 'none'; }, 4000);
}