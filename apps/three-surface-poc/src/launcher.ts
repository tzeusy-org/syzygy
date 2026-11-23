import type { PwbRepositoryBinding } from './git-observation.js';

type LauncherBindingResult<T> =
  | { readonly kind: 'rejected'; readonly reason: Extract<PwbRepositoryBinding, { readonly kind: 'rejected' }>['reason'] }
  | { readonly kind: 'launched'; readonly result: T };

// The executable launcher's complete repository-observation/body-read
// continuation is the callback. A rejected binding cannot reach it.
export async function launchAfterPwbRepositoryBinding<T>(
  configuredLocator: string,
  resolveBinding: (locator: string) => PwbRepositoryBinding,
  launch: (binding: Extract<PwbRepositoryBinding, { readonly kind: 'bound' }>) => Promise<T>,
): Promise<LauncherBindingResult<T>> {
  const binding = resolveBinding(configuredLocator);
  if (binding.kind === 'rejected') return binding;
  return { kind: 'launched', result: await launch(binding) };
}
