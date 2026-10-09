import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { ACCESS_POLICY } from './access-policy';

describe('HTTP permission inventory coverage', () => {
  it('covers every controller handler and permits only explicitly public routes', () => {
    const keys: string[] = [];
    function visit(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'generated') visit(file);
        else if (entry.name.endsWith('.controller.ts')) {
          const source = ts.createSourceFile(
            file,
            fs.readFileSync(file, 'utf8'),
            ts.ScriptTarget.Latest,
            true,
          );
          const decorators = (node: ts.Node) =>
            ts.canHaveDecorators(node)
              ? (ts
                  .getDecorators(node)
                  ?.map((d) => d.expression.getText(source)) ?? [])
              : [];
          for (const node of source.statements) {
            if (!ts.isClassDeclaration(node) || !node.name) continue;
            const classPublic = decorators(node).includes('Public()');
            for (const member of node.members) {
              if (!ts.isMethodDeclaration(member)) continue;
              const ds = decorators(member);
              if (
                !ds.some((d) =>
                  /^(Get|Post|Put|Patch|Delete|Head|Options|All)\(/.test(d),
                )
              )
                continue;
              const key = node.name.text + '.' + member.name.getText(source);
              keys.push(key);
              expect(
                Object.prototype.hasOwnProperty.call(ACCESS_POLICY, key),
              ).toBe(true);
              expect(ACCESS_POLICY[key] === null).toBe(
                classPublic || ds.includes('Public()'),
              );
              if (ACCESS_POLICY[key] !== null)
                expect(ACCESS_POLICY[key]?.length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
    visit(path.resolve(__dirname, '../..'));
    expect(keys.sort()).toEqual(Object.keys(ACCESS_POLICY).sort());
    expect(keys).toHaveLength(215);
  });
});
