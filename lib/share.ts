// Browser-safe helpers for the "Send it" step. JoyDrop never sends these itself;
// they prefill the sender's own Messages or email app.

/** Text the sender shares from their own phone or email app. */
export function shareText(recipientName: string, senderName: string, url: string) {
  return `Happy birthday, ${recipientName}! ${senderName} made you a birthday card: ${url}`;
}

export function smsHref(text: string) {
  // "sms:?&body=" opens the messaging app with the body filled in on iOS and Android.
  return `sms:?&body=${encodeURIComponent(text)}`;
}

export function mailtoHref(recipientName: string, text: string) {
  return `mailto:?subject=${encodeURIComponent(`A birthday card for ${recipientName}`)}&body=${encodeURIComponent(text)}`;
}
