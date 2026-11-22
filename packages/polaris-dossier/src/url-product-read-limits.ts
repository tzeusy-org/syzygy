/** Recorded in the URL runtime/profile input identity before any operation.
 * A render uses one immutable absolute deadline for reads, reproduction and its
 * validated product. Other reads retain their shorter operation bound. */
export const URL_PRODUCT_READ_MILLISECONDS = Object.freeze({
  render: 30_000,
  'review-packet': 5000,
  'review-check': 5000,
  'inventory-check': 5000,
  'author-check': 5000,
});
