import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://feego.github.io',
  base: '/react-functional-form',
  integrations: [
    react(),
    starlight({
      title: 'react-functional-form',
      description:
        'Schema-first, fully controlled, composable forms for React, with nested forms, field arrays, async validation and Standard Schema support.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/feego/react-functional-form' },
      ],
      editLink: { baseUrl: 'https://github.com/feego/react-functional-form/edit/main/docs/' },
      customCss: ['examples/src/components/ui.css', './src/styles/demo.css'],
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick start', slug: 'getting-started/quick-start' },
            { label: 'Examples', slug: 'examples' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Schemas', slug: 'guides/schemas' },
            { label: 'Validation', slug: 'guides/validation' },
            { label: 'Zod, Valibot & Standard Schema', slug: 'guides/standard-schema' },
            { label: 'Async validation', slug: 'guides/async-validation' },
            { label: 'Nested forms', slug: 'guides/nested-forms' },
            { label: 'Field arrays', slug: 'guides/field-arrays' },
            { label: 'Submission', slug: 'guides/submission' },
            { label: 'Errors from the server', slug: 'guides/server-errors' },
            { label: 'Dirty state & reset', slug: 'guides/dirty-state' },
            { label: 'Validation modes', slug: 'guides/validation-modes' },
            { label: 'Native inputs & focus', slug: 'guides/native-inputs' },
            { label: 'Controlled & lifted state', slug: 'guides/lifted-state' },
            { label: 'TypeScript', slug: 'guides/typescript' },
          ],
        },
        {
          label: 'API reference',
          items: [
            { label: 'Schema', slug: 'api/schema' },
            { label: 'useController', slug: 'api/use-controller' },
            { label: 'useGetPropsForField', slug: 'api/use-get-props-for-field' },
            { label: 'useGetPropsForNestedForm', slug: 'api/use-get-props-for-nested-form' },
            { label: 'useFieldArray', slug: 'api/use-field-array' },
            { label: 'useState', slug: 'api/use-state' },
            { label: 'FormProvider', slug: 'api/form-provider' },
            { label: 'Validators', slug: 'api/validators' },
            { label: 'Utilities', slug: 'api/utilities' },
          ],
        },
      ],
    }),
  ],
})
