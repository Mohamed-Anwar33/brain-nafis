type SupabasePasswordSignInPayload =
  | {
      email: string;
      password: string;
    }
  | {
      phone: string;
      password: string;
    };

type AuthErrorLike = {
  code?: string;
  message?: string;
};

const ARABIC_INDIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_INDIC_DIGITS[digit] ?? digit);
}

export function isEmailIdentifier(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeDigits(value).trim());
}

export function isPhoneIdentifier(value: string) {
  const normalized = normalizeDigits(value).trim();

  if (!normalized || normalized.includes("@")) {
    return false;
  }

  if (!/^[+\d\s().-]+$/.test(normalized)) {
    return false;
  }

  const digitsOnly = normalized.replace(/\D/g, "");
  return digitsOnly.length >= 10;
}

export function normalizePhoneForSupabase(value: string) {
  const normalized = normalizeDigits(value).trim();
  const compact = normalized.replace(/[()\s-]/g, "");

  if (compact.startsWith("00")) {
    return `+${compact.slice(2).replace(/\D/g, "")}`;
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }

  const digitsOnly = compact.replace(/\D/g, "");

  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `+20${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 10 && digitsOnly.startsWith("1")) {
    return `+20${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("20")) {
    return `+${digitsOnly}`;
  }

  return digitsOnly;
}

export function buildPasswordSignInPayload(
  identifier: string,
  password: string,
): SupabasePasswordSignInPayload {
  const normalizedIdentifier = normalizeDigits(identifier).trim();

  if (isEmailIdentifier(normalizedIdentifier) || !isPhoneIdentifier(normalizedIdentifier)) {
    return {
      email: normalizedIdentifier.toLowerCase(),
      password,
    };
  }

  return {
    phone: normalizePhoneForSupabase(normalizedIdentifier),
    password,
  };
}

export function getPasswordSignInErrorMessage(
  error: AuthErrorLike | null,
  payload: SupabasePasswordSignInPayload,
) {
  if (!error) {
    return "حدث خطأ أثناء تسجيل الدخول";
  }

  if (error.code === "phone_provider_disabled" && "phone" in payload) {
    return "تسجيل الدخول برقم الجوال غير مفعل في Supabase. استخدم البريد الإلكتروني أو فعّل Phone provider.";
  }

  if (error.code === "invalid_credentials") {
    return "بيانات الدخول غير صحيحة";
  }

  return error.message || "حدث خطأ أثناء تسجيل الدخول";
}

export type { SupabasePasswordSignInPayload };
