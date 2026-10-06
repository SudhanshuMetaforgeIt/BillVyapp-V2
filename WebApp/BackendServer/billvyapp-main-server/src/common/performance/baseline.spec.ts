import { percentiles } from './baseline';

describe('baseline percentiles', () => {
  it('uses nearest rank without sorting the original samples', () => {
    const values = [100, 1, 20, 3, 2];
    expect(percentiles(values)).toEqual({
      samples: 5,
      p50: 3,
      p95: 100,
      p99: 100,
    });
    expect(values).toEqual([100, 1, 20, 3, 2]);
  });
  it('reports missing samples as null', () => {
    expect(percentiles([])).toEqual({
      samples: 0,
      p50: null,
      p95: null,
      p99: null,
    });
  });
});
