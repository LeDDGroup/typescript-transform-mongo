import * as ts from "typescript";

export function transformOperators(
  node: ts.Expression,
  context: ts.TransformationContext,
  typeChecker: ts.TypeChecker
): ts.Expression {
  const isNumber = (node: ts.Node) =>
    typeChecker.getTypeAtLocation(node).flags & ts.TypeFlags.Number;
  const isBoolean = (node: ts.Node) =>
    typeChecker.getTypeAtLocation(node).flags & ts.TypeFlags.Boolean;
  function visitor<T extends ts.Expression>(node: T): ts.Expression {
    if (ts.isParenthesizedExpression(node)) {
      return visitor(node.expression);
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === "this"
    ) {
      return ts.createLiteral("$" + node.name.getText());
    }
    if (ts.isBinaryExpression(node)) {
      // TODO check for all types and improve errors messages if doesn't match any type
      if (isNumber(node.left) && isNumber(node.right)) {
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
      }
      if (isBoolean(node.left) && isBoolean(node.right)) {
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
      node.operator === ts.SyntaxKind.ExclamationToken &&
      typeChecker.getTypeAtLocation(node.operand).flags & ts.TypeFlags.Boolean
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
    console.error(`\
---- Code

${node.getText()}

----\
`);
    throw new Error(
      `operation '${ts.SyntaxKind[node.kind]}' not available or invalid`
    );
  }
  return ts.visitNode(node, visitor as any);
}

export function transformAggregateOperationFunction(
  node: ts.FunctionExpression | ts.FunctionDeclaration,
  context: ts.TransformationContext,
  typeChecker: ts.TypeChecker
): ts.Expression {
  if (node.body === undefined) {
    throw new Error("expected function to have body");
  }
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
  return transformOperators(firstStatement.expression, context, typeChecker);
}
