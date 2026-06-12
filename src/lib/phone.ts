export function normalizeChinaPhoneToE164(value: string) {
  const compact = value.trim().replace(/[\s-]/g, "");
  if (/^1[3-9]\d{9}$/.test(compact)) {
    return `+86${compact}`;
  }
  if (/^\+861[3-9]\d{9}$/.test(compact)) {
    return compact;
  }
  return null;
}

export function formatChinaPhone(value: string | null | undefined) {
  if (!value) return "";
  if (/^\+86\d{11}$/.test(value)) return value.slice(3);
  return value;
}

export function phoneToAuthEmail(normalizedPhone: string) {
  return `${normalizedPhone.replace(/\D/g, "")}@phone.family-companion.local`;
}
