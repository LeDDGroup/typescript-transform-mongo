import * as ts from "typescript";
import { transformAggregateOperationFunction } from "./operators";

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.CommonJS,
};

function applyTransformer(
  source: string,
  transformer: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile>
) {
  let content = "";
  const program = ts.createProgram(["index.ts"], compilerOptions, {
    ...ts.createCompilerHost(compilerOptions),
    getSourceFile(file: string): ts.SourceFile {
      return ts.createSourceFile(file, source, compilerOptions.target);
    },
  });
  program.emit(
    undefined,
    (_, result) => (content = result),
    undefined,
    undefined,
    { after: [transformer(program)] }
  );
  return content;
}

function compile(source: string): string {
  return applyTransformer(source, (program) => (context) => (node) => {
    const firstStatement = node.statements[0];
    if (!ts.isFunctionDeclaration(firstStatement)) {
      throw new Error("Expected function");
    }
    return ts.updateSourceFileNode(node, [
      ts.createStatement(
        transformAggregateOperationFunction(
          firstStatement,
          context,
          program.getTypeChecker()
        )
      ),
    ]);
    // return ts.updateSourceFileNode(node, [
    //   ts.createStatement(
    //     transformOperators(firstStatement.expression, context)
    //   ),
    // ]);
  });
  // return content;
}

function wrapOneline(source: string) {
  return `\
function (this: { na: number; nb: number; ba: boolean; bb: boolean, arr: number[], arr2: number[] }) {
  return ${source};
}
`;
}

function expectFail(source: string) {
  expect(() => compile(wrapOneline(source))).toThrow();
}

function check(source: string, expected: string) {
  const actual = compile(wrapOneline(source));
  expect(actual).toBe(expected);
}

test("property access", () => {
  check(
    `\
this.foo
`,
    `\
"$foo";
`
  );
});

test("no types should fail some operations", () => {
  expectFail("this.doesntExist + this.b");
});

test("parenthesized expression", () => {
  check(
    `\
(this.na + this.nb)
`,
    `\
({ $add: ["$na", "$nb"] });
`
  );
});

describe("arithmetic expression operators", () => {
  // https://docs.mongodb.com/manual/reference/operator/aggregation/#arithmetic-expression-operators
  test("$add", () => {
    check(
      `\
this.na + this.nb
`,
      `\
({ $add: ["$na", "$nb"] });
`
    );
  });

  test("$subtract", () => {
    check(
      `\
this.na - this.nb
`,
      `\
({ $subtract: ["$na", "$nb"] });
`
    );
  });

  test("$multiply", () => {
    check(
      `\
this.na * this.nb
`,
      `\
({ $multiply: ["$na", "$nb"] });
`
    );
  });

  test("$divide", () => {
    check(
      `\
this.na / this.nb
`,
      `\
({ $divide: ["$na", "$nb"] });
`
    );
  });

  test.todo("$abs");
  test.todo("$ceil");
  test.todo("$floor");
  test.todo("$pow");
  test.todo("$exp");
  test.todo("$ln");
  test.todo("$log");
  test.todo("$log10");
  test.todo("$mod");
  test.todo("$round");
  test.todo("$sqrt");
  test.todo("$trunc");
});

describe("boolean expression operators", () => {
  // https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators

  test("$and", () => {
    check(
      `\
this.ba && this.bb
`,
      `\
({ $and: ["$ba", "$bb"] });
`
    );
  });

  test("$not", () => {
    check(
      `\
!this.ba
`,
      `\
({ $not: ["$ba"] });
`
    );
  });

  test("$or", () => {
    check(
      `\
this.ba || this.bb
`,
      `\
({ $or: ["$ba", "$bb"] });
`
    );
  });
});

describe("comparison expression operators", () => {
  // https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators

  test("$eq", () => {
    check(
      `\
this.a === this.b
`,
      `\
({ $eq: ["$a", "$b"] });
`
    );
  });

  test("$ne", () => {
    check(
      `\
this.a !== this.b
`,
      `\
({ $ne: ["$a", "$b"] });
`
    );
  });

  test("$gt", () => {
    check(
      `\
this.na > this.nb
`,
      `\
({ $gt: ["$na", "$nb"] });
`
    );
  });
  test("$gte", () => {
    check(
      `\
this.na >= this.nb
`,
      `\
({ $gte: ["$na", "$nb"] });
`
    );
  });
  test("$lt", () => {
    check(
      `\
this.na < this.nb
`,
      `\
({ $lt: ["$na", "$nb"] });
`
    );
  });
  test("$lte", () => {
    check(
      `\
this.na <= this.nb
`,
      `\
({ $lte: ["$na", "$nb"] });
`
    );
  });
  test.todo("$cmp");
});

