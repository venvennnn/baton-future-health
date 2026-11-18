import { checkDemoCredentials, isRole, type Role } from "@/lib/session";

export interface LoginState {
  usernameError?: string;
  passwordError?: string;
  formError?: string;
}

const TEXT = {
  en: {
    username: "Enter the username.",
    password: "Enter the password.",
    mismatch: "Those credentials do not match this demo role.",
    switch: "You are signed in with a different demo role. Log out before switching.",
  },
  ar: {
    username: "أدخل اسم المستخدم.",
    password: "أدخل كلمة المرور.",
    mismatch: "بيانات الدخول لا تطابق دور العرض هذا.",
    switch: "أنت مسجّل بدور تجريبي مختلف. سجّل الخروج قبل التبديل.",
  },
} as const;

export function loginLocale(value: unknown): "en" | "ar" {
  return value === "ar" ? "ar" : "en";
}

export function requestedRole(value: unknown): Role {
  return isRole(value) ? value : "user";
}

/** Returns field or form errors. Null means the credentials match the selected role. */
export function loginFeedback(input: { role: Role; username: string; password: string; locale?: "en" | "ar" }): LoginState | null {
  const text = TEXT[input.locale ?? "en"];
  const usernameError = input.username.trim() ? undefined : text.username;
  const passwordError = input.password ? undefined : text.password;
  if (usernameError || passwordError) return { usernameError, passwordError };
  if (!checkDemoCredentials(input.role, input.username.trim(), input.password)) return { formError: text.mismatch };
  return null;
}

export function loginMessage(locale: "en" | "ar", key: "switch"): string {
  return TEXT[locale][key];
}
