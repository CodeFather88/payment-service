export type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

export function Ok(): Result<void, never>;
export function Ok<T>(value: T): Result<T, never>;
export function Ok<T>(value?: T): Result<T, never> {
  return { kind: 'ok', value: value as T };
}

export const Err = <E>(error: E): Result<never, E> => ({ kind: 'err', error });