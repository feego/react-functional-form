---
title: Installation
description: Install react-functional-form.
---

```sh
npm install react-functional-form
# or
pnpm add react-functional-form
# or
yarn add react-functional-form
```

Requirements:

- React 16.8 or newer (hooks). Tested with React 18 and 19.
- TypeScript is optional. When you use it, 5.4 or newer is required for the type definitions.

The package ships ESM and CommonJS builds with type declarations and has no runtime dependencies.

## Optional: a schema library

To validate with [Zod](https://zod.dev), [Valibot](https://valibot.dev), [ArkType](https://arktype.io)
or any other [Standard Schema](https://standardschema.dev) library, install it separately. The adapter
is built in:

```sh
npm install zod
```
