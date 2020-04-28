import * as ts from "typescript";
// import { transformStage } from "./stages";
import { transformOperators } from "./operators";

// function getStages(
//   node: ts.CallExpression,
//   context: ts.TransformationContext
// ): { identifier: ts.Identifier; args: ts.NodeArray<ts.Expression> }[] {
//   if (ts.isIdentifier(node.expression)) {
//     throw new Error(
//       "how did we get here?, can't call 'this' or other functions I guess"
//     );
//   }
//   if (!ts.isPropertyAccessExpression(node.expression)) {
//     throw new Error("should be a property access expression");
//   }
//   if (!ts.isIdentifier(node.expression.name)) {
//     throw new Error("for some reason not a identifier"); // TODO improve all this messages with the source code
//   }
//   if (ts.isCallExpression(node.expression.expression)) {
//     return [
//       ...getStages(node.expression.expression, context),
//       { identifier: node.expression.name, args: node.arguments },
//     ];
//   }
//   if (node.expression.expression.getText() !== "this") {
//     // TODO improve condition later
//     throw new Error("why not, not this");
//   }
//   return [{ identifier: node.expression.name, args: node.arguments }];
// }

// function transformAggregateFunction(
//   node: ts.FunctionExpression,
//   context: ts.TransformationContext
// ): ts.ArrayLiteralExpression {
//   const firstStatement = node.body.statements[0];
//   if (
//     !(
//       ts.isReturnStatement(firstStatement) &&
//       firstStatement.expression !== undefined
//     )
//   ) {
//     throw new Error(
//       "first and only statement of aggregate function should be return statement"
//     );
//   }
//   if (
//     !(
//       firstStatement.expression &&
//       ts.isCallExpression(firstStatement.expression)
//     )
//   ) {
//     throw new Error("expected call expression");
//   }
//   const stages = getStages(firstStatement.expression, context);
//   return ts.createArrayLiteral(
//     stages.map(({ identifier, args }) =>
//       transformStage(identifier.getText(), args, context)
//     )
//   );
// }

function transformAggregateOperationFunction(
  node: ts.FunctionExpression,
  context: ts.TransformationContext
): ts.Expression {
  const firstStatement = node.body.statements[0];
  if (
    !(
      ts.isReturnStatement(firstStatement) &&
      firstStatement.expression !== undefined
    )
  ) {
    throw new Error(
      "first and only statement of aggregate function should be return statement"
    );
  }
  return transformOperators(firstStatement.expression, context);
}

function locateAggregateFunction<L extends ts.Node>(
  node: L,
  context: ts.TransformationContext
): L {
  function visitor<T extends ts.Node>(node: T): ts.Node {
    // if (
    //   ts.isCallExpression(node) &&
    //   ts.isIdentifier(node.expression) &&
    //   node.expression.getText() === "aggregate"
    // ) {
    //   const firstArgument = node.arguments[0];
    //   if (!ts.isFunctionExpression(firstArgument)) {
    //     throw new Error(
    //       "called aggregate function but not passed function declaration"
    //     ); // TODO improve messages and hints
    //   }
    //   return transformAggregateFunction(firstArgument, context);
    // }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.getText() === "aggregateOp"
    ) {
      const firstArgument = node.arguments[0];
      if (!ts.isFunctionExpression(firstArgument)) {
        throw new Error(
          "called aggregateOp function but not passed function declaration"
        ); // TODO improve messages and hints
      }
      return transformAggregateOperationFunction(firstArgument, context);
    }
    return ts.visitEachChild(node, visitor, context);
  }
  return ts.visitNode(node, visitor);
}

function transformer<T extends ts.Node>(_program: ts.Program) {
  return (context: ts.TransformationContext) => (node: T) =>
    locateAggregateFunction(node, context);
}

export default transformer;

export * from "./types";
