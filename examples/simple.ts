import { Aggregate } from "../";

const pipeline = aggregate(function (this: Aggregate<{ foo: string }>) {
  return this.$addFields({ bar: this.foo + "asdf" });
});
