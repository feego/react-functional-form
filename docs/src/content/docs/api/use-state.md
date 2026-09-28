---
title: useState
description: Create form state hooks ahead of the controller.
---

```ts
import { useState as useFormState } from 'react-functional-form'

const formState = useFormState({ schema, initialValues, validateOnInit })
const form = useController({ ...formState, schema })
```

Returns `{ valuesStateHook, touchedStateHook, visitedStateHook, initialValues, validateOnInit }`, ready to
spread into `useController`. Any hook you pass in is returned as is.

Use it when you need the values before creating the controller, e.g. to build the schema from them. See
[controlled & lifted state](/react-functional-form/guides/lifted-state/).
