import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { createInvite } from './groups/createInvite';
export { redeemInvite } from './groups/redeemInvite';
