// Enhanced field name aliases for matching
const FIELD_ALIASES = {
  // Personal Information
  firstName: [
    'firstName', 'first_name', 'firstname', 'fname', 'givenName', 'given_name',
    'forename', 'user.firstName', 'customer.firstName', 'applicant.firstName',
    'candidate.firstName', 'first', 'fn', 'given', 'fName', 'firstName1',
    'firstname1', 'name_first'
  ],
  
  lastName: [
    'lastName', 'last_name', 'lastname', 'lname', 'surname', 'familyName',
    'family_name', 'user.lastName', 'customer.lastName', 'applicant.lastName',
    'candidate.lastName', 'last', 'ln', 'family', 'lName', 'lastname1', 'name_last'
  ],
  
  fullName: [
    'fullName', 'full_name', 'fullname', 'completeName', 'displayName',
    'user.name', 'customer.name', 'applicant.name', 'candidate.name',
    'person.name', 'display_name'
  ],
  
  email: [
    'email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail',
    'e mail', 'emailaddress', 'contactEmail', 'candidate.email', 'applicant.email',
    'user.email', 'person.email', 'contact_email', 'emailAddr', 'mailAddress',
    'e-mailAddress', 'email_addr'
  ],
  
  phone: [
    'phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell',
    'cellphone', 'phonenumber', 'tel', 'contactNumber', 'candidate.phone',
    'applicant.phone', 'user.phone', 'person.phone', 'contact_phone', 'phone_no',
    'telephone_no', 'mobileNumber', 'phoneNumber1', 'telephoneNumber', 'mobilePhone'
  ],
  
  // Address Information
  address: [
    'address', 'streetAddress', 'street_address', 'addressLine1', 'address1',
    'line1', 'street', 'mailingAddress', 'residentialAddress', 'homeAddress',
    'workAddress', 'address_line1', 'addr1', 'streetAddr', 'addrLine1'
  ],
  
  city: [
    'city', 'town', 'cityName', 'locality', 'addressCity', 'homeCity',
    'workCity', 'city_name', 'locationCity', 'address_city', 'cityTown',
    'city_town', 'locality_city'
  ],
  
  state: [
    'state', 'province', 'region', 'stateProvince', 'addressState', 'homeState',
    'workState', 'state_name', 'regionState', 'address_state', 'stateProv',
    'provState', 'state_province', 'region_state', 'provincia', 'county', // ADDED: county, provincia
    'department', 'prefecture', 'territory' // Common regional divisions
  ],
  
  zipCode: [
    'zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode',
    'addressZip', 'homeZip', 'workZip', 'zip_code', 'postal_code',
    'address_zip', 'postCode', 'zipPostal', 'zip_postal', 'postalcode'
  ],
  
  // === ENHANCED: Country with broader matching ===
  country: [
    'country', 'countryName', 'nation', 'addressCountry', 'homeCountry',
    'workCountry', 'country_name', 'nationality', 'address_country',
    'residenceCountry', 'residence_country', 'citizenship', 'legalCountry'
  ],
  
  // Professional Information
  company: [
    'company', 'organization', 'employer', 'companyName', 'company_name',
    'organizationName', 'currentCompany', 'employerName', 'companyName1',
    'compName', 'orgName', 'employer_name', 'current_employer'
  ],
  
  jobTitle: [
    'jobTitle', 'job_title', 'position', 'title', 'role', 'occupation',
    'jobPosition', 'jobRole', 'jobtitle', 'jobName', 'designation',
    'currentTitle', 'current_position', 'professional_title', 'role_title'
  ],
  
  // Additional Fields
  website: [
    'website', 'personalWebsite', 'portfolio', 'url', 'websiteUrl',
    'webSite', 'personal_site', 'portfolio_url', 'website_url'
  ],
  
  linkedin: [
    'linkedin', 'linkedinProfile', 'linkedin_url', 'linkedinUrl',
    'social.linkedin', 'linkedin_profile', 'linkedin_link'
  ],
  
  github: [
    'github', 'githubProfile', 'github_url', 'githubUrl', 'social.github',
    'github_profile', 'github_link'
  ],
  
  // Selection Fields
  gender: [
    'gender', 'sex', 'gender_identity', 'genderIdentity', 'gender_id',
    'user.gender', 'person.gender', 'applicant.gender', 'candidate.gender',
    'preferredGender', 'gender_pref', 'sex_identity'
  ],
  
  newsletter: [
    'newsletter', 'subscribe', 'subscription', 'notifications', 'updates',
    'marketing', 'promotional', 'optin', 'opt_in', 'opt-in', 'mailingList'
  ],
  
  terms: [
    'terms', 'conditions', 'agreement', 'privacy', 'policy', 'consent',
    'acknowledge', 'confirm', 'termsAndConditions', 'privacyPolicy',
    'acceptTerms', 'legalAgreement', 'iAgree', 'accept'
  ],
  
  remoteWork: [
    'remoteWork', 'workType', 'workPreference', 'work_mode', 'workMode',
    'locationType', 'work_location', 'remote_preference', 'workStyle'
  ],
  
  // Employment Details
  experience: [
    'experience', 'workExperience', 'yearsExperience', 'totalExperience',
    'professionalExperience', 'relevantExperience', 'years_experience',
    'total_experience', 'work_experience'
  ],
  
  education: [
    'education', 'degree', 'qualification', 'highestEducation',
    'educationalBackground', 'academicBackground', 'highest_degree',
    'education_level'
  ],
  
  skills: [
    'skills', 'technicalSkills', 'competencies', 'expertise', 'abilities',
    'proficiencies', 'technical_skills', 'key_skills', 'core_skills'
  ],
  
  salary: [
    'salary', 'salaryExpectation', 'expectedSalary', 'compensation',
    'desiredSalary', 'salary_expectation', 'expected_salary',
    'compensation_expectation'
  ],
  
  notice: [
    'noticePeriod', 'notice', 'availability', 'whenAvailable',
    'notice_period', 'availability_date', 'start_date', 'joining_date'
  ]
};

