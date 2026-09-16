'use client';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  const base = 'rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-gray-700/60 dark:bg-gray-800';
  const merged = [base, className ?? ''].filter((c) => c.length > 0).join(' ');
  return (
    <div className={merged}>
      {children}
    </div>
  );
}