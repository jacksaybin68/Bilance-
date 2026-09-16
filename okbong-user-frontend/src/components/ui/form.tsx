export interface FieldErrorProps {
  id: string;
  message?: string;
}

/** Inline validation message rendered under a form control. */
export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export const inputClassName =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500';

export const invalidInputClassName = 'border-red-400 focus:ring-red-300 dark:border-red-500';

export const labelClassName =
  'mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300';

export const primaryButtonClassName =
  'inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60';

export const cardClassName =
  'rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-gray-700/60 dark:bg-gray-800';

export function buildInputClass(hasError: boolean, extra = ''): string {
  return [inputClassName, hasError ? invalidInputClassName : '', extra]
    .filter((value) => value.length > 0)
    .join(' ');
}