// === ENHANCED: Value mappings for automatic dropdown selection ===
const VALUE_MAPPINGS = {
  // Gender options
  gender: {
    male: ['male', 'm', 'man', 'boy', 'male/man', 'he/him', 'mr', 'sir'],
    female: ['female', 'f', 'woman', 'girl', 'female/woman', 'she/her', 'mrs', 'ms', 'miss'],
    other: ['other', 'non-binary', 'non binary', 'prefer not to say', 'prefer-not-to-say', 'they/them', 'prefer not to answer']
  },
  
  // Boolean/Terms
  boolean: {
    true: ['true', 'yes', 'y', '1', 'on', 'checked', 'agree', 'accept', 'ok', 'enable', 'i agree', 'i accept'],
    false: ['false', 'no', 'n', '0', 'off', 'unchecked', 'decline', 'disable', 'i disagree']
  },
  
  // Work location
  remoteWork: {
    remote: ['remote', 'work from home', 'wfh', 'fully remote', '100% remote', 'home office'],
    hybrid: ['hybrid', 'mixed', 'hybrid work', 'partial remote', 'flexible', 'hybrid-remote'],
    onsite: ['onsite', 'on-site', 'office', 'in-office', 'on site', 'in office', 'in-person', 'on location']
  },
  
  // Countries (common variations)
  country: {
    'united states': ['usa', 'us', 'united states', 'united states of america', 'america', 'u.s.', 'u.s.a.'],
    'canada': ['canada', 'ca'],
    'united kingdom': ['uk', 'united kingdom', 'great britain', 'gb', 'england', 'scotland', 'wales', 'northern ireland'],
    'australia': ['australia', 'au'],
    'germany': ['germany', 'de', 'deutschland']
  },
  
  // US States (abbreviations and full names)
  state: {
    'california': ['ca', 'california', 'calif', 'calif.'],
    'new york': ['ny', 'new york', 'n.y.'],
    'texas': ['tx', 'texas', 'tex'],
    'florida': ['fl', 'florida', 'fla'],
    // Add more states as needed
  }
};

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_ALIASES, VALUE_MAPPINGS };
}