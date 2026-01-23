let userInitiatedSignOut = false;

export function markUserInitiatedSignOut() {
  userInitiatedSignOut = true;
}

export function consumeUserInitiatedSignOut(): boolean {
  const v = userInitiatedSignOut;
  userInitiatedSignOut = false;
  return v;
}
