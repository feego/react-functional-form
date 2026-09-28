import { createContext, createElement, useContext, type ReactNode } from 'react'
import type { Controller } from './useController'
import type { SchemaNode } from './types'

const FormContext = createContext<Controller<any> | null>(null)

export interface FormProviderProps<S extends SchemaNode = any> {
  /** The form controller (the `useController` return value). */
  form: Controller<S>
  children?: ReactNode
}

/**
 * Makes a form controller available to every component below it through `useFormContext`, to avoid
 * passing it down through props.
 */
export const FormProvider = <S extends SchemaNode>({ form, children }: FormProviderProps<S>) =>
  createElement(FormContext.Provider, { value: form }, children)

/**
 * Returns the form controller given to the closest `FormProvider`.
 */
export const useFormContext = <S extends SchemaNode = any>(): Controller<S> => {
  const form = useContext(FormContext)

  if (form === null) {
    throw new Error('useFormContext must be used inside a <FormProvider>.')
  }

  return form as Controller<S>
}
