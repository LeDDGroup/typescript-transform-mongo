import * as ts from "typescript";
import { transformAggregateOperationFunction } from "./operators";

function locateAggregateFunction<L extends ts.Node>(
  node: L,
  context: ts.TransformationContext,
  typeChecker: ts.TypeChecker
): L {
  function visitor<T extends ts.Node>(node: T): ts.Node {
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
      return transformAggregateOperationFunction(
        firstArgument,
        context,
        typeChecker
      );
    }
    return ts.visitEachChild(node, visitor, context);
  }
  return ts.visitNode(node, visitor);
}

function transformer<T extends ts.Node>(program: ts.Program) {
  const typeChecker = program.getTypeChecker();
  return (context: ts.TransformationContext) => (node: T) =>
    locateAggregateFunction(node, context, typeChecker);
}

export default transformer;
