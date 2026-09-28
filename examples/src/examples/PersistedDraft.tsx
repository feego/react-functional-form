/**
 * Form state is plain state, so it can live anywhere. Here the values are kept in localStorage through a
 * custom state hook, so the draft survives page reloads.
 */
import { useCallback, useState } from 'react'
import {
  createField,
  createForm,
  requiredValidator,
  useController,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, TextInput } from '../components/ui'
import { notify } from '../components/fakeApi'

/** Like `useState`, but persisted to localStorage. */
function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : initialValue
  })
  const setPersistedState = useCallback(
    (update: T | ((previous: T) => T)) =>
      setState((previous) => {
        const next =
          typeof update === 'function' ? (update as (previous: T) => T)(previous) : update
        localStorage.setItem(key, JSON.stringify(next))
        return next
      }),
    [key],
  )

  return [state, setPersistedState] as const
}

const schema = createForm({
  title: createField<string>([requiredValidator]),
  body: createField<string>([requiredValidator]),
})

export default function PersistedDraft() {
  const valuesStateHook = useLocalStorageState('rff-example-draft', { title: '', body: '' })
  const form = useController({
    schema,
    valuesStateHook,
    onSubmit: (values) => {
      notify(`Published "${values.title}"`)
      form.reset({ title: '', body: '' })
    },
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <TextInput
        label="Title"
        hint="Type something, then reload the page"
        {...getPropsForField('title')}
      />
      <TextInput label="Body" {...getPropsForField('body')} />
      <Button type="submit">Publish</Button>
    </form>
  )
}
