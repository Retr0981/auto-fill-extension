// config.js - Field name aliases for matching
const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name', 'firstname', 'forename', 'givenName', 'given_name', 'fname', 'first', 'fn', 'given', 'name', 'fullName', 'candidate.firstName', 'applicant.firstName'],
  lastName: ['lastName', 'last_name', 'lastname', 'surname', 'familyName', 'family_name', 'lname', 'last', 'sn', 'family', 'surname', 'candidate.lastName', 'applicant.lastName'],
  email: ['email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail', 'e mail', 'emailaddress', 'contact', 'contactEmail', 'candidate.email', 'applicant.email'],
  phone: ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'tel', 'contact', 'contactNumber', 'candidate.phone', 'applicant.phone'],
  address: ['address', 'streetAddress', 'street_address', 'addressLine1', 'address1', 'line1', 'street', 'location', 'mailingAddress', 'residentialAddress'],
  city: ['city', 'town', 'cityName', 'locality', 'addressCity'],
  state: ['state', 'province', 'region', 'stateProvince', 'addressState'],
  zipCode: ['zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode', 'addressZip']
};