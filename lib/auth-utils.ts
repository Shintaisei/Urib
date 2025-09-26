// domainMapping: maps university email domains to university short names
const domainMapping: { [key: string]: string } = {
  "u-tokyo.ac.jp": "u-tokyo",
  "kyoto-u.ac.jp": "kyoto-u", 
  "osaka-u.ac.jp": "osaka-u",
  "nagoya-u.ac.jp": "nagoya-u",
  "tohoku.ac.jp": "tohoku",
  "hokudai.ac.jp": "hokudai",
  "kyushu-u.ac.jp": "kyushu-u",
  "tsukuba.ac.jp": "tsukuba",
  "chiba-u.ac.jp": "chiba-u",
  "kobe-u.ac.jp": "kobe-u",
  "hiroshima-u.ac.jp": "hiroshima-u",
  "okayama-u.ac.jp": "okayama-u",
  "kanazawa-u.ac.jp": "kanazawa-u",
  "niigata-u.ac.jp": "niigata-u",
  "shinshu-u.ac.jp": "shinshu-u",
  "gunma-u.ac.jp": "gunma-u",
  "ibaraki.ac.jp": "ibaraki",
  "saitama-u.ac.jp": "saitama-u",
  "yokohama-cu.ac.jp": "yokohama-cu",
  "tokyo-med.ac.jp": "tokyo-med",
  "tokyo-gaidai.ac.jp": "tokyo-gaidai",
  "tokyo-tech.ac.jp": "tokyo-tech",
  "hit-u.ac.jp": "hit-u",
  "waseda.jp": "waseda",
  "keio.jp": "keio",
  "meiji.ac.jp": "meiji",
  "rikkyo.ac.jp": "rikkyo",
  "sophia.ac.jp": "sophia",
  "icu.ac.jp": "icu",
  "chuo-u.ac.jp": "chuo-u",
  "hosei.ac.jp": "hosei",
  "aoyama.ac.jp": "aoyama",
  "gakushuin.ac.jp": "gakushuin",
  "seikei.ac.jp": "seikei",
  "tamagawa.ac.jp": "tamagawa",
  "doshisha.ac.jp": "doshisha",
  "ritsumei.ac.jp": "ritsumei",
  "kansai-u.ac.jp": "kansai-u",
  "kwansei.ac.jp": "kwansei",
  "do-johodai.ac.jp": "do-johodai",
}

/**
 * Extracts a university name from an email address using domain mapping.
 * 1. Checks for an exact match in domainMapping (e.g. 'u-tokyo.ac.jp')
 * 2. Checks for subdomain match (e.g. 's.hokudai.ac.jp')
 * 3. If no match, tries to infer university by cleaning up domain
 * @param email - user's email address
 * @returns university short name or 'unknown'
 */
export function extractUniversityFromEmail(email: string): string {
  const domain = email.split('@')[1] || ""

  // 1. Exact match with domainMapping
  if (domain in domainMapping) {
    return domainMapping[domain]
  }

  // 2. Check for subdomain match (domain ends with a known university domain)
  for (const univDomain in domainMapping) {
    if (domain.endsWith('.' + univDomain)) {
      return domainMapping[univDomain]
    }
  }

  // 3. Fallback: Remove typical prefixes, then extract main part before first dot
  let university = domain.replace(/^(s\.|m\.|mail\.|g\.|st\.|u\.|edu\.|ac\.)*/, "")
  university = university.replace(/\..*$/, "")
  if (!university) university = "unknown"

  return university
}