/**
 * Minimal presentational components shared by the examples. They take the props built by
 * `useGetPropsForField` as they are, which is how you'd typically wire your own design system.
 */
import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  name: PropertyKey
  value?: any
  error?: ReactNode
  hint?: ReactNode
  onChange: (value: any) => void
  onBlur: () => void
  onFocus: () => void
  ref?: (element: HTMLElement | null) => void
}

export const TextInput = ({
  label,
  hint,
  type = 'text',
  error,
  ...props
}: FieldProps & { type?: string }) => (
  <label className="rff-field">
    <span className="rff-label">{label}</span>
    <input
      className="rff-input"
      aria-invalid={Boolean(error)}
      name={String(props.name)}
      type={type}
      value={props.value ?? ''}
      ref={props.ref}
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
    />
    {hint && !error && <span className="rff-hint">{hint}</span>}
    {error && <span className="rff-error">{error}</span>}
  </label>
)

export const Select = ({
  label,
  options,
  error,
  ...props
}: FieldProps & { options: { value: string; label: string }[] }) => (
  <label className="rff-field">
    <span className="rff-label">{label}</span>
    <select
      className="rff-input"
      aria-invalid={Boolean(error)}
      name={String(props.name)}
      value={props.value ?? ''}
      ref={props.ref}
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
    >
      <option value="">Choose…</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <span className="rff-error">{error}</span>}
  </label>
)

export const Button = ({
  children,
  variant = 'primary',
  type = 'button',
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}) => (
  <button type={type} className={`rff-button rff-button--${variant}`} {...props}>
    {children}
  </button>
)

/** Shows the form state, to see what the library does as you interact with the example. */
export const Debug = ({ data }: { data: Record<string, unknown> }) => (
  <details className="rff-debug">
    <summary>Form state</summary>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </details>
)
