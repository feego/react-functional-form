import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { z } from 'zod'
import {
  createField,
  createForm,
  createList,
  createMinLengthValidator,
  createStandardSchemaValidate,
  createValidator,
  FormProvider,
  requiredValidator,
  useController,
  useFieldArray,
  useFormContext,
  useGetPropsForField,
  useGetPropsForNestedForm,
  type ControllerProps,
} from '../src'

const schema = createForm([
  ['name', createField<string>([requiredValidator])],
  ['newsletter', createField<boolean>()],
  ['address', createForm([['city', createField<string>([requiredValidator])]])],
])

const useForm = (props: Partial<ControllerProps<typeof schema>> = {}) => {
  const controller = useController({ schema, ...props })
  return {
    controller,
    getPropsForField: useGetPropsForField(controller),
    getPropsForNestedForm: useGetPropsForNestedForm(controller),
  }
}

describe('submission', () => {
  it('tracks submit state for async submit handlers', async () => {
    let resolve!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    const { result } = renderHook(() =>
      useForm({ onSubmit, initialValues: { name: 'Ann', address: { city: 'Lisbon' } } }),
    )

    let submission: any
    act(() => {
      submission = result.current.controller.onSubmit()
    })
    expect(result.current.controller.submitState).toMatchObject({
      isSubmitting: true,
      submitCount: 1,
      isSubmitted: false,
    })

    await act(async () => {
      resolve()
      await submission
    })
    expect(await submission).toEqual([
      true,
      { name: [true], newsletter: [true], address: [true, { city: [true] }] },
    ])
    expect(result.current.controller.submitState).toEqual({
      isSubmitting: false,
      isSubmitted: true,
      isSubmitSuccessful: true,
      submitCount: 1,
      submitError: undefined,
    })
  })

  it('stores and rethrows submit errors', async () => {
    const error = new Error('Server down')
    const { result } = renderHook(() =>
      useForm({
        onSubmit: async () => Promise.reject(error),
        initialValues: { name: 'Ann', address: { city: 'Lisbon' } },
      }),
    )

    await act(async () => {
      await expect(result.current.controller.onSubmit()).rejects.toBe(error)
    })
    expect(result.current.controller.submitState).toMatchObject({
      isSubmitSuccessful: false,
      submitError: error,
    })
  })

  it('calls onInvalid and prevents the default submit event', () => {
    const onInvalid = vi.fn()
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useForm({ onInvalid, onSubmit }))
    const event = { type: 'submit', preventDefault: vi.fn(), defaultPrevented: false }

    act(() => {
      result.current.controller.onSubmit(event)
    })

    expect(event.preventDefault).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onInvalid.mock.calls[0][0][1].name).toEqual([false, 'Required'])
    expect(result.current.controller.submitState).toMatchObject({
      isSubmitted: true,
      isSubmitSuccessful: false,
    })
  })

  it('focuses the first invalid field when shouldFocusError is enabled', () => {
    const Form = () => {
      const { controller, getPropsForField, getPropsForNestedForm } = useForm({
        shouldFocusError: true,
        initialValues: { name: 'Ann' },
      })
      const address = useController(getPropsForNestedForm('address'))
      const getPropsForAddressField = useGetPropsForField(address)
      const { error: _nameError, ...nameProps } = getPropsForField('name')
      const { error: _cityError, ...cityProps } = getPropsForAddressField('city')

      return (
        <form onSubmit={controller.onSubmit}>
          <input aria-label="Name" {...nameProps} value={nameProps.value ?? ''} />
          <input aria-label="City" {...(cityProps as any)} value={cityProps.value ?? ''} />
          <button type="submit">Submit</button>
        </form>
      )
    }
    render(<Form />)

    fireEvent.click(screen.getByText('Submit'))
    expect(document.activeElement).toBe(screen.getByLabelText('City'))
  })
})

