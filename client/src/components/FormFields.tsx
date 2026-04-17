import React from 'react';

/* ── Shared form field styles ── */

const baseInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#0f172a',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export const FormField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <label
      className="block mb-1.5 font-medium"
      style={{ fontSize: '13px', color: '#374151' }}
    >
      {label}
    </label>
    {children}
  </div>
);

export const FormInput = (
  props: React.InputHTMLAttributes<HTMLInputElement>,
) => <input {...props} style={{ ...baseInput, ...(props.style || {}) }} />;

export const FormSelect = ({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} style={{ ...baseInput, ...(props.style || {}), appearance: 'auto' }}>
    {children}
  </select>
);

export const FormTextarea = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) => (
  <textarea
    {...props}
    style={{ ...baseInput, ...(props.style || {}), minHeight: '80px', resize: 'vertical' }}
  />
);

export const SubmitButton = ({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    type="submit"
    disabled={disabled}
    className="w-full py-2.5 rounded-lg font-medium transition-all duration-200"
    style={{
      background: disabled ? '#94a3b8' : '#3b82f6',
      color: 'white',
      fontSize: '14px',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {children}
  </button>
);
