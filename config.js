// Enhanced field name aliases for matching - DO NOT MODIFY THIS FILE IN CONTENT.JS
const FIELD_ALIASES = {
  // Personal Information
  firstName: ['firstName', 'first_name', 'firstname', 'fname', 'givenName', 'given_name', 'forename', 'name', 'fullName', 'user.firstName', 'customer.firstName', 'applicant.firstName', 'candidate.firstName', 'first', 'fn', 'given', 'fName', 'firstName1', 'firstname1', 'name_first'],
  lastName: ['lastName', 'last_name', 'lastname', 'lname', 'surname', 'familyName', 'family_name', 'user.lastName', 'customer.lastName', 'applicant.lastName', 'candidate.lastName', 'last', 'ln', 'family', 'surname', 'lName', 'lastname1', 'name_last'],
  fullName: ['fullName', 'full_name', 'fullname', 'name', 'completeName', 'user.name', 'customer.name', 'applicant.name', 'candidate.name', 'person.name', 'displayName', 'display_name'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail', 'e mail', 'emailaddress', 'contact', 'contactEmail', 'candidate.email', 'applicant.email', 'user.email', 'person.email', 'contact_email', 'emailAddr', 'mailAddress', 'e-mailAddress', 'email_addr'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'tel', 'contact', 'contactNumber', 'candidate.phone', 'applicant.phone', 'user.phone', 'person.phone', 'contact_phone', 'phone_no', 'telephone_no', 'mobileNumber', 'phoneNumber1', 'telephoneNumber', 'mobilePhone', 'cellPhone'],
  address: ['address', 'streetAddress', 'street_address', 'addressLine1', 'address1', 'line1', 'street', 'location', 'mailingAddress', 'residentialAddress', 'homeAddress', 'workAddress', 'address_line1', 'addr1', 'streetAddr', 'streetaddress', 'addrLine1', 'street_address1'],
  city: ['city', 'town', 'cityName', 'locality', 'addressCity', 'homeCity', 'workCity', 'city_name', 'locationCity', 'address_city', 'cityTown', 'city_town', 'locality_city'],
  state: ['state', 'province', 'region', 'stateProvince', 'addressState', 'homeState', 'workState', 'state_name', 'regionState', 'address_state', 'stateProv', 'provState', 'state_province', 'region_state'],
  zipCode: ['zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode', 'addressZip', 'homeZip', 'workZip', 'zip_code', 'postal_code', 'address_zip', 'postCode', 'zipPostal', 'zip_postal'],
  country: ['country', 'countryName', 'nation', 'addressCountry', 'homeCountry', 'workCountry', 'country_name', 'nationality', 'country_nation', 'address_country'],
  company: ['company', 'organization', 'employer', 'companyName', 'company_name', 'organizationName', 'currentCompany', 'employerName', 'companyName1', 'compName', 'orgName', 'employer_name', 'current_employer', 'currentCompany'],
  jobTitle: ['jobTitle', 'job_title', 'position', 'title', 'role', 'occupation', 'jobPosition', 'jobRole', 'jobtitle', 'jobName', 'designation', 'currentTitle', 'current_position', 'professional_title', 'role_title'],
  website: ['website', 'personalWebsite', 'portfolio', 'url', 'websiteUrl', 'webSite', 'site', 'personal_site', 'portfolio_url', 'website_url'],
  linkedin: ['linkedin', 'linkedinProfile', 'linkedin_url', 'linkedinUrl', 'social.linkedin', 'linkedin_profile', 'linkedin_link'],
  github: ['github', 'githubProfile', 'github_url', 'githubUrl', 'social.github', 'github_profile', 'github_link'],
  experience: ['experience', 'workExperience', 'yearsExperience', 'totalExperience', 'professionalExperience', 'relevantExperience', 'years_experience', 'total_experience', 'work_experience'],
  education: ['education', 'degree', 'qualification', 'highestEducation', 'educationalBackground', 'academicBackground', 'highest_degree', 'education_level'],
  skills: ['skills', 'technicalSkills', 'competencies', 'expertise', 'abilities', 'proficiencies', 'technical_skills', 'key_skills', 'core_skills'],
  salary: ['salary', 'salaryExpectation', 'expectedSalary', 'compensation', 'desiredSalary', 'salary_expectation', 'expected_salary', 'compensation_expectation'],
  notice: ['noticePeriod', 'notice', 'availability', 'whenAvailable', 'notice_period', 'availability_date', 'start_date', 'joining_date'],
  // CV/Resume Upload Fields
  cv: ['cv', 'resume', 'curriculum', 'vitae', 'attachment', 'file', 'upload', 'document', 'resumeFile', 'cvFile', 'attachmentFile', 'fileUpload', 'uploadFile', 'documentFile', 'resumeUpload', 'cvUpload', 'cv_upload', 'resume_upload', 'attachment_upload', 'file_upload', 'document_upload', 'cvFileUpload', 'resumeFileUpload', 'documentFileUpload', 'attachmentFileUpload', 'file_cv', 'file_resume', 'file_attachment', 'file_document']
};

// CV upload field detection patterns - ENHANCED
const CV_UPLOAD_PATTERNS = [
  /cv|resume|curriculum|vitae|attachment|document|upload|file/i,
  /file.?upload|upload.?file/i,
  /cv.?upload|resume.?upload|document.?upload/i,
  /attachment.?file|file.?attachment|upload.?cv/i,
  /select.?file|choose.?file|browse/i
];

// Dropdown value mappings for automatic selection
const DROPDOWN_MAPPINGS = {
  country: {
    'united states': ['us', 'usa', 'united states', 'america', 'united states of america', 'usofa'],
    'united kingdom': ['uk', 'gb', 'great britain', 'england', 'united kingdom', 'britain'],
    'canada': ['ca', 'canada', 'cdn'],
    'australia': ['au', 'australia', 'aus'],
    'germany': ['de', 'germany', 'deutschland'],
    'france': ['fr', 'france'],
    'india': ['in', 'india', 'ind'],
    'japan': ['jp', 'japan', 'jpn']
  },
  gender: {
    'male': ['male', 'm', 'man', 'gentleman', 'boy', 'mr', 'mr.'],
    'female': ['female', 'f', 'woman', 'lady', 'girl', 'mrs', 'miss', 'ms'],
    'other': ['other', 'prefer not to say', 'non-binary', 'non binary', 'nb', 'prefer not to disclose']
  },
  employment: {
    'full-time': ['full.time', 'fulltime', 'permanent', 'full time', 'full-time', 'ft', 'permanent full-time'],
    'part-time': ['part.time', 'parttime', 'part time', 'part-time', 'pt'],
    'contract': ['contract', 'freelance', 'consultant', 'contractor', 'temporary', 'temp'],
    'internship': ['internship', 'intern', 'trainee', 'apprentice']
  },
  availability: {
    'immediate': ['immediate', 'asap', 'right away', 'immediate start', 'available now'],
    '1 week': ['1 week', 'one week', '1 wk', 'next week'],
    '2 weeks': ['2 weeks', 'two weeks', '2 wks', 'fortnight'],
    '1 month': ['1 month', 'one month', '30 days', '1 mo'],
    '3 months': ['3 months', 'three months', '90 days', '3 mo']
  },
  notice: {
    'immediate': ['immediate', 'asap', 'right away', 'immediate start', 'available now'],
    '1 week notice': ['1 week notice', 'one week notice', '1 week'],
    '2 weeks notice': ['2 weeks notice', 'two weeks notice', '2 weeks', 'fortnight notice'],
    '1 month notice': ['1 month notice', 'one month notice', '30 days notice'],
    '3 months notice': ['3 months notice', 'three months notice', '90 days notice']
  },
  boolean: {
    'yes': ['yes', 'y', 'true', '1', 'on', 'agree', 'accept', 'i agree'],
    'no': ['no', 'n', 'false', '0', 'off', 'decline', 'reject']
  }
};

// Common checkbox patterns that should be auto-checked
const AUTO_CHECK_PATTERNS = [
  /terms|conditions|agreement|privacy|policy|consent|accept|agree|acknowledge|confirm|i agree|i accept/i,
  /newsletter|subscription|updates|notifications|marketing|promotional|email updates/i,
  /opt.?in|subscribe|sign.?up|join mailing list|receive updates/i
];

// Field type patterns for better matching
const FIELD_PATTERNS = {
  email: /email|e.?mail|mail.?address/i,
  phone: /phone|mobile|tel|cell|contact.?number/i,
  date: /date|dob|birth.?date|birthday/i,
  url: /url|website|web.?site|link/i,
  file: /file|upload|attachment|cv|resume|document|choose file|select file/i
};

// Export for use in content.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_ALIASES, CV_UPLOAD_PATTERNS, DROPDOWN_MAPPINGS, AUTO_CHECK_PATTERNS, FIELD_PATTERNS };
}