describe('async validation', () => {
  it('flags isValidating and keeps the last result while pending', async () => {
    const isTaken = vi.fn(async (value: string) => (value === 'taken' ? 'Taken' : undefined))
    const asyncSchema = createForm([['username', createField([createValidator(isTaken)])]])
    const { result } = renderHook(() => {
      const controller = useController({ schema: asyncSchema, validateOnInit: true })
      return { controller, getPropsForField: useGetPropsForField(controller) }
    })

    expect(result.current.controller.isValidating).toBe(true)
    await waitFor(() => expect(result.current.controller.isValidating).toBe(false))
    expect(result.current.controller.validationResult[0]).toBe(true)

    act(() => result.current.getPropsForField('username').onChange('taken'))
    expect(result.current.controller.isValidating).toBe(true)
    await waitFor(() => expect(result.current.getPropsForField('username').error).toBe('Taken'))
    expect(isTaken).toHaveBeenCalledTimes(2)
  })

  it('waits for async validation on submit', async () => {
    const onSubmit = vi.fn()
    const asyncSchema = createForm([
      [
        'username',
        createField([createValidator(async (value) => (value ? undefined : 'Required'))]),
      ],
    ])
    const { result } = renderHook(() =>
      useController({ schema: asyncSchema, onSubmit, initialValues: { username: 'ann' } }),
    )

    await act(async () => {
      await result.current.onSubmit()
    })
    expect(onSubmit).toHaveBeenCalledWith({ username: 'ann' })
  })

  it('supports form-level Standard Schema validation', () => {
    const passwords = createForm([
      ['password', createField<string>()],
      ['confirm', createField<string>()],
    ])
    const { result } = renderHook(() => {
      const controller = useController({
        schema: passwords,
        initialValues: { password: 'a', confirm: 'b' },
        validate: createStandardSchemaValidate(
          z
            .object({ password: z.string(), confirm: z.string() })
            .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Must match' }),
        ),
      })
      return useGetPropsForField(controller)
    })

    expect(result.current('confirm').error).toBeUndefined()
    act(() => result.current('confirm').onBlur())
    expect(result.current('confirm').error).toBe('Must match')
  })
})

describe('dirty state and reset', () => {
  it('compares values with the default values, including nested forms', () => {
    const { result } = renderHook(() => {
      const form = useForm({ initialValues: { name: 'Ann', address: { city: 'Lisbon' } } })
      const address = useController(form.getPropsForNestedForm('address'))
      return { ...form, address, getPropsForAddressField: useGetPropsForField(address) }
    })

    expect(result.current.controller.isDirty).toBe(false)
    act(() => result.current.getPropsForAddressField('city').onChange('Porto'))
    expect(result.current.controller.isDirty).toBe(true)
    expect(result.current.controller.dirty).toEqual({
      name: false,
      newsletter: false,
      address: { city: true },
    })
    expect(result.current.address.isDirty).toBe(true)
    expect(result.current.controller.getFieldState('address').dirty).toBe(true)

    act(() => result.current.getPropsForAddressField('city').onChange('Lisbon'))
    expect(result.current.controller.isDirty).toBe(false)
  })

  it('resets every piece of state, optionally to new default values', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: 'Ann' } }))

    act(() => {
      result.current.getPropsForField('name').onChange('Bob')
      result.current.getPropsForField('name').onBlur()
    })
    act(() => {
      result.current.controller.onSubmit()
    })
    act(() => result.current.controller.reset())
    expect(result.current.controller.values.name).toBe('Ann')
    expect(result.current.controller.touched.name).toBe(false)
    expect(result.current.controller.submitState.submitCount).toBe(0)

    act(() => result.current.controller.reset({ name: 'Cat' }))
    expect(result.current.controller.values.name).toBe('Cat')
    expect(result.current.controller.isDirty).toBe(false)
  })
})

