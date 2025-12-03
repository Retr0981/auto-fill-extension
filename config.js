// config.js - Enhanced field aliases
const FIELD_ALIASES = {
  firstName: ['firstname', 'first_name', 'fname', 'givenname', 'given_name', 'forename', 'name', 'fullname', 'user.firstname', 'customer.firstname', 'applicant.firstname', 'candidate.firstname', 'first', 'fn'],
  lastName: ['lastname', 'last_name', 'lname', 'surname', 'familyname', 'family_name', 'user.lastname', 'customer.lastname', 'applicant.lastname', 'candidate.lastname', 'last', 'ln'],
  email: ['email', 'emailaddress', 'email_address', 'e-mail', 'mail', 'contactemail', 'contact_email', 'user.email', 'customer.email', 'applicant.email', 'candidate.email'],
  phone: ['phone', 'phonenumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'tel', 'contactnumber', 'contact_number', 'user.phone', 'customer.phone'],
  address: ['address', 'streetaddress', 'street_address', 'address1', 'addressline1', 'address_line1', 'street', 'location', 'homeaddress', 'workaddress'],
  city: ['city', 'town', 'cityname', 'locality', 'addresscity', 'homecity', 'workcity'],
  state: ['state', 'province', 'region', 'statename', 'addressstate', 'homestate', 'workstate'],
  zipCode: ['zip', 'zipcode', 'postalcode', 'postal_code', 'postcode', 'zip_code', 'addresszip'],
  country: ['country', 'countryname', 'nation', 'addresscountry', 'homecountry'],
  company: ['company', 'companyname', 'employer', 'organization', 'currentcompany', 'workcompany'],
  jobTitle: ['jobtitle', 'job_title', 'position', 'title', 'role', 'occupation', 'designation', 'currenttitle'],
  linkedin: ['linkedin', 'linkedinprofile', 'linkedin_url', 'linkedinurl', 'social.linkedin'],
  github: ['github', 'githubprofile', 'github_url', 'githuburl', 'social.github'],
  website: ['website', 'personalwebsite', 'portfolio', 'url', 'websiteurl'],
  experience: ['experience', 'workexperience', 'yearsexperience', 'totalexperience'],
  education: ['education', 'degree', 'qualification', 'highesteducation'],
  skills: ['skills', 'technicalskills', 'competencies', 'expertise'],
  salary: ['salary', 'salaryexpectation', 'expectedsalary', 'compensation'],
  notice: ['noticeperiod', 'notice', 'availability', 'whenavailable']
};