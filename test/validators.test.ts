import { type } from 'arktype'
import * as v from 'valibot'
import { z } from 'zod'
import {
  createField,
  createForm,
  createList,
  createMatchesFieldValidator,
  createMaxLengthValidator,
  createMaxValidator,
  createMinLengthValidator,
  createMinValidator,
  createRegexValidator,
  createStandardSchemaValidate,
  createStandardSchemaValidator,
  createValidator,
  Errors,
  getAllFieldsTouched,
  optional,
  requiredValidator,
  validate,
  validateField,
} from '../src'

const run = (validators: any[], value: unknown, values: any = {}) =>
  validateField(createField(validators), value, { fieldName: 'field', fields: [], values })

describe('built-in validators', () => {
  it('checks lengths of strings and arrays, skipping empty values', () => {
    expect(run([createMinLengthValidator(3)], 'ab')).toEqual([false, Errors.TooShort])
    expect(run([createMinLengthValidator(3)], 'abc')).toEqual([true])
    expect(run([createMinLengthValidator(3)], '')).toEqual([true])
    expect(run([createMaxLengthValidator(2, 'Max 2')], ['a', 'b', 'c'])).toEqual([false, 'Max 2'])
    expect(run([createMaxLengthValidator(2)], 'ab')).toEqual([true])
  })

  it('checks number bounds, including numeric strings', () => {
    expect(run([createMinValidator(18)], 17)).toEqual([false, Errors.TooSmall])
    expect(run([createMinValidator(18)], '18')).toEqual([true])
    expect(run([createMaxValidator(10)], '11')).toEqual([false, Errors.TooBig])
    expect(run([createMaxValidator(10)], undefined)).toEqual([true])
  })

  it('compares with sibling fields', () => {
    const matches = createMatchesFieldValidator('password')
    expect(run([matches], 'a', { password: 'b' })).toEqual([false, Errors.Mismatch])
    expect(run([matches], 'a', { password: 'a' })).toEqual([true])
  })

  it('makes validators optional', () => {
    const digits = createRegexValidator(/^\d+$/)
    expect(run([digits], '')).toEqual([false, Errors.FailedRegex])
    expect(run([optional(digits)], '')).toEqual([true])
    expect(run([optional(digits)], 'x')).toEqual([false, Errors.FailedRegex])
  })

  it('creates validators from functions returning errors', () => {
    const even = createValidator((value: number) => (value % 2 ? 'Odd' : undefined))
    expect(run([even], 3)).toEqual([false, 'Odd'])
    expect(run([even], 2)).toEqual([true])
    // Keeps previous errors when valid, like every validator in the chain.
    expect(run([requiredValidator, even], 0)).toEqual([false, Errors.Required])
  })
})

describe('async validators', () => {
  it('chains async validators and returns a promise', async () => {
    const available = createValidator(async (value: string) =>
      value === 'taken' ? 'Taken' : undefined,
    )
    const result = run([requiredValidator, available], 'taken')

    expect(result).toBeInstanceOf(Promise)
    expect(await result).toEqual([false, 'Taken'])
    expect(await run([available, requiredValidator], '')).toEqual([false, Errors.Required])
  })

  it('makes validate async only when needed', async () => {
    const schema = createForm([
      ['sync', createField([requiredValidator])],
      ['async', createField([createValidator(async () => 'Nope')])],
    ])

    expect(validate(schema, {}, { sync: true })).toEqual([
      false,
      { sync: [false, 'Required'], async: [true] },
    ])
    await expect(validate(schema, {}, { async: true })).resolves.toEqual([
      false,
      { sync: [true], async: [false, 'Nope'] },
    ])
  })
})

describe('lists', () => {
  const schema = createForm([
    [
      'tags',
      createList(createField([requiredValidator]), [
        createMinLengthValidator(1, 'At least one tag'),
      ]),
    ],
  ])

  it('validates each item and the list itself', () => {
    expect(validate(schema, { tags: ['a', ''] }, getAllFieldsTouched(schema))).toEqual([
      false,
      { tags: [false, [[true], [false, Errors.Required]]] },
    ])
    expect(validate(schema, { tags: [] }, getAllFieldsTouched(schema))).toEqual([
      false,
      { tags: [false, [], 'At least one tag'] },
    ])
  })

  it('only validates touched items, and the list once an item is touched', () => {
    expect(validate(schema, { tags: ['', ''] }, { tags: [false, true] })).toEqual([
      false,
      { tags: [false, [[true], [false, Errors.Required]]] },
    ])
    expect(validate(schema, { tags: [] }, { tags: [] })).toEqual([true, { tags: [true, []] }])
  })
})

describe('Standard Schema', () => {
  it.each([
    ['zod', z.string().email('Invalid email')],
    ['valibot', v.pipe(v.string(), v.email('Invalid email'))],
    ['arktype', type('string.email').configure({ message: 'Invalid email' })],
  ])('validates fields with %s', (_name, schema) => {
    const field = createField(schema)

    expect(validateField(field, 'nope', {})).toEqual([false, 'Invalid email'])
    expect(validateField(field, 'a@b.co', {})).toEqual([true])
  })

  it('supports async schemas and custom issue mapping', async () => {
    const schema = z.string().refine(async (value) => value !== 'taken', 'Taken')
    const validator = createStandardSchemaValidator(schema, (issues) => ({
      code: issues[0]!.message,
    }))

    await expect(run([validator], 'taken')).resolves.toEqual([false, { code: 'Taken' }])
  })

  describe('form-level validation', () => {
    const formSchema = createForm([
      ['password', createField([requiredValidator])],
      ['confirm', createField()],
      ['address', createForm([['zip', createField()]])],
      ['tags', createList(createField())],
    ])
    const valuesSchema = z
      .object({
        password: z.string().min(8, 'Too short'),
        confirm: z.string(),
        address: z.object({ zip: z.string().regex(/^\d{4}$/, 'Bad zip') }),
        tags: z.array(z.string().min(1, 'Empty tag')).min(1, 'Add a tag'),
      })
      .refine((values) => values.password === values.confirm, {
        path: ['confirm'],
        message: 'Passwords must match',
      })
    const validateWithSchema = createStandardSchemaValidate(valuesSchema) as (...args: any[]) => any
    const values = { password: 'short', confirm: 'other', address: { zip: 'x' }, tags: [''] }

    it('maps issues to fields by path, including nested forms and lists', () => {
      expect(validateWithSchema(formSchema, values, getAllFieldsTouched(formSchema))).toEqual([
        false,
        {
          password: [false, 'Too short'],
          confirm: [false, 'Passwords must match'],
          address: [false, { zip: [false, 'Bad zip'] }],
          tags: [false, [[false, 'Empty tag']]],
        },
      ])
    })

    it('puts issues without a field on the closest form or list', () => {
      expect(
        validateWithSchema(formSchema, { ...values, tags: [] }, getAllFieldsTouched(formSchema))[1]
          .tags,
      ).toEqual([false, [], 'Add a tag'])
    })

    it('only reports issues for touched fields', () => {
      expect(validateWithSchema(formSchema, values, { password: true })).toEqual([
        false,
        {
          password: [false, 'Too short'],
          confirm: [true],
          address: [true, { zip: [true] }],
          tags: [true, [[true]]],
        },
      ])
      expect(validateWithSchema(formSchema, values, {})[0]).toBe(true)
    })

    it('keeps running field validators', () => {
      const lenient = createStandardSchemaValidate(z.object({})) as (...args: any[]) => any
      expect(lenient(formSchema, { password: '' }, { password: true })[1].password).toEqual([
        false,
        Errors.Required,
      ])
    })
  })
})
