/**
 * Plain DOM elements wired with `useGetPropsForInput`, and focusing the first invalid field when a
 * submission fails.
 */
import {
  createField,
  createForm,
  requiredValidator,
  useController,
  useGetPropsForInput,
} from '@feego/react-functional-form'
import { Button, Debug } from '../components/ui'
import { notify } from '../components/fakeApi'

const schema = createForm({
  name: createField<string>([requiredValidator]),
  country: createField<string>([requiredValidator]),
  plan: createField<'free' | 'pro'>([requiredValidator]),
  message: createField<string>([requiredValidator]),
  acceptTerms: createField<boolean>([requiredValidator]),
})

export default function NativeInputs() {
  const form = useController({
    schema,
    shouldFocusError: true, // Inputs get a `ref`, used to focus the first invalid field.
    onSubmit: (values) => notify(JSON.stringify(values, null, 2)),
  })
  const getPropsForInput = useGetPropsForInput(form)
  const errorFor = (name: 'name' | 'country' | 'plan' | 'message' | 'acceptTerms') => {
    const { error } = form.getFieldState(name)
    return error && <span className="rff-error">{error}</span>
  }

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <label className="rff-field">
          <span className="rff-label">Name</span>
          <input className="rff-input" {...getPropsForInput('name')} />
          {errorFor('name')}
        </label>

        <label className="rff-field">
          <span className="rff-label">Country</span>
          <select className="rff-input" {...getPropsForInput('country')}>
            <option value="">Choose…</option>
            <option value="pt">Portugal</option>
            <option value="us">United States</option>
          </select>
          {errorFor('country')}
        </label>

        <fieldset className="rff-fieldset">
          <legend>Plan</legend>
          <label>
            <input {...getPropsForInput('plan', { type: 'radio', value: 'free' })} /> Free
          </label>
          <label>
            <input {...getPropsForInput('plan', { type: 'radio', value: 'pro' })} /> Pro
          </label>
          {errorFor('plan')}
        </fieldset>

        <label className="rff-field">
          <span className="rff-label">Message</span>
          <textarea className="rff-input" rows={3} {...getPropsForInput('message')} />
          {errorFor('message')}
        </label>

        <label>
          <input {...getPropsForInput('acceptTerms', { type: 'checkbox' })} /> I accept the terms
          {errorFor('acceptTerms')}
        </label>

        <Button type="submit">Send</Button>
      </form>
      <Debug data={{ values: form.values }} />
    </>
  )
}
