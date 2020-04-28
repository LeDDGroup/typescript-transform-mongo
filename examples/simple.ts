declare function aggregateOp(fn: any): object;

const pipeline = [
  {
    $addFields: {
      x: aggregateOp(function (this: { y: number }) {
        return (this.y + 3) / 2;
      }),
    },
  },
];
