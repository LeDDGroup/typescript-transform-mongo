import * as ts from "typescript";

export function transformOperators(
  node: ts.Expression,
  context: ts.TransformationContext,
  typeChecker: ts.TypeChecker
): ts.Expression {
  const isNumber = (node: ts.Node) =>
    typeChecker.getTypeAtLocation(node).flags & ts.TypeFlags.NumberLike;
  const isBoolean = (node: ts.Node) =>
    typeChecker.getTypeAtLocation(node).flags & ts.TypeFlags.BooleanLike;
  const isArray = (node: ts.Node) => true; // TODO find proper type check
  const isOperation = (node: ts.BinaryExpression, token: ts.SyntaxKind) =>
    node.operatorToken.kind === token;
  const array = (op: string, elements: ts.Expression[]) =>
    ts.createObjectLiteral([
      ts.createPropertyAssignment(
        op,
        ts.createArrayLiteral(elements.map((node) => visitor(node)))
      ),
    ]);
  const unary = (op: string, node: ts.Expression) =>
    ts.createObjectLiteral([ts.createPropertyAssignment(op, visitor(node))]);
  const binary = (node: ts.BinaryExpression, op: string) =>
    array(op, [node.left, node.right]);
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
        if (isOperation(node, ts.SyntaxKind.PlusToken))
          return binary(node, "$add");
        // subtract
        if (isOperation(node, ts.SyntaxKind.MinusToken))
          return binary(node, "$subtract");
        // multiply
        if (isOperation(node, ts.SyntaxKind.AsteriskToken))
          return binary(node, "$multiply");
        // divide
        if (isOperation(node, ts.SyntaxKind.SlashToken))
          return binary(node, "$divide");
      }
      if (isBoolean(node.left) && isBoolean(node.right)) {
        // and
        if (isOperation(node, ts.SyntaxKind.AmpersandAmpersandToken))
          return binary(node, "$and");
        // or
        if (isOperation(node, ts.SyntaxKind.BarBarToken))
          return binary(node, "$or");
      }
      // eq
      if (isOperation(node, ts.SyntaxKind.EqualsEqualsEqualsToken))
        return binary(node, "$eq");
      // nq
      if (isOperation(node, ts.SyntaxKind.ExclamationEqualsEqualsToken))
        return binary(node, "$ne");
      // gt
      if (isOperation(node, ts.SyntaxKind.GreaterThanToken))
        return binary(node, "$gt");
      // gte
      if (isOperation(node, ts.SyntaxKind.GreaterThanEqualsToken))
        return binary(node, "$gte");
      // lt
      if (isOperation(node, ts.SyntaxKind.LessThanToken))
        return binary(node, "$lt");
      // lte
      if (isOperation(node, ts.SyntaxKind.LessThanEqualsToken))
        return binary(node, "$lte");
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
    if (ts.isLiteralExpression(node))
      return ts.createObjectLiteral([
        ts.createPropertyAssignment("$literal", node),
      ]);
    // array.length
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "length" &&
      isArray(node.expression)
    )
      return unary("$size", node.expression);
    // array[index]
    if (ts.isElementAccessExpression(node) && isArray(node.expression))
      return array("$arrayElemAt", [node.expression, node.argumentExpression]);
    // array.includes(element)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isArray(node.expression.expression) &&
      node.expression.name.text === "includes"
    )
      return array("$in", [node.arguments[0], node.expression.expression]);
    // array.indexOf(element)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isArray(node.expression.expression) &&
      node.expression.name.text === "indexOf"
    )
      return array("$indexOfArray", [
        node.expression.expression,
        node.arguments[0],
      ]);
    // array.concat(array2)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isArray(node.expression.expression) &&
      isArray(node.arguments[0]) &&
      node.expression.name.text === "concat"
    )
      return array("$concatArrays", [
        node.expression.expression,
        node.arguments[0],
      ]);
    // array.reverse
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isArray(node.expression.expression) &&
      node.expression.name.text === "reverse"
    )
      return unary("$reverseArray", node.expression.expression);
    // Array.isArray
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Array" &&
      node.expression.name.text === "isArray" &&
      isArray(node.arguments[0])
    )
      return array("$isArray", [node.arguments[0]]);
    console.error(`\
---- operation '${ts.SyntaxKind[node.kind]}' not available or invalid

${node.getText()}

----\
`);
    return node;
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
