import { useCallback } from 'react'
import useGetPropsForField from './useGetPropsForField'
import type { Controller } from './useController'
import type { FieldName, SchemaNode } from './types'

export interface InputOptions {
  /**
   * Input type. `checkbox` binds `checked` to a boolean value; `radio` binds `checked` to whether the value
   * equals `value`. Any other type binds `value`.
   */
  type?: string
  /** For radio buttons, the value the button represents. */
  value?: string
}

/**
 * Props for native `<input>`, `<select>` and `<textarea>` elements. Unlike field props, they have no
 * `error`, and the value is never `undefined`, so inputs stay controlled.
 */
export interface InputProps {
  name: string
  type?: string
  value?: string | number | readonly string[]
  checked?: boolean
  'aria-invalid'?: boolean
  onChange: (event: any) => void
  onBlur: () => void
  onFocus: () => void
  ref?: (element: any) => void
}

/**
 * Returns a function that builds props to spread directly on native form elements.
 *
 * @example
 * const getPropsForInput = useGetPropsForInput(form)
 *
 * <input {...getPropsForInput('email')} />
 * <input {...getPropsForInput('newsletter', { type: 'checkbox' })} />
 * <input {...getPropsForInput('plan', { type: 'radio', value: 'pro' })} />
 * <select {...getPropsForInput('country')}>…</select>
 */
export function useGetPropsForInput<S extends SchemaNode, E = any>(
  form: Controller<S, E>,
): (name: FieldName<S>, options?: InputOptions) => InputProps
export function useGetPropsForInput(form: any) {
  const getPropsForField = useGetPropsForField(form)

  return useCallback(
    (name: any, { type, value: optionValue }: InputOptions = {}): InputProps => {
      const {
        name: fieldName,
        value,
        error,
        onChange,
        onBlur,
        onFocus,
        ref,
      } = getPropsForField(name)
      const props: InputProps = { name: String(fieldName), onChange, onBlur, onFocus }

      if (error !== undefined) props['aria-invalid'] = true
      if (ref) props.ref = ref
      if (type) props.type = type

      switch (type) {
        case 'checkbox':
          props.checked = Boolean(value)
          break
        case 'radio':
          props.value = optionValue
          props.checked = value === optionValue
          break
        default:
          props.value = value ?? ''
      }

      return props
    },
    [getPropsForField],
  )
}

export default useGetPropsForInput
