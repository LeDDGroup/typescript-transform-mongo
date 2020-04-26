import * as ts from "typescript";

// operators

function transformOperators(
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
    throw new Error();
    // return ts.visitEachChild(node, visitor, context);
  }
  return ts.visitNode(node, visitor);
}

// stages

function transformAddFields(
  args: ts.NodeArray<ts.Expression>,
  context: ts.TransformationContext
) {
  const props = args[0]; // TODO check it has 1 arg only
  if (!ts.isObjectLiteralExpression(props)) {
    throw new Error(
      "expected addFields to receive 1 argument with object literal"
    );
  }
  const resultProps: ts.PropertyAssignment[] = [];
  for (const assigment of props.properties) {
    if (!ts.isPropertyAssignment(assigment)) {
      throw new Error("expected assigment");
    }
    const { name, initializer } = assigment;
    resultProps.push(
      ts.createPropertyAssignment(
        name,
        transformOperators(initializer, context)
      )
    );
  }
  return ts.createObjectLiteral([
    ts.createPropertyAssignment(
      "$addFields",
      ts.createObjectLiteral(resultProps)
    ),
  ]);
}

function transformStage(
  stage: string,
  args: ts.NodeArray<ts.Expression>,

  context: ts.TransformationContext
): ts.ObjectLiteralExpression {
  switch (stage) {
    case "$addFields":
      return transformAddFields(args, context);
    default:
      throw new Error(`stage ${stage} not implemented or invalid`); // TODO improve this message too
  }
}

// rest of the code

function getStages(
  node: ts.CallExpression,
  context: ts.TransformationContext
): { identifier: ts.Identifier; args: ts.NodeArray<ts.Expression> }[] {
  if (ts.isIdentifier(node.expression)) {
    throw new Error(
      "how did we get here?, can't call 'this' or other functions I guess"
    );
  }
  if (!ts.isPropertyAccessExpression(node.expression)) {
    throw new Error("should be a property access expression");
  }
  if (!ts.isIdentifier(node.expression.name)) {
    throw new Error("for some reason not a identifier"); // TODO improve all this messages with the source code
  }
  if (ts.isCallExpression(node.expression.expression)) {
    return [
      ...getStages(node.expression.expression, context),
      { identifier: node.expression.name, args: node.arguments },
    ];
  }
  if (node.expression.expression.getText() !== "this") {
    // TODO improve condition later
    throw new Error("why not, not this");
  }
  return [{ identifier: node.expression.name, args: node.arguments }];
}

function transformAggregateFunction(
  node: ts.FunctionExpression,
  context: ts.TransformationContext
): ts.ArrayLiteralExpression {
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
  if (
    !(
      firstStatement.expression &&
      ts.isCallExpression(firstStatement.expression)
    )
  ) {
    throw new Error("expected call expression");
  }
  const stages = getStages(firstStatement.expression, context);
  return ts.createArrayLiteral(
    stages.map(({ identifier, args }) =>
      transformStage(identifier.getText(), args, context)
    )
  );
}

function locateAggregateFunction<L extends ts.Node>(
  node: L,
  context: ts.TransformationContext
): L {
  function visitor<T extends ts.Node>(node: T): ts.Node {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.getText() === "aggregate"
    ) {
      const firstArgument = node.arguments[0];
      if (!ts.isFunctionExpression(firstArgument)) {
        throw new Error(
          "called aggregate function but not passed function declaration"
        ); // TODO improve messages and hints
      }
      return transformAggregateFunction(firstArgument, context);
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