describe('imperative API', () => {
  it('sets manual errors, clearing them when the field changes or on submit', () => {
    const { result } = renderHook(() => useForm())

    act(() => result.current.controller.setErrors({ name: 'Taken', address: { city: 'Unknown' } }))
    expect(result.current.getPropsForField('name').error).toBe('Taken')
    expect(result.current.controller.validationResult[1].address).toEqual([
      false,
      { city: [false, 'Unknown'] },
    ])

    act(() => result.current.getPropsForField('name').onChange('Other'))
    expect(result.current.getPropsForField('name').error).toBeUndefined()
    expect(result.current.controller.errors).toEqual({ address: { city: 'Unknown' } })

    act(() => result.current.controller.clearErrors('address'))
    expect(result.current.controller.errors).toEqual({})

    act(() => result.current.controller.setErrors({ name: 'Taken' }))
    act(() => {
      result.current.controller.onSubmit()
    })
    expect(result.current.controller.errors).toEqual({})
  })

  it('lets nested forms set their own errors', () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return { ...form, address: useController(form.getPropsForNestedForm('address')) }
    })

    act(() => result.current.address.setErrors({ city: 'Unknown' }))
    expect(result.current.controller.errors).toEqual({ address: { city: 'Unknown' } })
    expect(result.current.address.validationResult[1].city).toEqual([false, 'Unknown'])
  })

  it('triggers validation for a field or the whole form', async () => {
    const { result } = renderHook(() => useForm())

    let triggered: any
    act(() => {
      triggered = result.current.controller.trigger('name')
    })
    expect((await triggered)[1].name).toEqual([false, 'Required'])
    expect((await triggered)[1].address).toEqual([true, { city: [true] }])
    expect(result.current.getPropsForField('name').error).toBe('Required')

    act(() => {
      triggered = result.current.controller.trigger()
    })
    expect((await triggered)[1].address).toEqual([false, { city: [false, 'Required'] }])
  })

  it('sets field values and reads field state', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useForm({ onChange }))

    act(() => result.current.controller.setFieldValue('name', 'Ann'))
    expect(result.current.controller.values.name).toBe('Ann')
    expect(onChange.mock.calls[0][0]).toMatchObject({ fieldName: 'name', nextValue: 'Ann' })
    expect(result.current.controller.getFieldState('name')).toEqual({
      value: 'Ann',
      error: undefined,
      invalid: false,
      touched: false,
      visited: false,
      dirty: true,
    })
  })
})

describe('validation modes', () => {
  it('touches fields on change in onChange mode', () => {
    const { result } = renderHook(() => useForm({ mode: 'onChange' }))

    act(() => result.current.getPropsForField('name').onChange(''))
    expect(result.current.getPropsForField('name').error).toBe('Required')
  })

  it('only touches fields on submit in onSubmit mode', () => {
    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }))

    act(() => result.current.getPropsForField('name').onBlur())
    expect(result.current.controller.touched.name).toBe(false)

    act(() => {
      result.current.controller.onSubmit()
    })
    expect(result.current.getPropsForField('name').error).toBe('Required')
  })

  it('passes the mode down to nested forms', () => {
    const { result } = renderHook(() => {
      const form = useForm({ mode: 'onChange' })
      const address = useController(form.getPropsForNestedForm('address'))
      return useGetPropsForField(address)
    })

    act(() => result.current('city').onChange(''))
    expect(result.current('city').error).toBe('Required')
  })
})

