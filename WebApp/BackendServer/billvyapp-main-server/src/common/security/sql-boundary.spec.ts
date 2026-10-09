import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

describe('Raw SQL source boundary', () => {
  it('forbids unparameterized dynamic SQL in application code', () => {
    const violations: string[] = [];
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'generated') walk(path);
          continue;
        }
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts'))
          continue;
        const source = ts.createSourceFile(
          path,
          readFileSync(path, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        );
        const visit = (node: ts.Node) => {
          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ['$queryRawUnsafe', '$executeRawUnsafe', 'raw'].includes(
              node.expression.name.text,
            )
          ) {
            const argument = node.arguments[0];
            if (
              !argument ||
              (!ts.isStringLiteral(argument) &&
                !ts.isNoSubstitutionTemplateLiteral(argument))
            )
              violations.push(path);
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    };
    walk(join(__dirname, '../..'));
    expect(violations).toEqual([]);
  });
});
