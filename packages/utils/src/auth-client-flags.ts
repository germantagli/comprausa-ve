/**
 * Phone/SMS OTP is hidden in web and mobile clients.
 * Re-enable when a paid SMS provider (Twilio, etc.) is budgeted.
 * The API may still accept `channel: "phone"`; clients simply do not offer it.
 */
export const PHONE_OTP_ENABLED = false;
