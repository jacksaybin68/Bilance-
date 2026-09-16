'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import {
  FieldError,
  buildInputClass,
  cardClassName,
  labelClassName,
  primaryButtonClassName,
} from '@/components/ui/form';
import { getErrorMessage } from '@/lib/api/client';
import { billApi } from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { findBillType } from '@/lib/parsers';
import { BILL_TYPES, Bill, BillType } from '@/types/api';
import { BillField, BillFormValues, hasErrors, validateBillForm } from '@/lib/validation';

const TYPE_LABEL: Record<BillType, MessageKey> = {
  transfer: 'bill.type.transfer',
  'e-wallet': 'bill.type.e-wallet',
  fluctuation: 'bill.type.fluctuation',
  priority: 'bill.type.priority',
};

const emptyForm: BillFormValues = { type: 'transfer', amount: '', content: '' };

export default function BillPage() {
  const { t, locale } = useI18n();
  const [values, setValues] = useState<BillFormValues>(emptyForm);
  const [errors, setErrors] = useState<{
    type?: string;
    amount?: string;
    content?: string;
  }>({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(true);

  const loadRecentBills = useCallback(async () => {
    setIsLoadingBills(true);
    try {
      setRecentBills(await billApi.list());
    } catch {
      setRecentBills([]);
    } finally {
      setIsLoadingBills(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentBills();
  }, [loadRecentBills]);

  const updateField = <T extends BillField>(field: T, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    const validationErrors = validateBillForm(values, t);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    const billType = findBillType(values.type);
    if (!billType) return;

    setIsSubmitting(true);
    try {
      const created = await billApi.create({
        type: billType,
        content: values.content.trim(),
      });

      setSuccessMessage(t('bill.success', { id: created.id }));
      setValues(emptyForm);
      await loadRecentBills();
    } catch (error) {
      setFormError(getErrorMessage(error, t('common.error')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className={cardClassName}>
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('bill.title')}
        </h1>

        <Alert variant="error" message={formError} className="mb-4" />
        <Alert variant="success" message={successMessage} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className={labelClassName} htmlFor="bill-type">
              {t('bill.type')}
            </label>
            <select
              id="bill-type"
              value={values.type}
              onChange={(event) => updateField('type', event.target.value)}
              className={buildInputClass(Boolean(errors.type))}
            >
              {BILL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(TYPE_LABEL[type])}
                </option>
              ))}
            </select>
            <FieldError id="bill-type-error" message={errors.type} />
          </div>

          <div>
            <label className={labelClassName} htmlFor="bill-amount">
              {t('bill.amount')}
            </label>
            <input
              id="bill-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => updateField('amount', event.target.value)}
              placeholder={t('bill.amount.placeholder')}
              aria-invalid={Boolean(errors.amount)}
              className={buildInputClass(Boolean(errors.amount))}
            />
            <FieldError id="bill-amount-error" message={errors.amount} />
          </div>

          <div>
            <label className={labelClassName} htmlFor="bill-content">
              {t('bill.content')}
            </label>
            <input
              id="bill-content"
              type="text"
              value={values.content}
              maxLength={255}
              onChange={(event) => updateField('content', event.target.value)}
              placeholder={t('bill.content.placeholder')}
              aria-invalid={Boolean(errors.content)}
              className={buildInputClass(Boolean(errors.content))}
            />
            <FieldError id="bill-content-error" message={errors.content} />
          </div>

          <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
            {isSubmitting ? t('bill.submitting') : t('bill.submit')}
          </button>
        </form>
      </div>

      <div className={`${cardClassName} mt-6`}>
        <h2 className="mb-4 text-xl font-medium text-gray-900 dark:text-gray-100">
          {t('bill.recent')}
        </h2>

        {isLoadingBills ? (
          <Spinner label={t('common.loading')} />
        ) : recentBills.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {recentBills.slice(0, 10).map((bill) => (
              <li
                key={bill.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-700/50 dark:text-gray-200"
              >
                <span>{t(TYPE_LABEL[bill.type])}</span>
                <span className="truncate">{bill.content}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(bill.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
