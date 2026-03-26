import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface UserData {
  email: string;
  role: 'chv' | 'official';
  name: string;
}

export default function Auth({ onAuthChange }: { onAuthChange: (user: any, userData: UserData | null) => void }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingRole, setSelectingRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);
          onAuthChange(u, data);
        } else {
          setSelectingRole(true);
        }
      } else {
        setUserData(null);
        onAuthChange(null, null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const selectRole = async (role: 'chv' | 'official') => {
    if (!user) return;
    const data: UserData = {
      email: user.email,
      role,
      name: user.displayName || 'Anonymous'
    };
    await setDoc(doc(db, 'users', user.uid), data);
    setUserData(data);
    setSelectingRole(false);
    onAuthChange(user, data);
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HealthGuard AI</h1>
          <p className="text-gray-500 mb-8">Secure access for Community Health Volunteers and District Officials.</p>
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (selectingRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Role</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <button 
            onClick={() => selectRole('chv')}
            className="p-8 bg-white border-2 border-transparent hover:border-blue-500 rounded-3xl shadow-lg text-left transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100">
              <UserIcon className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Health Volunteer</h3>
            <p className="text-gray-500 text-sm">Record symptoms, perform malnutrition scans, and manage patient data.</p>
          </button>
          <button 
            onClick={() => selectRole('official')}
            className="p-8 bg-white border-2 border-transparent hover:border-purple-500 rounded-3xl shadow-lg text-left transition-all group"
          >
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-100">
              <ShieldCheck className="text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">District Official</h3>
            <p className="text-gray-500 text-sm">Monitor outbreak alerts, view district-wide analytics, and manage alerts.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900 leading-none">{userData?.name}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
            {userData?.role === 'chv' ? 'Community Health Volunteer' : 'District Official'}
          </p>
        </div>
      </div>
      <button 
        onClick={logout}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}
