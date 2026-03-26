import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc, getDocs, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, MapPin, Clock, CheckCircle, TrendingUp, Users, Activity, Loader2, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { checkForOutbreaks } from '../services/gemini';
import { cn } from '../lib/utils';

interface Alert {
  id: string;
  type: string;
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved';
  createdAt: string;
}

import DistrictMap from './DistrictMap';

export default function DistrictDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ totalPatients: 0, totalSymptoms: 0, activeAlerts: 0 });
  const [isChecking, setIsChecking] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [mapPoints, setMapPoints] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setAlerts(alertData);
      setStats(prev => ({ ...prev, activeAlerts: alertData.filter(a => a.status === 'active').length }));
      
      // Generate map points from alerts
      const points = alertData.map((a, i) => ({
        id: a.id,
        x: 100 + (i * 120) % 400,
        y: 100 + (i * 80) % 200,
        severity: a.severity,
        label: a.location
      }));
      setMapPoints(points);
    });

    // Fetch stats
    const fetchStats = async () => {
      const patients = await getDocs(collection(db, 'patients'));
      const symptoms = await getDocs(collection(db, 'symptoms'));
      setStats(prev => ({ 
        totalPatients: patients.size, 
        totalSymptoms: symptoms.size,
        activeAlerts: prev.activeAlerts
      }));

      const data = [
        { name: 'Mon', cases: 12 },
        { name: 'Tue', cases: 19 },
        { name: 'Wed', cases: 15 },
        { name: 'Thu', cases: 22 },
        { name: 'Fri', cases: 30 },
        { name: 'Sat', cases: 25 },
        { name: 'Sun', cases: 18 },
      ];
      setChartData(data);
    };

    fetchStats();
    return unsubscribe;
  }, []);

  const runOutbreakCheck = async () => {
    setIsChecking(true);
    try {
      const symptomsSnap = await getDocs(query(collection(db, 'symptoms'), orderBy('createdAt', 'desc'), limit(50)));
      const symptomsData = symptomsSnap.docs.map(d => d.data());
      
      const newAlerts = await checkForOutbreaks(symptomsData);
      if (newAlerts && newAlerts.length > 0) {
        for (const alert of newAlerts) {
          await addDoc(collection(db, 'alerts'), {
            ...alert,
            status: 'active',
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  const resolveAlert = async (id: string) => {
    await updateDoc(doc(db, 'alerts', id), { status: 'resolved' });
  };

  return (
    <div className="space-y-8">
      {/* Header with AI Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">District Health Command</h2>
          <p className="text-slate-400 max-w-md">Real-time surveillance and AI-driven outbreak detection for the Kilifi district.</p>
        </div>
        <div className="flex gap-4 relative z-10">
          <button 
            onClick={runOutbreakCheck}
            disabled={isChecking}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl font-bold transition-all border border-white/10"
          >
            {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
            AI Surveillance Scan
          </button>
        </div>
        {/* Abstract background element */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'blue', trend: '+4%' },
          { label: 'Active Alerts', value: stats.activeAlerts, icon: AlertTriangle, color: 'red', trend: '-2' },
          { label: 'Symptom Records', value: stats.totalSymptoms, icon: Activity, color: 'green', trend: '+12%' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                stat.color === 'red' ? "bg-red-50 text-red-600" :
                "bg-green-50 text-green-600"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
            <span className={cn(
              "text-xs font-bold px-2 py-1 rounded-lg",
              stat.color === 'red' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            )}>
              {stat.trend}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Outbreak Map & Alerts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="h-[450px]">
            <DistrictMap points={mapPoints} />
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Incidence Trends
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="cases" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-full max-h-[800px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500" />
                Alert Feed
              </h2>
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full">
                {stats.activeAlerts} ACTIVE
              </span>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <AnimatePresence initial={false}>
                {alerts.length > 0 ? alerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-5 rounded-2xl border transition-all",
                      alert.status === 'resolved' ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100 hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          alert.severity === 'critical' ? "bg-red-600 animate-pulse" : "bg-orange-500"
                        )} />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{alert.type}</span>
                      </div>
                      {alert.status === 'active' && (
                        <button 
                          onClick={() => resolveAlert(alert.id)}
                          className="text-[9px] font-bold text-slate-400 hover:text-green-600 transition-colors"
                        >
                          RESOLVE
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{alert.description}</p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {alert.location}
                      </div>
                      <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">Clear Skies</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all">
              Export District Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
