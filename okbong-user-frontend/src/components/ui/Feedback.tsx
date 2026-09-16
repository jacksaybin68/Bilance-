export type AlertVariant = 'success' | 'error' | 'info';

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
};

/** Small inline status message with light/dark support. */
export function Alert({
  variant = 'info',
  message,
  className = '',
}: {
  variant?: AlertVariant;
  message: string;
  className?: string;
}) {
  if (message.length === 0) return null;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={[
        'rounded-md border px-3 py-2 text-sm',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter((value) => value.length > 0)
        .join(' ')}
    >
      {message}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary dark:border-gray-600 dark:border-t-primary"
        aria-hidden="true"
      />
      {label ? <span>{label}</span> : null}
    </div>
  );
}