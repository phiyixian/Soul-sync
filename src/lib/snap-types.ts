export interface Snap {
  id: string;
  senderId: string;
  recipientId: string;
  imageUrl: string;
  createdAt: Date;
  expiresAt: Date;
  isOpened: boolean;
  openedAt?: Date;
  viewDuration: number; // in seconds
}

export interface SnapData {
  senderId: string;
  recipientId: string;
  imageUrl: string;
  createdAt: any; // Firestore timestamp
  expiresAt: any; // Firestore timestamp
  isOpened: boolean;
  openedAt?: any; // Firestore timestamp
  viewDuration: number;
}

export const MAX_SNAPS_PER_USER = 3;
export const SNAP_VIEW_DURATION = 5; // seconds
export const SNAP_EXPIRY_HOURS = 24; // hours

