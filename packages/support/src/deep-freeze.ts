/**
 * Freezes the value and everything it reaches through own enumerable
 * properties. An object that is already frozen ends the walk there, so a
 * frozen shell around an unfrozen member keeps the member unfrozen, and a
 * cycle terminates.
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const member of Object.values(value)) deepFreeze(member);
  }
  return value;
}
