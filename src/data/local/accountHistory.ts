import { hasFlag, setFlag } from './localFlags';

const KEY = 'hadAccountHere';

/**
 * Whether an account has ever been signed in on this phone.
 *
 * Note what this does and does not say. It is a fact about the *device*, not
 * about the person holding it: on a phone two people share, the second one is
 * also told an account has been here. Anything shown because of this should
 * therefore talk about the phone, never about "you".
 */
export const markAccountUsedHere = () => setFlag(KEY);
export const hasAccountHistory = () => hasFlag(KEY);
