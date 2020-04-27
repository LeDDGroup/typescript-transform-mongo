type AggregateResult = object;
type Aggregate<T> = T & {
  $addFields(props: any): Aggregate<T>;
};
declare global {
  function aggregate(func: () => any): AggregateResult;
}

export type { Aggregate };
