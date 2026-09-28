---
title: Validators
description: Built-in validators and validator helpers.
---

See the [validation guide](/react-functional-form/guides/validation/) for how validators chain.

| Export                                                            | Description                                                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `requiredValidator`                                               | Fails for falsy values with `Errors.Required`.                                                                                |
| `createMinLengthValidator(min, error = Errors.TooShort)`          | String/array length. Skips empty values.                                                                                      |
| `createMaxLengthValidator(max, error = Errors.TooLong)`           | String/array length. Skips empty values.                                                                                      |
| `createMinValidator(min, error = Errors.TooSmall)`                | Number or numeric string. Skips empty values.                                                                                 |
| `createMaxValidator(max, error = Errors.TooBig)`                  | Number or numeric string. Skips empty values.                                                                                 |
| `createMatchesFieldValidator(fieldName, error = Errors.Mismatch)` | Equal to a sibling field.                                                                                                     |
| `createRegexValidator(regex, error = Errors.FailedRegex)`         | Matches a regex.                                                                                                              |
| `createTypeValidator('number')`                                   | Value parses as a number.                                                                                                     |
| `createStandardSchemaValidator(schema, mapIssues?)`               | Validator from a Standard Schema.                                                                                             |
| `createStandardSchemaValidate(schema, { mapIssues?, validate? })` | Form-level `validate` function from a Standard Schema.                                                                        |
| `createValidator(fn)`                                             | Validator from `(value, metadata) => error \| undefined`, sync or async.                                                      |
| `optional(validator)`                                             | Skips `undefined`, `null` and `''`.                                                                                           |
| `identityValidator(result)`                                       | Returns the previous result.                                                                                                  |
| `isEmptyValue(value)`                                             | `undefined`, `null` or `''`.                                                                                                  |
| `Errors`                                                          | Error codes: `Required`, `InvalidType`, `FailedRegex`, `Unexpected`, `TooShort`, `TooLong`, `TooSmall`, `TooBig`, `Mismatch`. |
