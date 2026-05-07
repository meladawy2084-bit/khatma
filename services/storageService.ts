import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  or,
  and,
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Khatma, User, Juz, JuzStatus, ReadingStatus, KhatmaStatus } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const storageService = {
  // --- User Profiles ---

  async syncUser(firebaseUser: any): Promise<User> {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const newUser: User = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'مستخدم جديد',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
        isAdmin: firebaseUser.email === "m.eladawy.2084@gmail.com", // First user or specific email
      };
      
      try {
        await setDoc(userRef, {
          ...newUser,
          createdAt: serverTimestamp()
        });
        return newUser;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
    }
    
    return userSnap.data() as User;
  },

  // --- Khatmas ---

  async createKhatma(khatma: Partial<Khatma>, juzs: Juz[]): Promise<string> {
    const khatmaId = crypto.randomUUID();
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    const khatmaData = {
      ...khatma,
      id: khatmaId,
      createdBy: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      status: KhatmaStatus.OPEN,
      parts: juzs
    };

    try {
      await setDoc(khatmaRef, khatmaData);
      return khatmaId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `khatmas/${khatmaId}`);
    }
    return '';
  },

  subscribeToKhatmas(callback: (khatmas: Khatma[]) => void, isAdmin?: boolean) {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'khatmas'), orderBy('createdAt', 'desc'));
    } else if (auth.currentUser) {
      q = query(
        collection(db, 'khatmas'), 
        or(
          where('visibility', '==', 'PUBLIC'),
          where('createdBy', '==', auth.currentUser.uid)
        ),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'khatmas'), 
        where('visibility', '==', 'PUBLIC'),
        orderBy('createdAt', 'desc')
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      const khatmas = snapshot.docs.map(doc => ({ ...doc.data() } as Khatma));
      callback(khatmas);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'khatmas');
    });
  },

  async reserveJuz(khatmaId: string, juzId: number, userName: string) {
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    try {
      const khatmaSnap = await getDoc(khatmaRef);
      if (!khatmaSnap.exists()) return;
      
      const khatma = khatmaSnap.data() as Khatma;
      const newParts = khatma.parts.map(p => {
        if (p.id === juzId && p.status === JuzStatus.AVAILABLE) {
          return {
            ...p,
            status: JuzStatus.RESERVED,
            readingStatus: ReadingStatus.READING,
            reservedBy: userName,
            reservedById: auth.currentUser?.uid,
            reservedAt: new Date().toISOString()
          };
        }
        return p;
      });

      await updateDoc(khatmaRef, { parts: newParts });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `khatmas/${khatmaId}`);
    }
  },

  async updateJuzStatus(khatmaId: string, juzId: number, status: ReadingStatus) {
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    try {
      const khatmaSnap = await getDoc(khatmaRef);
      if (!khatmaSnap.exists()) return;
      
      const khatma = khatmaSnap.data() as Khatma;
      const newParts = khatma.parts.map(p => {
        if (p.id === juzId) {
          return { ...p, readingStatus: status };
        }
        return p;
      });

      await updateDoc(khatmaRef, { parts: newParts });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `khatmas/${khatmaId}`);
    }
  },

  async cancelReservation(khatmaId: string, juzId: number) {
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    try {
      const khatmaSnap = await getDoc(khatmaRef);
      if (!khatmaSnap.exists()) return;
      
      const khatma = khatmaSnap.data() as Khatma;
      const newParts = khatma.parts.map(p => {
        if (p.id === juzId) {
          return {
            ...p,
            status: JuzStatus.AVAILABLE,
            readingStatus: ReadingStatus.NOT_STARTED,
            reservedBy: null,
            reservedById: null,
            reservedAt: null
          };
        }
        return p;
      });

      await updateDoc(khatmaRef, { parts: newParts });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `khatmas/${khatmaId}`);
    }
  },

  async markKhatmaCompleted(khatmaId: string, dua: string) {
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    try {
      await updateDoc(khatmaRef, { 
        status: KhatmaStatus.COMPLETED,
        completionDua: dua 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `khatmas/${khatmaId}`);
    }
  },

  async adminAction(khatmaId: string, action: 'close' | 'cancel' | 'extend', payload?: any) {
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    try {
      if (action === 'close') {
        await updateDoc(khatmaRef, { status: KhatmaStatus.COMPLETED, adminComment: payload });
      } else if (action === 'cancel') {
        await updateDoc(khatmaRef, { status: KhatmaStatus.CANCELLED, adminComment: payload });
      } else if (action === 'extend') {
        await updateDoc(khatmaRef, { endDate: payload });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `khatmas/${khatmaId}`);
    }
  },

  async getKhatma(khatmaId: string): Promise<Khatma | null> {
    const khatmaRef = doc(db, 'khatmas', khatmaId);
    try {
      const snap = await getDoc(khatmaRef);
      return snap.exists() ? (snap.data() as Khatma) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `khatmas/${khatmaId}`);
      return null;
    }
  }
};
