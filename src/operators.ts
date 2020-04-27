import * as ts from "typescript";

export function transformOperators(
  node: ts.Expression,
  context: ts.TransformationContext
): ts.Expression {
  function visitor<T extends ts.Expression>(node: T): ts.Expression {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === "this"
    ) {
      return ts.createLiteral("$" + node.name.getText());
    }
    if (ts.isBinaryExpression(node)) {
      // add
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$add",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // subtract
      if (node.operatorToken.kind === ts.SyntaxKind.MinusToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$subtract",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // multiply
      if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$multiply",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // divide
      if (node.operatorToken.kind === ts.SyntaxKind.SlashToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$divide",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // and
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$and",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // or
      if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$or",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // eq
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$eq",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
      // nq
      if (
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
      ) {
        return ts.createObjectLiteral([
          ts.createPropertyAssignment(
            "$ne",
            ts.createArrayLiteral([visitor(node.left), visitor(node.right)])
          ),
        ]);
      }
    }
    // not
    if (
      ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.ExclamationToken
    ) {
      return ts.createObjectLiteral([
        ts.createPropertyAssignment(
          "$not",
          ts.createArrayLiteral([visitor(node.operand)])
        ),
      ]);
    }
    // cond
    if (ts.isConditionalExpression(node)) {
      return ts.createObjectLiteral([
        ts.createPropertyAssignment(
          "$cond",
          ts.createObjectLiteral([
            ts.createPropertyAssignment("if", visitor(node.condition)),
            ts.createPropertyAssignment("then", visitor(node.whenTrue)),
            ts.createPropertyAssignment("else", visitor(node.whenFalse)),
          ])
        ),
      ]);
    }
    // literal
    if (ts.isLiteralExpression(node)) {
      return ts.createObjectLiteral([
        ts.createPropertyAssignment("$literal", node),
      ]);
    }
    throw new Error(
      `operation '${ts.SyntaxKind[node.kind]}' not available or invalid`
    );
  }
  return ts.visitNode(node, visitor as any);
}
