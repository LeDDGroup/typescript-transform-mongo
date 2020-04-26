import * as ts from "typescript";
import { transformOperators } from "./operators";

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

export function transformStage(
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
