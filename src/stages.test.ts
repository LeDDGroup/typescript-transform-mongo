import * as ts from "typescript";
import { transformStage } from "./stages";

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.CommonJS,
};

function compileStage(stage: string, source: string) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions,
    transformers: {
      after: [
        (context) => (node) => {
          const firstStatement = node.statements[0];
          if (!ts.isExpressionStatement(firstStatement)) {
            throw new Error("Expected expression");
          }
          if (ts.isParenthesizedExpression(firstStatement.expression)) {
            return ts.updateSourceFileNode(node, [
              ts.createStatement(
                transformStage(
                  stage,
                  ts.createNodeArray([firstStatement.expression.expression]),
                  context
                )
              ),
            ]);
          }
          return ts.updateSourceFileNode(node, [
            ts.createStatement(
              transformStage(
                stage,
                ts.createNodeArray([firstStatement.expression]),
                context
              )
            ),
          ]);
        },
      ],
    },
  });
  return outputText;
}

function check(stage: string, source: string, expected: string) {
  const actual = compileStage(stage, source);
  expect(actual).toBe(expected);
}

test("property access", () => {
  check(
    "$addFields",
    `\
({ foo: this.bar });
`,
    `\
({ $addFields: { foo: "$bar" } });
`
  );
});
