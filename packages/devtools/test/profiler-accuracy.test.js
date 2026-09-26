/**
 * Profiler accuracy and resource use
 *
 * Regression coverage for: timings taken with Date.now() (1 ms resolution,
 * so sub-millisecond renders all measured 0 or 1); endRender() ignoring
 * maxSamples; performance marks/measures never cleared from the global
 * timeline; profilers enabled by default; profile() recording nothing; and
 * measure() rejecting with a plain object instead of an Error.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { PerformanceProfiler, createProfiler, measure, profile } from '../src/profiler.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const coherentEntries = () =>
  performance.getEntries().filter((entry) => entry.name.startsWith('coherent-'));

describe('PerformanceProfiler', () => {
  it('is disabled until enabled', () => {
    expect(new PerformanceProfiler().start('x')).toBeNull();
    expect(createProfiler().startRender('X')).toBeNull();
    expect(createProfiler({ enabled: true }).startRender('X')).toEqual(expect.any(String));
  });

  it('times renders with sub-millisecond resolution', () => {
    const profiler = createProfiler({ enabled: true });
    const clock = vi.spyOn(performance, 'now');
    clock.mockReturnValueOnce(1000.25).mockReturnValueOnce(1000.75);

    const id = profiler.startRender('Fast');
    const measurement = profiler.endRender(id);
    expect(measurement.duration).toBeCloseTo(0.5, 5);
  });

  it('keeps at most maxSamples render measurements', () => {
    const profiler = createProfiler({ enabled: true, maxSamples: 10 });
    const session = profiler.start('many-renders');
    for (let i = 0; i < 50; i++) {
      profiler.endRender(profiler.startRender(`C${i}`));
    }
    expect(profiler.measurements).toHaveLength(10);
    expect(profiler.measurements.at(-1).componentName).toBe('C49');
    expect(profiler.currentSession.measurements).toHaveLength(10);
    profiler.stop(session);
  });

  it('leaves no marks or measures on the global performance timeline', () => {
    const before = coherentEntries().length;
    const profiler = createProfiler({ enabled: true });
    for (let i = 0; i < 100; i++) {
      const session = profiler.start(`s${i}`);
      profiler.endRender(profiler.startRender('C'));
      profiler.mark(`m${i}`);
      profiler.stop(session);
    }
    profiler.startRender('left-open');
    profiler.start('left-open');
    profiler.clear();
    expect(coherentEntries().length).toBe(before);
  });
});

describe('profile()', () => {
  function work(n) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.sqrt(i);
    return sum;
  }

  it('records every call on its profiler and returns the result', () => {
    const wrapped = profile(work);
    expect(wrapped(1000)).toBe(work(1000));
    wrapped(10);
    expect(wrapped.profiler.measurements).toHaveLength(2);
    expect(wrapped.profiler.measurements[0].componentName).toBe('work');
    expect(wrapped.profiler.measurements[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('uses a given profiler and name, and handles async and throwing functions', async () => {
    const profiler = createProfiler({ enabled: true });
    const slow = profile(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'done';
    }, { profiler, name: 'Slow' });
    const broken = profile(() => { throw new Error('boom'); }, profiler);

    await expect(slow()).resolves.toBe('done');
    expect(() => broken()).toThrow('boom');

    expect(profiler.measurements.map((m) => m.componentName)).toEqual(['Slow', 'anonymous']);
    expect(profiler.measurements[0].duration).toBeGreaterThanOrEqual(15);
    expect(profiler.measurements[1].result).toEqual({ error: true });
  });
});

describe('measure()', () => {
  it('rejects with the Error the function threw, carrying the duration', async () => {
    const error = await measure('x', () => { throw new Error('inner'); }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('inner');
    expect(error.duration).toBeGreaterThanOrEqual(0);
  });

  it('wraps a non-Error throw in an Error with the value as cause', async () => {
    const error = await measure('x', () => { throw 'plain string'; }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('x failed: plain string');
    expect(error.cause).toBe('plain string');
  });
});
