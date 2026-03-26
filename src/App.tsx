/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import Auth from './components/Auth';
import CHVPortal from './components/CHVPortal';
import DistrictDashboard from './components/DistrictDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Activity, LayoutDashboard, HeartPulse } from 'lucide-react';
import { cn } from './lib/utils';

interface UserData {
  email: string;
  role: 'chv' | 'official';
  name: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'portal' | 'dashboard'>('portal');

  const handleAuthChange = (u: any, data: UserData | null) => {
    setUser(u);
    setUserData(data);
    if (data) {
      setActiveTab(data.role === 'chv' ? 'portal' : 'dashboard');
    }
  };

  // Seed sample data if empty
  useEffect(() => {
    const seedData = async () => {
      if (!user) return;
      try {
        const patientsSnap = await getDocs(query(collection(db, 'patients'), limit(1)));
        if (patientsSnap.empty) {
          console.log("Seeding sample data...");
          await addDoc(collection(db, 'patients'), {
            name: "John Doe",
            age: 45,
            gender: "male",
            location: "Kilifi North",
            createdAt: new Date().toISOString()
          });
          await addDoc(collection(db, 'patients'), {
            name: "Jane Smith",
            age: 28,
            gender: "female",
            location: "Kilifi South",
            createdAt: new Date().toISOString()
          });
          
          await addDoc(collection(db, 'alerts'), {
            type: "Cholera Outbreak",
            location: "Kilifi North",
            description: "Cluster of 5 cases with severe diarrhea detected in the last 24 hours.",
            severity: "critical",
            status: "active",
            createdAt: new Date().toISOString()
          });
          
          await addDoc(collection(db, 'alerts'), {
            type: "Malaria Spike",
            location: "Kilifi South",
            description: "Unusual increase in high fever cases reported by CHVs.",
            severity: "high",
            status: "active",
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("Seeding failed:", e);
      }
    };
    seedData();
  }, [user]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Auth onAuthChange={handleAuthChange} />

          {user && userData && (
            <div className="space-y-8">
              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <HeartPulse className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">HealthGuard AI</h1>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                  <button 
                    onClick={() => setActiveTab('portal')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
                      activeTab === 'portal' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Activity className="w-4 h-4" />
                    CHV Portal
                  </button>
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
                      activeTab === 'dashboard' ? "bg-purple-600 text-white shadow-md shadow-purple-100" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <motion.main
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {activeTab === 'portal' ? <CHVPortal /> : <DistrictDashboard />}
              </motion.main>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-gray-100 py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm font-medium">HealthGuard AI Prototype • Empowering Community Health</p>
            <div className="flex items-center justify-center gap-6 mt-4">
              <span className="text-xs text-gray-300 uppercase tracking-widest font-bold">Diagnostics</span>
              <span className="text-xs text-gray-300 uppercase tracking-widest font-bold">Vision</span>
              <span className="text-xs text-gray-300 uppercase tracking-widest font-bold">Analytics</span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
