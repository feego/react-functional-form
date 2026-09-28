/**
 * Field props spread directly on native elements (change events are unwrapped), and focusing the first
 * invalid field when a submission fails.
 */
import {
  createField,
  createForm,
  requiredValidator,
  useController,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, Debug } from '../components/ui'
import { notify } from '../components/fakeApi'

const schema = createForm([
  ['name', createField<string>([requiredValidator])],
  ['plan', createField<string>([requiredValidator])],
  ['message', createField<string>([requiredValidator])],
  ['acceptTerms', createField<boolean>([requiredValidator])],
])

export default function NativeInputs() {
  const form = useController({
    schema,
    shouldFocusError: true, // Field props get a `ref`, used to focus the first invalid field.
    onSubmit: (values) => notify(JSON.stringify(values, null, 2)),
  })
  const getPropsForField = useGetPropsForField(form)

  // `error` isn't a DOM attribute, so take it out before spreading.
  const { error: nameError, ...name } = getPropsForField('name')
  const { error: planError, ...plan } = getPropsForField('plan')
  const { error: messageError, ...message } = getPropsForField('message')
  const { error: termsError, value: acceptTerms, ...terms } = getPropsForField('acceptTerms')

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <label className="rff-field">
          <span className="rff-label">Name</span>
          <input className="rff-input" {...name} value={name.value ?? ''} />
          {nameError && <span className="rff-error">{nameError}</span>}
        </label>

        <label className="rff-field">
          <span className="rff-label">Plan</span>
          <select className="rff-input" {...plan} value={plan.value ?? ''}>
            <option value="">Choose…</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
          {planError && <span className="rff-error">{planError}</span>}
        </label>

        <label className="rff-field">
          <span className="rff-label">Message</span>
          <textarea className="rff-input" rows={3} {...message} value={message.value ?? ''} />
          {messageError && <span className="rff-error">{messageError}</span>}
        </label>

        <label>
          <input type="checkbox" {...terms} checked={Boolean(acceptTerms)} /> I accept the terms
          {termsError && <span className="rff-error"> (required)</span>}
        </label>

        <Button type="submit">Send</Button>
      </form>
      <Debug data={{ values: form.values }} />
    </>
  )
}
