// Enhanced field name aliases for matching
const FIELD_ALIASES = {
  // Personal Information
  firstName: [
    'firstName', 'first_name', 'firstname', 'fname', 'givenName', 'given_name',
    'forename', 'name', 'fullName', 'user.firstName', 'customer.firstName',
    'applicant.firstName', 'candidate.firstName', 'first', 'fn', 'given',
    'firstName', 'fName', 'firstName1', 'firstname1', 'name_first'
  ],
  
  lastName: [
    'lastName', 'last_name', 'lastname', 'lname', 'surname', 'familyName',
    'family_name', 'user.lastName', 'customer.lastName', 'applicant.lastName',
    'candidate.lastName', 'last', 'ln', 'family', 'surname', 'lastName',
    'lName', 'lastname1', 'name_last'
  ],
  
  fullName: [
    'fullName', 'full_name', 'fullname', 'name', 'completeName', 'user.name',
    'customer.name', 'applicant.name', 'candidate.name', 'person.name',
    'displayName', 'display_name'
  ],
  
  email: [
    'email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail',
    'e mail', 'emailaddress', 'contact', 'contactEmail', 'candidate.email',
    'applicant.email', 'user.email', 'person.email', 'contact_email',
    'emailAddr', 'mailAddress', 'email_address', 'e-mailAddress', 'email_addr'
  ],
  
  phone: [
    'phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell',
    'cellphone', 'phonenumber', 'tel', 'contact', 'contactNumber',
    'candidate.phone', 'applicant.phone', 'user.phone', 'person.phone',
    'contact_phone', 'phone_no', 'telephone_no', 'mobileNumber', 'phoneNumber1',
    'telephoneNumber', 'mobilePhone', 'cellPhone'
  ],
  
  // Address Information
  address: [
    'address', 'streetAddress', 'street_address', 'addressLine1', 'address1',
    'line1', 'street', 'location', 'mailingAddress', 'residentialAddress',
    'homeAddress', 'workAddress', 'address_line1', 'addr1', 'streetAddr',
    'streetaddress', 'addrLine1', 'street_address1'
  ],
  
  city: [
    'city', 'town', 'cityName', 'locality', 'addressCity', 'homeCity',
    'workCity', 'city_name', 'locationCity', 'address_city', 'cityTown',
    'city_town', 'address_city', 'locality_city'
  ],
  
  state: [
    'state', 'province', 'region', 'stateProvince', 'addressState', 'homeState',
    'workState', 'state_name', 'regionState', 'address_state', 'stateProv',
    'provState', 'state_province', 'region_state'
  ],
  
  zipCode: [
    'zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode',
    'addressZip', 'homeZip', 'workZip', 'zip_code', 'postal_code',
    'address_zip', 'postCode', 'zipPostal', 'zip_postal'
  ],
  
  country: [
    'country', 'countryName', 'nation', 'addressCountry', 'homeCountry',
    'workCountry', 'country_name', 'nationality', 'country_nation',
    'address_country'
  ],
  
  // Professional Information
  company: [
    'company', 'organization', 'employer', 'companyName', 'company_name',
    'organizationName', 'currentCompany', 'employerName', 'companyName1',
    'compName', 'orgName', 'employer_name', 'current_employer', 'currentCompany'
  ],
  
  jobTitle: [
    'jobTitle', 'job_title', 'position', 'title', 'role', 'occupation',
    'jobPosition', 'jobRole', 'jobtitle', 'jobName', 'designation',
    'currentTitle', 'current_position', 'professional_title', 'role_title'
  ],
  
  // Additional Fields
  website: [
    'website', 'personalWebsite', 'portfolio', 'url', 'websiteUrl',
    'webSite', 'site', 'personal_site', 'portfolio_url', 'website_url'
  ],
  
  linkedin: [
    'linkedin', 'linkedinProfile', 'linkedin_url', 'linkedinUrl',
    'social.linkedin', 'linkedin_profile', 'linkedin_link'
  ],
  
  github: [
    'github', 'githubProfile', 'github_url', 'githubUrl', 'social.github',
    'github_profile', 'github_link'
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
  ],
  
  // CV/Resume Upload Fields
  cv: [
    'cv', 'resume', 'curriculum', 'vitae', 'attachment', 'file', 'upload',
    'document', 'resumeFile', 'cvFile', 'attachmentFile', 'fileUpload',
    'uploadFile', 'documentFile', 'resumeUpload', 'cvUpload', 'cv_upload',
    'resume_upload', 'attachment_upload', 'file_upload', 'document_upload',
    'cvFileUpload', 'resumeFileUpload', 'documentFileUpload', 'attachmentFileUpload',
    'file_cv', 'file_resume', 'file_attachment', 'file_document'
  ]
};

// Field type patterns for better matching
const FIELD_PATTERNS = {
  email: /email|e.?mail|mail.?address/i,
  phone: /phone|mobile|tel|cell|contact.?number/i,
  date: /date|dob|birth.?date|birthday/i,
  url: /url|website|web.?site|link/i,
  file: /file|upload|attachment|cv|resume|document/i
};

// CV upload field detection patterns
const CV_UPLOAD_PATTERNS = [
  /cv|resume|curriculum|vitae|attachment|document|upload/i,
  /file.?upload|upload.?file/i,
  /cv.?upload|resume.?upload/i,
  /attachment.?file|file.?attachment/i,
  /document.?upload|upload.?document/i
];

// Common checkbox patterns that should be auto-checked
const AUTO_CHECK_PATTERNS = [
  /terms|conditions|agreement|privacy|policy|consent|accept|agree|acknowledge/i,
  /newsletter|subscription|updates|notifications|marketing/i,
  /opt.?in|subscribe|sign.?up/i
];

// Common dropdown values for auto-selection
const COMMON_VALUES = {
  country: {
    'united states': ['us', 'usa', 'united states', 'america'],
    'united kingdom': ['uk', 'gb', 'great britain', 'england'],
    'canada': ['ca', 'canada'],
    'australia': ['au', 'australia']
  },
  gender: {
    'male': ['male', 'm', 'man', 'gentleman'],
    'female': ['female', 'f', 'woman', 'lady'],
    'other': ['other', 'prefer not to say', 'non-binary']
  },
  employment: {
    'full-time': ['full.time', 'fulltime', 'permanent'],
    'part-time': ['part.time', 'parttime'],
    'contract': ['contract', 'freelance', 'consultant']
  }
};