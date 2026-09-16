import { findBillType, parseAmount } from '@/lib/parsers';
import type { MessageKey } from '@/lib/i18n/messages';

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const AMOUNT_MAX = 1_000_000_000;

export function validateEmail(value: string, t: TFunction): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return t('validation.required');
  if (!EMAIL_PATTERN.test(trimmed)) return t('validation.email');
  return undefined;
}

export function validatePassword(value: string, t: TFunction): string | undefined {
  if (value.length === 0) return t('validation.required');
  if (value.length < 6) return t('validation.password.min');
  if (value.length > 50) return t('validation.password.max');
  return undefined;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginField = keyof LoginFormValues;

export function validateLoginForm(values: LoginFormValues, t: TFunction): FieldErrors<LoginField> {
  return {
    email: validateEmail(values.email, t),
    password: validatePassword(values.password, t),
  };
}

export interface RegisterFormValues extends LoginFormValues {
  fullName: string;
  confirmPassword: string;
}

export type RegisterField = keyof RegisterFormValues;

export function validateRegisterForm(
  values: RegisterFormValues,
  t: TFunction,
): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = validateLoginForm(values, t);

  if (values.confirmPassword.length === 0) {
    errors.confirmPassword = t('validation.required');
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = t('validation.password.mismatch');
  }

  if (values.fullName.trim().length > 120) {
    errors.fullName = t('validation.content.max');
  }

  return errors;
}

export interface BillFormValues {
  type: string;
  amount: string;
  content: string;
}

export type BillField = keyof BillFormValues;

export function validateBillForm(values: BillFormValues, t: TFunction): FieldErrors<BillField> {
  const errors: FieldErrors<BillField> = {};

  if (!findBillType(values.type)) {
    errors.type = t('validation.required');
  }

  const amount = parseAmount(values.amount);
  if (amount === null) {
    errors.amount = t('validation.amount.invalid');
  } else if (amount > AMOUNT_MAX) {
    errors.amount = t('validation.amount.max');
  }

  const content = values.content.trim();
  if (content.length === 0) {
    errors.content = t('validation.required');
  } else if (content.length < 3) {
    errors.content = t('validation.content.min');
  } else if (content.length > 255) {
    errors.content = t('validation.content.max');
  }

  return errors;
}

export function validatePin(value: string, t: TFunction): string | undefined {
  if (value.trim().length === 0) return t('validation.required');
  if (!/^\d{4}$/.test(value.trim())) return t('validation.pin.length');
  return undefined;
}

export function hasErrors<T extends string>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some((message) => typeof message === 'string');
}