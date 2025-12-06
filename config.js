// === ENHANCED: Value mappings for automatic dropdown/radio/checkbox selection ===
const VALUE_MAPPINGS = {
  // Gender options (expanded with common variations)
  gender: {
    male: ['male', 'm', 'man', 'boy', 'male/man', 'he/him', 'mr', 'sir', 'gentleman', 'mr.', 'male (m)'],
    female: ['female', 'f', 'woman', 'girl', 'female/woman', 'she/her', 'mrs', 'ms', 'miss', 'lady', 'ms.', 'mrs.', 'miss.', 'female (f)'],
    other: ['other', 'non-binary', 'non binary', 'prefer not to say', 'prefer-not-to-say', 'they/them', 'prefer not to answer', 'decline to answer', 'unknown', 'undisclosed', 'not specified']
  },
  
  // Boolean/Terms (expanded)
  boolean: {
    true: ['true', 'yes', 'y', '1', 'on', 'checked', 'agree', 'accept', 'ok', 'enable', 'i agree', 'i accept', 'subscribe', 'opt-in', 'opt in', 'sign up', 'signup', 'join', 'consent', 'i consent', 'approved', 'authorize'],
    false: ['false', 'no', 'n', '0', 'off', 'unchecked', 'decline', 'disable', 'i disagree', 'unsubscribe', 'opt-out', 'opt out', 'reject', 'refuse', 'withdraw', 'do not agree', 'do not consent']
  },
  
  // Work location (expanded)
  remoteWork: {
    remote: ['remote', 'work from home', 'wfh', 'fully remote', '100% remote', 'home office', 'telecommute', 'virtual', 'distributed'],
    hybrid: ['hybrid', 'mixed', 'hybrid work', 'partial remote', 'flexible', 'hybrid-remote', 'some remote', '2-3 days remote', 'blended'],
    onsite: ['onsite', 'on-site', 'office', 'in-office', 'on site', 'in office', 'in-person', 'on location', 'in person', 'collocated', 'on-premise']
  },
  
  // Countries (significantly expanded)
  country: {
    'united states': ['usa', 'us', 'united states', 'united states of america', 'america', 'u.s.', 'u.s.a.', 'united states of america (usa)', 'america (usa)', 'united states usa'],
    'canada': ['canada', 'ca', 'can'],
    'united kingdom': ['uk', 'united kingdom', 'great britain', 'gb', 'england', 'scotland', 'wales', 'northern ireland', 'britain', 'u.k.'],
    'australia': ['australia', 'au', 'aus'],
    'germany': ['germany', 'de', 'deutschland', 'deu'],
    'france': ['france', 'fr', 'fra'],
    'italy': ['italy', 'it', 'ita'],
    'spain': ['spain', 'es', 'esp', 'espana'],
    'japan': ['japan', 'jp', 'jpn'],
    'china': ['china', 'cn', 'chn'],
    'india': ['india', 'in', 'ind'],
    'mexico': ['mexico', 'mx', 'mex'],
    'brazil': ['brazil', 'br', 'bra'],
    'south korea': ['south korea', 'kr', 'kor', 'korea'],
    'russia': ['russia', 'ru', 'rus'],
    'netherlands': ['netherlands', 'nl', 'nld', 'holland'],
    'sweden': ['sweden', 'se', 'swe'],
    'norway': ['norway', 'no', 'nor'],
    'denmark': ['denmark', 'dk', 'dnk'],
    'finland': ['finland', 'fi', 'fin'],
    'switzerland': ['switzerland', 'ch', 'che'],
    'belgium': ['belgium', 'be', 'bel'],
    'austria': ['austria', 'at', 'aut'],
    'poland': ['poland', 'pl', 'pol'],
    'ireland': ['ireland', 'ie', 'irl'],
    'portugal': ['portugal', 'pt', 'prt'],
    'new zealand': ['new zealand', 'nz', 'nzl']
  },
  
  // US States (complete list with common abbreviations)
  state: {
    'alabama': ['al', 'alabama', 'ala', 'alabama state'],
    'alaska': ['ak', 'alaska', 'alaska state'],
    'arizona': ['az', 'arizona', 'ariz', 'arizona state'],
    'arkansas': ['ar', 'arkansas', 'ark', 'arkansas state'],
    'california': ['ca', 'california', 'calif', 'cal', 'california state'],
    'colorado': ['co', 'colorado', 'colo', 'colorado state'],
    'connecticut': ['ct', 'connecticut', 'conn', 'connecticut state'],
    'delaware': ['de', 'delaware', 'del', 'delaware state'],
    'florida': ['fl', 'florida', 'fla', 'florida state'],
    'georgia': ['ga', 'georgia', 'ga.', 'georgia state'],
    'hawaii': ['hi', 'hawaii', 'hawaii state'],
    'idaho': ['id', 'idaho', 'idaho state'],
    'illinois': ['il', 'illinois', 'illinois state'],
    'indiana': ['in', 'indiana', 'indiana state'],
    'iowa': ['ia', 'iowa', 'iowa state'],
    'kansas': ['ks', 'kansas', 'kan', 'kansas state'],
    'kentucky': ['ky', 'kentucky', 'kent', 'ken', 'kentucky state'],
    'louisiana': ['la', 'louisiana', 'louisiana state'],
    'maine': ['me', 'maine', 'maine state'],
    'maryland': ['md', 'maryland', 'md.', 'maryland state'],
    'massachusetts': ['ma', 'massachusetts', 'mass', 'massachusetts state'],
    'michigan': ['mi', 'michigan', 'mich', 'michigan state'],
    'minnesota': ['mn', 'minnesota', 'minn', 'minnesota state'],
    'mississippi': ['ms', 'mississippi', 'miss', 'mississippi state'],
    'missouri': ['mo', 'missouri', 'missouri state'],
    'montana': ['mt', 'montana', 'mont', 'montana state'],
    'nebraska': ['ne', 'nebraska', 'neb', 'nebr', 'nebraska state'],
    'nevada': ['nv', 'nevada', 'nev', 'nevada state'],
    'new hampshire': ['nh', 'new hampshire', 'n.h.', 'new hampshire state'],
    'new jersey': ['nj', 'new jersey', 'n.j.', 'new jersey state'],
    'new mexico': ['nm', 'new mexico', 'n.m.', 'new mexico state'],
    'new york': ['ny', 'new york', 'n.y.', 'new york state'],
    'north carolina': ['nc', 'north carolina', 'n.c.', 'north carolina state'],
    'north dakota': ['nd', 'north dakota', 'n.d.', 'north dakota state'],
    'ohio': ['oh', 'ohio', 'ohio state'],
    'oklahoma': ['ok', 'oklahoma', 'okla', 'oklahoma state'],
    'oregon': ['or', 'oregon', 'ore', 'oreg', 'oregon state'],
    'pennsylvania': ['pa', 'pennsylvania', 'penn', 'pennsylvania state'],
    'rhode island': ['ri', 'rhode island', 'r.i.', 'rhode island state'],
    'south carolina': ['sc', 'south carolina', 's.c.', 'south carolina state'],
    'south dakota': ['sd', 'south dakota', 's.d.', 'south dakota state'],
    'tennessee': ['tn', 'tennessee', 'tenn', 'tennessee state'],
    'texas': ['tx', 'texas', 'tex', 'tex.', 'texas state'],
    'utah': ['ut', 'utah', 'utah state'],
    'vermont': ['vt', 'vermont', 'vt.', 'vermont state'],
    'virginia': ['va', 'virginia', 'va.', 'virginia state'],
    'washington': ['wa', 'washington', 'wash', 'washington state'],
    'west virginia': ['wv', 'west virginia', 'w.v.', 'west virginia state'],
    'wisconsin': ['wi', 'wisconsin', 'wis', 'wisc', 'wisconsin state'],
    'wyoming': ['wy', 'wyoming', 'wyo', 'wyoming state'],
    'district of columbia': ['dc', 'district of columbia', 'washington dc', 'd.c.']
  }
};

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_ALIASES, VALUE_MAPPINGS };
}