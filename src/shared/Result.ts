export type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ kind: 'ok', value });
export const Err = <E>(error: E): Result<never, E> => ({ kind: 'err', error });