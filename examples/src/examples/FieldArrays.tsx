/**
 * A list of sub-forms that can be added, removed and reordered, with a list-level validator.
 */
import {
  createField,
  createForm,
  createList,
  createMinLengthValidator,
  requiredValidator,
  useController,
  useFieldArray,
  useGetPropsForField,
  useGetPropsForNestedForm,
  type ControllerProps,
} from 'react-functional-form'
import { Button, Debug, TextInput } from '../components/ui'
import { notify } from '../components/fakeApi'

const memberSchema = createForm([
  ['name', createField<string>([requiredValidator])],
  ['role', createField<string>()],
])

const schema = createForm([
  ['team', createField<string>([requiredValidator])],
  ['members', createList(memberSchema, [createMinLengthValidator(1, 'Add at least one member')])],
])

function MemberRow({
  propsForForm,
  onRemove,
  onMoveUp,
}: {
  propsForForm: ControllerProps<typeof memberSchema>
  onRemove: () => void
  onMoveUp?: () => void
}) {
  const member = useController(propsForForm)
  const getPropsForField = useGetPropsForField(member)

  return (
    <div className="rff-row">
      <TextInput label="Name" {...getPropsForField('name')} />
      <TextInput label="Role" {...getPropsForField('role')} />
      <div className="rff-row-actions">
        {onMoveUp && (
          <Button variant="secondary" onClick={onMoveUp}>
            ↑
          </Button>
        )}
        <Button variant="secondary" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  )
}

export default function FieldArrays() {
  const form = useController({
    schema,
    initialValues: { members: [{ name: 'Ada', role: 'Engineer' }] },
    onSubmit: (values) => notify(JSON.stringify(values, null, 2)),
  })
  const getPropsForField = useGetPropsForField(form)
  // The list is a nested form whose keys are indexes.
  const members = useController(useGetPropsForNestedForm(form)('members'))
  const { items, append, remove, move } = useFieldArray(members)
  const getPropsForMember = useGetPropsForNestedForm(members)
  const listError = members.validationResult[2]

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <TextInput label="Team" {...getPropsForField('team')} />
        {items.map(({ key, index }) => (
          <MemberRow
            key={key}
            propsForForm={getPropsForMember(index)}
            onRemove={() => remove(index)}
            onMoveUp={index > 0 ? () => move(index, index - 1) : undefined}
          />
        ))}
        {listError && <p className="rff-error">{listError}</p>}
        <div className="rff-actions">
          <Button variant="secondary" onClick={() => append({ name: '', role: '' })}>
            Add member
          </Button>
          <Button type="submit">Save team</Button>
        </div>
      </form>
      <Debug data={{ values: form.values, touched: form.touched, isDirty: form.isDirty }} />
    </>
  )
}
