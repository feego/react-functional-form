import type { ComponentType } from 'react'
import AsyncValidation from './AsyncValidation'
import DynamicSchema from './DynamicSchema'
import EditProfile from './EditProfile'
import FieldArrays from './FieldArrays'
import FormContext from './FormContext'
import NativeInputs from './NativeInputs'
import NestedForms from './NestedForms'
import PersistedDraft from './PersistedDraft'
import ServerErrors from './ServerErrors'
import SignUpForm from './SignUpForm'
import ZodValidation from './ZodValidation'

export interface Example {
  id: string
  title: string
  description: string
  file: string
  Component: ComponentType
}

export const examples: Example[] = [
  {
    id: 'sign-up',
    title: 'Sign-up form',
    description: 'Schema, validators, error messages and submit state: the basics.',
    file: 'SignUpForm.tsx',
    Component: SignUpForm,
  },
  {
    id: 'zod',
    title: 'Zod validation',
    description: 'Standard Schema (Zod, Valibot, ArkType) per field and for the whole form.',
    file: 'ZodValidation.tsx',
    Component: ZodValidation,
  },
  {
    id: 'nested-forms',
    title: 'Nested forms',
    description: 'A reusable address sub-form used twice in the same form.',
    file: 'NestedForms.tsx',
    Component: NestedForms,
  },
  {
    id: 'field-arrays',
    title: 'Field arrays',
    description: 'Add, remove and reorder sub-forms, with a list-level validator.',
    file: 'FieldArrays.tsx',
    Component: FieldArrays,
  },
  {
    id: 'async-validation',
    title: 'Async validation',
    description: 'A validator that checks with the server, with a pending state.',
    file: 'AsyncValidation.tsx',
    Component: AsyncValidation,
  },
  {
    id: 'server-errors',
    title: 'Server errors',
    description: 'Show errors returned by an API on the right fields.',
    file: 'ServerErrors.tsx',
    Component: ServerErrors,
  },
  {
    id: 'edit-profile',
    title: 'Edit form: dirty state & reset',
    description: 'Know what changed, discard changes, and save.',
    file: 'EditProfile.tsx',
    Component: EditProfile,
  },
  {
    id: 'native-inputs',
    title: 'Native inputs & focus on error',
    description: 'useGetPropsForInput on plain inputs, selects, radios, textareas and checkboxes.',
    file: 'NativeInputs.tsx',
    Component: NativeInputs,
  },
  {
    id: 'dynamic-schema',
    title: 'Schema built from the values',
    description: 'Fields that change based on other fields, with lifted form state.',
    file: 'DynamicSchema.tsx',
    Component: DynamicSchema,
  },
  {
    id: 'persisted-draft',
    title: 'Persisted draft',
    description: 'Form values stored in localStorage through a custom state hook.',
    file: 'PersistedDraft.tsx',
    Component: PersistedDraft,
  },
  {
    id: 'form-context',
    title: 'Form context',
    description: 'Share the form with nested components through FormProvider.',
    file: 'FormContext.tsx',
    Component: FormContext,
  },
]
