/**
 * An edit form: dirty tracking against the saved values, discarding changes, and saving with `reset`.
 */
import { createField, createForm, useController, useGetPropsForField } from 'react-functional-form'
import { Button, TextInput } from '../components/ui'
import { api } from '../components/fakeApi'

const schema = createForm({ displayName: createField<string>(), bio: createField<string>() })

export default function EditProfile() {
  const form = useController({
    schema,
    initialValues: { displayName: 'Ada Lovelace', bio: 'First programmer.' },
    // The saved values become the new defaults, so the form is clean again.
    onSubmit: async (values) => form.reset(await api.save(values)),
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <TextInput
        label="Display name"
        hint={form.dirty.displayName ? 'Changed' : undefined}
        {...getPropsForField('displayName')}
      />
      <TextInput
        label="Bio"
        hint={form.dirty.bio ? 'Changed' : undefined}
        {...getPropsForField('bio')}
      />
      <div className="rff-actions">
        <Button variant="secondary" disabled={!form.isDirty} onClick={() => form.reset()}>
          Discard changes
        </Button>
        <Button type="submit" disabled={!form.isDirty || form.submitState.isSubmitting}>
          {form.submitState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
