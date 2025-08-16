import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import app from './config';

export const db = getFirestore(app);

// User roles and permissions
export type UserRole = 'ADMIN' | 'TEAM_EUCAN' | 'TEAM_LOCAL' | 'USER';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
  markets?: string[]; // For TEAM_LOCAL users
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  active: boolean;
}

// Available markets
export const MARKETS = [
  'UK',
  'Italy', 
  'Spain',
  'France',
  'Germany',
  'Poland',
  'Canada',
  'Belgium-NL',
  'Belgium-FR',
  'Switzerland-DE',
  'Switzerland-FR',
  'Switzerland-IT',
  'Netherlands',
  'Austria',
  'Portugal',
  'Sweden',
  'Denmark',
  'Norway',
  'Finland'
] as const;

export type Market = typeof MARKETS[number];

// Role permissions
export const ROLE_PERMISSIONS = {
  ADMIN: {
    canManageUsers: true,
    canViewAllMarkets: true,
    canEditAllContent: true,
    canAccessAdmin: true,
    description: 'Full system access and user management'
  },
  TEAM_EUCAN: {
    canManageUsers: false,
    canViewAllMarkets: true,
    canEditAllContent: true,
    canAccessAdmin: false,
    description: 'Access to all markets, can edit content'
  },
  TEAM_LOCAL: {
    canManageUsers: false,
    canViewAllMarkets: false,
    canEditAllContent: false,
    canAccessAdmin: false,
    description: 'Access to specific markets only'
  },
  USER: {
    canManageUsers: false,
    canViewAllMarkets: false,
    canEditAllContent: false,
    canAccessAdmin: false,
    description: 'Read-only access to assigned markets'
  }
};

// User profile management functions
export async function createUserProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
  const userRef = doc(db, 'users', profile.uid);
  await setDoc(userRef, {
    ...profile,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as UserProfile;
  }
  
  return null;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date()
  });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      uid: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as UserProfile;
  });
}

export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', role));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      uid: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as UserProfile;
  });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
}

// Permission checking functions
export function canUserAccessMarket(userProfile: UserProfile | null, market: Market): boolean {
  if (!userProfile || !userProfile.active) return false;
  
  // Admins and TEAM_EUCAN can access all markets
  if (userProfile.role === 'ADMIN' || userProfile.role === 'TEAM_EUCAN') {
    return true;
  }
  
  // TEAM_LOCAL can only access assigned markets
  if (userProfile.role === 'TEAM_LOCAL' && userProfile.markets) {
    return userProfile.markets.includes(market);
  }
  
  return false;
}

export function getUserAccessibleMarkets(userProfile: UserProfile | null): Market[] {
  if (!userProfile || !userProfile.active) return [];
  
  // Admins and TEAM_EUCAN can access all markets
  if (userProfile.role === 'ADMIN' || userProfile.role === 'TEAM_EUCAN') {
    return [...MARKETS];
  }
  
  // TEAM_LOCAL can only access assigned markets
  if (userProfile.role === 'TEAM_LOCAL' && userProfile.markets) {
    return userProfile.markets.filter(m => MARKETS.includes(m as Market)) as Market[];
  }
  
  return [];
}