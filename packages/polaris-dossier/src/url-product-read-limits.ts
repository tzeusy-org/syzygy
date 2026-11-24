export const URL_ORDERED_NATIVE_EFFECT_MILLISECONDS = 30_000;

const productReadMilliseconds = {
  render: 60_000,
  'review-packet': 5000,
  'review-check': 5000,
  'inventory-check': 5000,
  'author-check': 5000,
};

/** The runtime binds these limits before issuing an immutable read deadline.
 * Only the replacement of an existing ordered Design delivery includes time
 * for the following native effect under the same lease. */
export const URL_PRODUCT_READ_MILLISECONDS = Object.freeze({
  ...productReadMilliseconds,
  'ordered-design-replacement': productReadMilliseconds.render + URL_ORDERED_NATIVE_EFFECT_MILLISECONDS,
});
