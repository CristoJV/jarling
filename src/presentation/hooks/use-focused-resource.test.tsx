import React, { useEffect as mockUseEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { useFocusedResource } from '@/presentation/hooks/use-focused-resource';

jest.mock('expo-router', () => {
  return {
    useFocusEffect: (callback: () => void | (() => void)) =>
      mockUseEffect(callback, [callback]),
  };
});

jest.mock('@/presentation/localization/localization-provider', () => {
  const translate = (key: string) => key;
  return { useTranslation: () => ({ t: translate }) };
});

type Deferred<Value> = Readonly<{
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (cause: unknown) => void;
}>;

function deferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useFocusedResource', () => {
  test('keeps the newest result when requests finish out of order', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const load = jest
      .fn<Promise<string>, []>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    let resource: ReturnType<typeof useFocusedResource<string>> | undefined;

    function Harness() {
      resource = useFocusedResource(load);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });
    await act(async () => {
      void resource!.refresh();
    });
    await act(async () => {
      second.resolve('newest');
      await second.promise;
    });
    expect(resource?.data).toBe('newest');
    expect(resource?.loading).toBe(false);

    await act(async () => {
      first.resolve('stale');
      await first.promise;
    });
    expect(resource?.data).toBe('newest');
    await act(async () => renderer.unmount());
  });

  test('clears an earlier error after a successful refresh', async () => {
    const failure = deferred<string>();
    const success = deferred<string>();
    const load = jest
      .fn<Promise<string>, []>()
      .mockReturnValueOnce(failure.promise)
      .mockReturnValueOnce(success.promise);
    let resource: ReturnType<typeof useFocusedResource<string>> | undefined;

    function Harness() {
      resource = useFocusedResource(load);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });
    await act(async () => {
      failure.reject(new Error('failed'));
      await failure.promise.catch(() => undefined);
    });
    expect(resource?.error).toBe('errors.unknown');

    await act(async () => {
      void resource!.refresh();
    });
    expect(resource?.error).toBeNull();
    await act(async () => {
      success.resolve('loaded');
      await success.promise;
    });
    expect(resource?.data).toBe('loaded');
    await act(async () => renderer.unmount());
  });
});
