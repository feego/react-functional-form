# Contributing

Thanks for helping out!

## Setup

```sh
pnpm install
pnpm test        # tests + type tests
pnpm lint
pnpm typecheck
pnpm build
pnpm examples:dev # examples app at http://localhost:5173
pnpm docs:dev    # docs site with live demos at http://localhost:4321/react-functional-form
```

## Guidelines

- The library is controlled and schema-first. New features should fit the existing building blocks
  (schema nodes, validators, `useController`, props getters, state hooks) rather than add parallel APIs.
- Keep existing behavior working. `test/compat.test.tsx` pins down the original API.
- Add tests for behavior (`test/*.test.tsx`) and for types (`test/*.test-d.ts`).
- Update the docs in `docs/src/content/docs` when you change the public API. Live demos in the docs
  render the examples in `examples/src/examples`, so update or add an example for new features.
- Run `pnpm changeset` to describe user-facing changes.
