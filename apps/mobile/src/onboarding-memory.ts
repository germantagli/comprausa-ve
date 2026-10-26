let seen = false;

export function hasSeenOnboarding(): boolean {
  return seen;
}

export function markOnboardingSeen(): void {
  seen = true;
}

export function resetOnboarding(): void {
  seen = false;
}
