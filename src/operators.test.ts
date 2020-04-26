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
