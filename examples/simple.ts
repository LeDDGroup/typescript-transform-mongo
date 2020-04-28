import { Aggregate } from "../";

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
