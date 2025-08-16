'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile, createUserProfile, UserProfile, UserRole, Market, getUserAccessibleMarkets, ROLE_PERMISSIONS } from '@/lib/firebase/firestore';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  accessibleMarkets: Market[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  canManageUsers: false,
  accessibleMarkets: [],
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  refreshUserProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (user: User) => {
    try {
      let profile = await getUserProfile(user.uid);
      
      // If no profile exists, create one with default USER role
      if (!profile) {
        const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
          uid: user.uid,
          email: user.email!,
          name: user.displayName || undefined,
          role: 'USER',
          active: true,
        };
        
        // Check if this is the first user (make them admin)
        // In production, you'd want to set this via Firebase Admin SDK
        if (user.email === 'ben@mindsparkdigitallabs.com') {
          newProfile.role = 'ADMIN';
        }
        
        await createUserProfile(newProfile);
        profile = await getUserProfile(user.uid);
      }
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        await loadUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  // Compute derived permissions
  const isAdmin = userProfile?.role === 'ADMIN';
  const canManageUsers = userProfile ? ROLE_PERMISSIONS[userProfile.role].canManageUsers : false;
  const accessibleMarkets = getUserAccessibleMarkets(userProfile);

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isAdmin,
      canManageUsers,
      accessibleMarkets,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout,
      refreshUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}