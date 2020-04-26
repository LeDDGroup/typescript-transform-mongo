import * as ts from "typescript";
import transformer from "./index";

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.Preserve,
};

function compile(source: string): string {
  let content = "";
  const program = ts.createProgram(["index.ts"], compilerOptions, {
    ...ts.createCompilerHost(compilerOptions),
    getSourceFile(file: string): ts.SourceFile {
      return ts.createSourceFile(file, source, compilerOptions.target);
    },
  });
  program.emit(
    undefined,
    (_, result) => (content = result),
    undefined,
    undefined,
    { after: [transformer(program)] }
  );
  return content;
}

function check(source: string, expected: string) {
  const actual = compile(source);
  expect(actual).toBe(expected);
}

test("should work", () => {
  check(
    `\
const a = 3;
`,
    `\
const a = 3;
`
  );
});
