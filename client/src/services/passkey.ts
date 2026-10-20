/* eslint-disable @typescript-eslint/no-explicit-any */

// Turn errors from the browser's WebAuthn API and our backend into readable messages
export function getPasskeyErrorMessage(err: any, fallback: string): string {
  // Backend error (axios)
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }

  switch (err?.name) {
    case 'NotAllowedError':
      // User cancelled the fingerprint/face/screen-lock prompt, or it timed out
      return 'The passkey prompt was cancelled or timed out. Please try again.';
    case 'InvalidStateError':
      // A passkey for this account already exists on this authenticator
      return 'This device already has a passkey for this account. Please sign in instead.';
    case 'NotSupportedError':
      return 'This device does not support passkeys.';
    case 'SecurityError':
      return 'Passkeys are not allowed on this domain. Check the WebAuthn RP ID and origin settings.';
    default:
      return fallback;
  }
}
