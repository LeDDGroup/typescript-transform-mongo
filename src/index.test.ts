import * as ts from "typescript";
import transformer from "./index";

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.CommonJS,
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
aggregate(function(this) {
  return this.$addFields({ hello: this.world });
});
`,
    `\
[{ $addFields: { hello: "$world" } }];
`
  );
});
