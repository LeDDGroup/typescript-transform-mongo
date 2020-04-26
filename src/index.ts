import * as ts from "typescript";

function transformer<T extends ts.Node>(_program: ts.Program) {
  return (_context: ts.TransformationContext) => (node: T) => node;
}

export default transformer;
