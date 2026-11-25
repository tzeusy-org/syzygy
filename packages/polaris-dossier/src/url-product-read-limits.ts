// Allocate the existing 85-second broker envelope between serial preparation
// and effect. The broker, caller and original run may refuse earlier; this is
// finite capacity, not a completion or worst-case scheduling guarantee.
export const URL_ORDERED_NATIVE_PREPARATION_MILLISECONDS = 30_000;
export const URL_ORDERED_NATIVE_MEDIATION_MILLISECONDS = 85_000;
export const URL_ORDERED_NATIVE_EFFECT_MILLISECONDS = URL_ORDERED_NATIVE_MEDIATION_MILLISECONDS
  - URL_ORDERED_NATIVE_PREPARATION_MILLISECONDS;

const productReadMilliseconds = {
  render: 60_000,
  'review-packet': 5000,
  'review-check': 5000,
  'inventory-check': 5000,
  'author-check': 5000,
};

/** The runtime binds these limits before issuing an immutable read deadline.
 * Ordered Design startup and replacement include time for the following
 * native setup or effect under the same lease. */
export const URL_PRODUCT_READ_MILLISECONDS = Object.freeze({
  ...productReadMilliseconds,
  'ordered-design-startup': productReadMilliseconds.render + URL_ORDERED_NATIVE_MEDIATION_MILLISECONDS,
  'ordered-design-replacement': productReadMilliseconds.render + URL_ORDERED_NATIVE_MEDIATION_MILLISECONDS,
});
