import * as ts from "typescript";

export function transformOperators(
  node: ts.Expression,
  context: ts.TransformationContext
): ts.Expression {
  function visitor<T extends ts.Node>(node: T): ts.Node {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === "this"
    ) {
      return ts.createLiteral("$" + node.name.getText());
    }
    throw new Error("operation not available or invalid");
  }
  return ts.visitNode(node, visitor);
}
