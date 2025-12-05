// Centralized configuration for all field mappings and behaviors
const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name', 'firstname', 'fname', 'givenName', 'name_first', 'first', 'forename'],
  lastName: ['lastName', 'last_name', 'lastname', 'lname', 'surname', 'name_last', 'last', 'familyName'],
  email: ['email', 'e-mail', 'emailAddress', 'mail', 'contact_email', 'e_mail'],
  phone: ['phone', 'phoneNumber', 'telephone', 'mobile', 'cell', 'contactNumber', 'tel'],
  
  address: ['address', 'streetAddress', 'address1', 'street', 'mailingAddress'],
  city: ['city', 'town', 'locality', 'addressCity'],
  state: ['state', 'province', 'region', 'county', 'department', 'prefecture'],
  zipCode: ['zip', 'zipCode', 'postalCode', 'postcode', 'postal'],
  country: ['country', 'nation', 'nationality', 'countryName'],
  
  company: ['company', 'organization', 'employer', 'currentCompany'],
  jobTitle: ['jobTitle', 'position', 'title', 'role', 'designation'],
  
  // Boolean/Selection fields
  gender: ['gender', 'sex'],
  newsletter: ['newsletter', 'subscribe', 'subscription', 'marketing'],
  terms: ['terms', 'conditions', 'agreement', 'consent', 'privacy', 'termsAndConditions'],
  remoteWork: ['remoteWork', 'workType', 'workPreference', 'locationType'],
  
  experience: ['experience', 'yearsExperience', 'workExperience'],
  education: ['education', 'degree', 'highestEducation'],
  skills: ['skills', 'technicalSkills', 'competencies', 'expertise'],
  salary: ['salary', 'expectedSalary', 'compensation'],
  notice: ['notice', 'noticePeriod', 'availability', 'joiningDate']
};

// Intelligent value mappings for automatic selection
const VALUE_MAPPINGS = {
  boolean: {
    true: ['yes', 'true', 'agree', 'accept', 'subscribe', 'i agree', 'i accept', 'enable', 'on', '1', 'checked'],
    false: ['no', 'false', 'decline', 'reject', 'unsubscribe', 'disable', 'off', '0', 'unchecked']
  },
  
  gender: {
    male: ['male', 'man', 'm', 'he/him', 'mr', 'sir'],
    female: ['female', 'woman', 'f', 'she/her', 'ms', 'mrs', 'miss'],
    other: ['other', 'non-binary', 'prefer not to say', 'decline to answer', 'they/them']
  },
  
  remoteWork: {
    remote: ['remote', 'work from home', 'wfh', 'fully remote', 'home office'],
    hybrid: ['hybrid', 'mixed', 'partial remote', 'flexible', 'hybrid-remote'],
    onsite: ['onsite', 'office', 'in office', 'in-person', 'on-site']
  },
  
  // Country mappings with common abbreviations
  country: {
    'united states': ['usa', 'us', 'united states of america', 'america', 'u.s.a.'],
    'canada': ['ca', 'can'],
    'united kingdom': ['uk', 'great britain', 'gb', 'britain'],
    'australia': ['au', 'aus'],
    'germany': ['de', 'deutschland']
  }
};

// Required field indicators to detect
const REQUIRED_INDICATORS = [
  'required',
  'mandatory',
  'obligatory',
  '*', // Direct asterisk
  '(*)', // Asterisk in parentheses
  'required field',
  'must be filled',
  'cannot be empty'
];

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_ALIASES, VALUE_MAPPINGS, REQUIRED_INDICATORS };
}