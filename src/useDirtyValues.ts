import { useCallback, useState } from 'react'
import type { EventMetadata } from './types'

const recursivelyPopulateDirtyFields = (dirty = {} as any, eventMetadata: EventMetadata): any => {
  const { fieldName, nestedFormEvent } = eventMetadata
  const nextDirtyValue =
    nestedFormEvent !== undefined
      ? recursivelyPopulateDirtyFields(dirty[fieldName as any], nestedFormEvent)
      : true

  return {
    ...dirty,
    [fieldName as any]: nextDirtyValue,
  }
}

/**
 * Tracks which fields were changed by the user, from change events (as opposed to the controller `dirty`
 * state, which compares values with the default values).
 *
 * @returns `[[dirty, setDirty], onChange]`: pass `onChange` to `useController`.
 */
const useDirtyValues = (
  baseOnChange: (eventMetadata: EventMetadata, ...args: any[]) => void = () => {},
) => {
  const dirtyStateHook = useState<any>({})
  const [, setDirty] = dirtyStateHook
  const onChange = useCallback(
    (eventMetadata: EventMetadata, ...args: any[]) => {
      setDirty((dirty: any) => recursivelyPopulateDirtyFields(dirty, eventMetadata))
      baseOnChange(eventMetadata, ...args)
    },
    [baseOnChange, setDirty],
  )

  return [dirtyStateHook, onChange] as const
}

export default useDirtyValues
