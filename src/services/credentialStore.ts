/**
 * Asks the browser's password manager to remember the sign-in (Credential Management API).
 * Chrome / Edge / Android show their own "Save password?" prompt; browsers without the API
 * (Safari, Firefox) still offer to save through the form's autocomplete attributes.
 * The password is handed straight to the browser and never stored by the app.
 */
type PasswordCredentialCtor = new (data: { id: string; password: string; name?: string }) => Credential;

/**
 * Prompts the browser's native password manager to securely store user credentials.
 *
 * @param email - User identifier / email address
 * @param password - User authentication password
 * @param name - Optional user display name
 */
export async function offerToSaveCredentials(email: string, password: string, name?: string): Promise<void> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  const Ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;
  if (!Ctor || typeof navigator.credentials?.store !== 'function') return;
  try {
    await navigator.credentials.store(new Ctor({ id: email, password, name }));
  } catch {
    /* unsupported, blocked or declined by the user: signing in still works */
  }
}

