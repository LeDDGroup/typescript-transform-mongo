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

// https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/
test("$addFields", () => {
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

test.todo("$bucket");
test.todo("$bucketAuto");
test.todo("$collStats");
test.todo("$count");
test.todo("$facet");
test.todo("$geoNear");
test.todo("$graphLookup");
test.todo("$group");
test.todo("$indexStats");
test.todo("$limit");
test.todo("$listSessions");
test.todo("$lookup");
test.todo("$match");
test.todo("$merge");
test.todo("$out");
test.todo("$planCacheStats");
test.todo("$project");
test.todo("$redact");
test.todo("$replaceRoot");
test.todo("$replaceWith");
test.todo("$sample");
test.todo("$set");
test.todo("$skip");
test.todo("$sort");
test.todo("$sortByCount");
test.todo("$unset");
test.todo("$unwind");

// https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/#db-aggregate-stages

test.todo("$currentOp");
test.todo("$listLocalSessions");

// https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/#stages-available-for-updates

test.todo("$findAndModify");
test.todo("$update");
