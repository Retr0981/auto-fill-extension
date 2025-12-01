// config.js - Centralized field mappings and constants

// Field aliases for intelligent matching
const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name', 'firstname', 'forename', 'givenName', 'given_name', 'fname', 'first', 'fn', 'given'],
  lastName: ['lastName', 'last_name', 'lastname', 'surname', 'familyName', 'family_name', 'lname', 'last', 'sn', 'family'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail', 'e mail', 'emailaddress'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'tel', 'contact'],
  address: ['address', 'streetAddress', 'street_address', 'addr', 'street', 'mailingAddress'],
  city: ['city', 'town', 'municipality', 'locality'],
  country: ['country', 'nation', 'nationality', 'countryCode', 'country_name'],
  zip: ['zip', 'zipCode', 'zip_code', 'postalCode', 'postal_code', 'postcode', 'postal', 'zipcode'],
  linkedin: ['linkedin', 'linkedIn', 'linkedinUrl', 'linkedin_url', 'li', 'linked'],
  portfolio: ['portfolio', 'website', 'github', 'gitlab', 'personalWebsite', 'url', 'site', 'homepage'],
  summary: ['summary', 'about', 'description', 'bio', 'profile', 'objective'],
  degree: ['degree', 'education', 'qualification', 'diploma', 'certificate'],
  university: ['university', 'college', 'school', 'institution', 'academy', 'uni'],
  graduationYear: ['graduationYear', 'graduation_year', 'graduation', 'yearGraduated', 'graduationdate', 'year'],
  company: ['company', 'employer', 'organisation', 'organization', 'employer_name', 'currentCompany'],
  position: ['position', 'jobTitle', 'job_title', 'title', 'role', 'designation', 'currentPosition'],
  workStartDate: ['workStartDate', 'work_start_date', 'startDate', 'start_date', 'fromDate', 'employmentStart'],
  workEndDate: ['workEndDate', 'work_end_date', 'endDate', 'end_date', 'toDate', 'employmentEnd'],
  experience: ['experience', 'yearsExperience', 'years_experience', 'exp', 'yoe', 'years'],
  skills: ['skills', 'skill', 'abilities', 'competencies', 'technologies', 'expertise'],
  salary: ['salary', 'expectedSalary', 'expected_salary', 'compensation', 'pay', 'income'],
  birthDate: ['birthDate', 'birth_date', 'dateOfBirth', 'date_of_birth', 'dob', 'birthday']
};

// Form type detection patterns
const FORM_PATTERNS = {
  jobApplication: ['job', 'career', 'apply', 'position', 'employment', 'candidate', 'recruitment'],
  contact: ['contact', 'inquiry', 'message', 'feedback', 'support'],
  registration: ['register', 'signup', 'account', 'create'],
  login: ['login', 'signin', 'auth'],
  survey: ['survey', 'questionnaire', 'poll']
};

// CV parsing patterns
const CV_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  phone: /(\+?1\s*[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4,6})/g,
  linkedin: /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi,
  github: /github\.com\/[a-zA-Z0-9-]+/gi,
  url: /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  year: /\b(19|20)\d{2}\b/g
};

// Smart defaults for common fields
const SMART_DEFAULTS = {
  country: ['United States', 'USA', 'US', 'America', 'Canada', 'UK', 'United Kingdom'],
  experience: ['5', '3-5', '5+', 'Senior', 'Mid-level'],
  availability: ['Immediate', '2 weeks', '1 month'],
  salary: ['120000', 'Negotiable', 'Market rate'],
  workType: ['Full-time', 'Remote', 'Hybrid', 'On-site']
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_ALIASES, FORM_PATTERNS, CV_PATTERNS, SMART_DEFAULTS };
}