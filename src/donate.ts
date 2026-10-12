/**
 * PayPal donations: a plain link to PayPal's hosted donate page (no PayPal script, cookies or tracking on our pages).
 * The page is made at paypal.com/donate/buttons; its link carries the button's id. Empty hides the donate links.
 */
export const PAYPAL_DONATE_ID = ''

/** The donate page for a PayPal hosted button id, or '' without one. */
export const donateUrl = (id: string) =>
  id.trim() ? `https://www.paypal.com/donate/?hosted_button_id=${encodeURIComponent(id.trim())}` : ''

export const DONATE_URL = donateUrl(PAYPAL_DONATE_ID)
