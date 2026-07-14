export function validatePassword(pwd, t) {
  if (pwd.length < 6) return t('login.pwdMinLength');
  if (!/[A-Z]/.test(pwd)) return t('login.pwdUpperCase');
  if (!/[a-z]/.test(pwd)) return t('login.pwdLowerCase');
  if (!/\d/.test(pwd)) return t('login.pwdNumber');
  return null;
}
