import { redactSensitive, safeRequestPath } from './redaction';
describe('Sensitive data redaction', () => {
  it('redacts nested objects and arrays while retaining useful non-secret data', () => {
    const output = redactSensitive({
      provider: 'example',
      config: {
        credentials: { privateKey: 'key' },
        nested: [{ api_key: 'secret', enabled: true }],
        passwordHash: 'hash',
        refreshToken: 'refresh',
        CVV: '123',
      },
    });
    expect(JSON.stringify(output)).not.toMatch(
      /secret|refresh"|hash"|123|"key"/,
    );
    expect(output).toMatchObject({
      provider: 'example',
      config: { nested: [{ api_key: '[REDACTED]', enabled: true }] },
    });
  });
  it('removes signed query credentials and line breaks from error paths', () => {
    expect(
      safeRequestPath('/api/media/objects/upload?sig=credential&key=private'),
    ).toBe('/api/media/objects/upload');
    expect(safeRequestPath('/api/path\r\nFORGED')).toBe('/api/pathFORGED');
  });
  it('masks credentials inside configuration URLs', () => {
    const value = redactSensitive({
      endpoint:
        'https://operator:private-password@example.test/api?api_key=private-key&region=in',
    });
    expect(JSON.stringify(value)).not.toMatch(
      /operator|private-password|private-key/,
    );
    expect(JSON.stringify(value)).toContain('region=in');
  });
});
