/** The single password policy — enforced identically at signup and reset. */
export const PASSWORD_RULES = [
  { label: "8–30 characters", test: (v: string) => v.length >= 8 && v.length <= 30 },
  { label: "1 uppercase character", test: (v: string) => /[A-Z]/.test(v) },
  { label: "1 lowercase character", test: (v: string) => /[a-z]/.test(v) },
  { label: "1 number", test: (v: string) => /\d/.test(v) },
  { label: "1 special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordMeetsRules(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
