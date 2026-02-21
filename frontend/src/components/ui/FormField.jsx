/**
 * Shared reusable form field with inline error display.
 *
 * Usage:
 *   <FormField label="Name" error={errors.name}>
 *     <input ... className={inputCls(errors.name)} />
 *   </FormField>
 *
 * Or with the InputField / SelectField shortcuts:
 *   <InputField label="Name" name="name" form={form} errors={errors} onChange={setF} />
 */
import React from "react";

// Base className for every input — append this to your input's className
export const inputCls = (error) =>
  `w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-200
   focus:outline-none transition-colors
   ${error ? "border-red-500 focus:border-red-400" : "border-gray-700 focus:border-indigo-500"}`;

export function FormField({ label, error, required: req, children }) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1">
        {label}
        {req && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

/** Controlled text / number / date shortcut */
export function InputField({
  label,
  name,
  form,
  errors = {},
  onChange,
  type = "text",
  placeholder = "",
  required: req = false,
  min,
  step,
  disabled = false,
  className = "",
}) {
  return (
    <FormField label={label} error={errors[name]} required={req}>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        disabled={disabled}
        className={`${inputCls(errors[name])} ${className}`}
      />
    </FormField>
  );
}

/** Controlled select shortcut */
export function SelectField({
  label,
  name,
  form,
  errors = {},
  onChange,
  options = [],
  required: req = false,
  disabled = false,
}) {
  return (
    <FormField label={label} error={errors[name]} required={req}>
      <select
        value={form[name] ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        className={inputCls(errors[name])}
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
