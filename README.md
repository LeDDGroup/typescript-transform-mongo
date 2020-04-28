# typescript-transform-mongo

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Transform typescript (or javascript) snippets to mongodb aggregation pipeline objects https://docs.mongodb.com/manual/aggregation/

## Install

```sh
npm i -D typescript-transform-mongo # Soon!
```

## Usage with [ttypescript](https://github.com/cevek/ttypescript/)

Add it to _plugins_ in your _tsconfig.json_

```json
{
  "compilerOptions": {
    "plugins": [{ "transform": "typescript-transform-mongo" }]
  }
}
```

## Example

```tsx
import { Aggregate } from "typescript-transform-mongo";

const pipeline = aggregate(function (this: Aggregate<{ foo: string }>) {
  return this.$addFields({ bar: this.foo + "asdf" });
});

const pipelineAlt = [
  {
    $addFields: {
      x: aggregateOp(function (this: { y: number }) {
        return this.y + 3;
      }),
    },
  },
];
```

Gets compiled to:

```js
const pipeline = [
  { $addFields: { bar: { $add: ["$foo", { $literal: "asdf" }] } } },
];

const pipelineAlt = [
  {
    $addFields: {
      x: { $add: ["$y", { $literal: 3 }] },
    },
  },
];
```

### Compiling example folder

dir: https://github.com/LeDDGroup/typescript-transform-mongo/tree/master/examples

make sure to build the project first:

```sh
npm run build
cd examples
npx ttsc
```

## Contributing

Checkout the test files under src/ for failing and pending tests. PRs and issues are welcome.

We are using `jest` for tests, so:

```sh
npm test            # or npx jest
npm test -- --watch # or npx jest --watch
```