// https://docs.mongodb.com/manual/reference/operator/aggregation/#date-expression-operators
test.todo("date expression operators");

describe("conditional expression operators", () => {
  // https://docs.mongodb.com/manual/reference/operator/aggregation/#conditional-expression-operators

  test("$cond", () => {
    check(
      `\
this.a ? this.b : this.c
`,
      `\
({ $cond: { if: "$a", then: "$b", else: "$c" } });
`
    );
  });

  test.todo("$ifNull");
  test.todo("$switch");
});

describe("array expression operators", () => {
  // https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators

  test("$arrayElemAt", () => {
    check(
      `\
this.arr[2]
`,
      `\
({ $arrayElemAt: ["$arr", { $literal: 2 }] });
`
    );
  });

  test("$arrayElemAt - 1", () => {
    check(
      `\
this.arr[this.arr.length -1]
`,
      `\
({ $arrayElemAt: ["$arr", -1] });
`
    );
  });

  // TODO also check for spread operator
  test("$concatArrays", () => {
    check(
      `\
this.arr.concat(this.arr2)
`,
      `\
({ $concatArrays: ["$arr", "$arr2"] });
`
    );
  });

  test("$filter", () => {
    check(
      `\
this.arr.filter((va) => va !== 0)
`,
      `\
({ $filter: { input: "$arr", as: "va", cond: { $eq: ["$$va", { $literal: 0 }] } } });
`
    );
  });

  test("$map", () => {
    check(
      `\
this.arr.map((va) => va + 1)
`,
      `\
({ $map: { input: "$arr", as: "va", in: { $add: ["$$va", { $literal: 1 }] } } });
`
    );
  });

  test("$map", () => {
    check(
      `\
this.arr.map((va) => va + 1)
`,
      `\
({ $map: { input: "$arr", as: "va", in: { $add: ["$$va", { $literal: 1 }] } } });
`
    );
  });

  test("$in", () => {
    check(
      `\
this.arr.includes(3)
`,
      `\
({ $in: [{ $literal: 3 }, "$arr"] });
`
    );
  });

  test("$indexOfArray", () => {
    check(
      `\
this.arr.indexOf(3)
`,
      `\
({ $indexOfArray: ["$arr", { $literal: 3 }] });
`
    );
  });

  test("$isArray", () => {
    check(
      `\
Array.isArray(this.arr)
`,
      `\
({ $isArray: ["$arr"] });
`
    );
  });

  test("$reverseArray", () => {
    check(
      `\
this.arr.reverse()
`,
      `\
({ $reverseArray: "$arr" });
`
    );
  });

  test("$size", () => {
    check(
      `\
this.arr.length
`,
      `\
({ $size: "$arr" });
`
    );
  });

  test.todo("$arrayToObject");
  test.todo("$slice");
  test.todo("$zip");
});

// https://docs.mongodb.com/manual/reference/operator/aggregation/#literal-expression-operator
describe("$literal", () => {
  test("number", () => {
    check(
      `\
3
`,
      `\
({ $literal: 3 });
`
    );
  });
  test("string", () => {
    check(
      `\
"foo"
`,
      `\
({ $literal: "foo" });
`
    );
  });
});

// https://docs.mongodb.com/manual/reference/operator/aggregation/#object-expression-operators
describe("object expression operators", () => {
  test.todo("$mergeObjects");
  test.todo("$objectToArray");
});

// https://docs.mongodb.com/manual/reference/operator/aggregation/#set-expression-operators
test.todo("set expression operators");

// https://docs.mongodb.com/manual/reference/operator/aggregation/#string-expression-operators
test.todo("string expression operators");

// https://docs.mongodb.com/manual/reference/operator/aggregation/#text-expression-operator
test.todo("text expression operators");

// https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
test.todo("trigonometry expression operators");

// https://docs.mongodb.com/manual/reference/operator/aggregation/#type-expression-operators
test.todo("type expression operators");

// https://docs.mongodb.com/manual/reference/operator/aggregation/#accumulators-group
test.todo("accumulators group");

// https://docs.mongodb.com/manual/reference/operator/aggregation/#variable-expression-operators
test.todo("variable expression operators");
