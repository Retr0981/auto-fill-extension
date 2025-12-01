// config.js - MUST be loaded before popup.js and content.js

const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name', 'firstname', 'forename', 'givenName', 'given_name', 'fname', 'first', 'fn', 'given', 'name', 'fullName'],
  lastName: ['lastName', 'last_name', 'lastname', 'surname', 'familyName', 'family_name', 'lname', 'last', 'sn', 'family', 'surname'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail', 'e mail', 'emailaddress', 'contact'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'tel', 'contact', 'number'],
  linkedin: ['linkedin', 'linkedIn', 'linkedinUrl', 'linkedin_url', 'li', 'linked', 'profile'],
  portfolio: ['portfolio', 'website', 'github', 'gitlab', 'personalWebsite', 'url', 'site', 'homepage', 'link'],
  position: ['position', 'jobTitle', 'job_title', 'title', 'role', 'designation', 'currentPosition', 'job'],
  company: ['company', 'employer', 'organisation', 'organization', 'employer_name', 'currentCompany', 'work'],
  skills: ['skills', 'skill', 'abilities', 'competencies', 'technologies', 'expertise', 'experience']
};

const CV_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  phone: /(\+?1\s*[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4,6})/g,
  linkedin: /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi,
  github: /github\.com\/[a-zA-Z0-9-]+/gi,
};

const SMART_DEFAULTS = {
  country: ['United States', 'USA', 'US', 'America'],
  experience: ['5', '3-5', '5+', 'Senior'],
  availability: ['Immediate'],
  workType: ['Full-time', 'Remote']
};