describe('native inputs', () => {
  it('reads values from change events', () => {
    const Form = () => {
      const { controller, getPropsForField } = useForm()
      const { error: _nameError, ...name } = getPropsForField('name')
      const {
        error: _newsletterError,
        value: newsletter,
        ...newsletterProps
      } = getPropsForField('newsletter')

      return (
        <>
          <input aria-label="Name" {...name} value={name.value ?? ''} />
          <input
            aria-label="Newsletter"
            type="checkbox"
            checked={Boolean(newsletter)}
            {...newsletterProps}
          />
          <output data-testid="values">{JSON.stringify(controller.values)}</output>
        </>
      )
    }
    render(<Form />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ann' } })
    fireEvent.click(screen.getByLabelText('Newsletter'))

    expect(JSON.parse(screen.getByTestId('values').textContent!)).toMatchObject({
      name: 'Ann',
      newsletter: true,
    })
  })
})

describe('field arrays', () => {
  const listSchema = createForm([
    [
      'members',
      createList(createForm([['name', createField<string>([requiredValidator])]]), [
        createMinLengthValidator(1, 'Add a member'),
      ]),
    ],
  ])

  const useMembers = (props: any = {}) => {
    const controller = useController({ schema: listSchema, ...props })
    const getPropsForNestedForm = useGetPropsForNestedForm(controller)
    const members = useController(getPropsForNestedForm('members'))
    const fieldArray = useFieldArray(members)
    const getPropsForMember = useGetPropsForNestedForm(members)

    return { controller, members, fieldArray, getPropsForMember }
  }

  const names = (result: any) => result.current.controller.values.members.map((m: any) => m.name)
  const keys = (result: any) => result.current.fieldArray.items.map((item: any) => item.key)

  it('adds, removes and reorders items keeping stable keys', () => {
    const { result } = renderHook(() =>
      useMembers({ initialValues: { members: [{ name: 'a' }, { name: 'b' }] } }),
    )
    const [keyA, keyB] = keys(result)

    act(() => result.current.fieldArray.append({ name: 'c' }))
    act(() => result.current.fieldArray.prepend([{ name: 'z' }]))
    expect(names(result)).toEqual(['z', 'a', 'b', 'c'])
    expect(keys(result).slice(1, 3)).toEqual([keyA, keyB])

    act(() => result.current.fieldArray.move(1, 3))
    expect(names(result)).toEqual(['z', 'b', 'c', 'a'])
    expect(keys(result)[3]).toBe(keyA)

    act(() => result.current.fieldArray.swap(0, 3))
    expect(names(result)).toEqual(['a', 'b', 'c', 'z'])

    act(() => result.current.fieldArray.insert(1, { name: 'x' }))
    act(() => result.current.fieldArray.remove([0, 4]))
    expect(names(result)).toEqual(['x', 'b', 'c'])
    expect(keys(result)[1]).toBe(keyB)

    act(() => result.current.fieldArray.update(1, { name: 'B' }))
    expect(names(result)).toEqual(['x', 'B', 'c'])
    expect(keys(result)[1]).toBe(keyB)

    act(() => result.current.fieldArray.replace([{ name: 'new' }]))
    expect(names(result)).toEqual(['new'])
    expect(keys(result)).not.toContain(keyB)
  })

  it('keeps touched state aligned and new items untouched after a submission', () => {
    const { result } = renderHook(() =>
      useMembers({ initialValues: { members: [{ name: '' }, { name: 'b' }] } }),
    )

    act(() => {
      result.current.controller.onSubmit()
    })
    expect(result.current.members.validationResult[1][0]).toEqual([
      false,
      { name: [false, 'Required'] },
    ])

    act(() => result.current.fieldArray.append({ name: '' }))
    expect(result.current.members.validationResult[1][2]).toEqual([true, { name: [true] }])

    act(() => result.current.fieldArray.remove(0))
    expect(result.current.members.touched).toEqual([{ name: true }, undefined])
    expect(result.current.members.validationResult[0]).toBe(true)
  })

  it('validates the list itself and touches item fields through nested forms', () => {
    const { result } = renderHook(() => {
      const form = useMembers({ initialValues: { members: [{ name: '' }] } })
      const firstMember = useController(form.getPropsForMember(0))
      return { ...form, getPropsForFirstMember: useGetPropsForField(firstMember) }
    })

    act(() => result.current.getPropsForFirstMember('name').onBlur())
    expect(result.current.controller.touched.members).toEqual([{ name: true }])
    expect(result.current.getPropsForFirstMember('name').error).toBe('Required')

    act(() => result.current.fieldArray.remove(0))
    act(() => {
      result.current.controller.onSubmit()
    })
    expect(result.current.members.validationResult).toEqual([false, [], 'Add a member'])
  })

  it('supports lists of plain fields', () => {
    const tagsSchema = createForm([['tags', createList(createField<string>([requiredValidator]))]])
    const { result } = renderHook(() => {
      const controller = useController({ schema: tagsSchema, initialValues: { tags: ['a'] } })
      const tags = useController(useGetPropsForNestedForm(controller)('tags'))
      return {
        controller,
        fieldArray: useFieldArray(tags),
        getPropsForTag: useGetPropsForField(tags),
      }
    })

    act(() => result.current.fieldArray.append('b'))
    act(() => result.current.getPropsForTag(1).onChange(''))
    act(() => result.current.getPropsForTag(1).onBlur())

    expect(result.current.controller.values.tags).toEqual(['a', ''])
    expect(result.current.getPropsForTag(1).error).toBe('Required')
  })
})

describe('FormProvider', () => {
  it('shares the controller with descendants', () => {
    const Name = () => {
      const form = useFormContext<typeof schema>()
      return <output>{form.values.name}</output>
    }
    const Form = () => {
      const { controller } = useForm({ initialValues: { name: 'Ann' } })
      return (
        <FormProvider form={controller}>
          <Name />
        </FormProvider>
      )
    }
    render(<Form />)

    expect(screen.getByText('Ann')).toBeTruthy()
  })

  it('throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useFormContext())).toThrow(/FormProvider/)
  })
})
