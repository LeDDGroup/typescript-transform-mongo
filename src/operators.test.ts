import * as ts from "typescript";
import { transformOperators } from "./operators";

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.CommonJS,
};

function compile(source: string) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions,
    transformers: {
      after: [
        (context) => (node) => {
          const firstStatement = node.statements[0];
          if (!ts.isExpressionStatement(firstStatement)) {
            throw new Error("Expected expression");
          }
          return ts.updateSourceFileNode(node, [
            ts.createStatement(
              transformOperators(firstStatement.expression, context)
            ),
          ]);
        },
      ],
    },
  });
  return outputText;
}

function check(source: string, expected: string) {
  const actual = compile(source);
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

// https://docs.mongodb.com/manual/reference/operator/aggregation/#arithmetic-expression-operators

test("$add", () => {
  check(
    `\
this.a + this.b
`,
    `\
({ $add: ["$a", "$b"] });
`
  );
});

test("$subtract", () => {
  check(
    `\
this.a - this.b
`,
    `\
({ $subtract: ["$a", "$b"] });
`
  );
});

test("$multiply", () => {
  check(
    `\
this.a * this.b
`,
    `\
({ $multiply: ["$a", "$b"] });
`
  );
});

test("$divide", () => {
  check(
    `\
this.a / this.b
`,
    `\
({ $divide: ["$a", "$b"] });
`
  );
});

// abs
// { $ceil: <number> }
// { $floor: <number> }
// { $pow: [ <number>, <exponent> ] }

// https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators

test("$and", () => {
  check(
    `\
this.a && this.b
`,
    `\
({ $and: ["$a", "$b"] });
`
  );
});

test("$not", () => {
  check(
    `\
!this.a
`,
    `\
({ $not: ["$a"] });
`
  );
});

test("$or", () => {
  check(
    `\
this.a || this.b
`,
    `\
({ $or: ["$a", "$b"] });
`
  );
});

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

// { $gt: [ <expression1>, <expression2> ] }
// { $gte: [ <expression1>, <expression2> ] }

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
// { $ifNull: [ <expression>, <replacement-expression-if-null> ] }
// switch
