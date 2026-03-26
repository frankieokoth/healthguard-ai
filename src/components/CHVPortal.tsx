import React, { useState, useRef, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Camera, Activity, UserPlus, ChevronRight, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { getDiagnosis, analyzeMalnutrition } from '../services/gemini';
import { cn } from '../lib/utils';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
}

import { RefreshCcw, Wifi, WifiOff } from 'lucide-react';

export default function CHVPortal() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [symptoms, setSymptoms] = useState<string>('');
  const [patientForm, setPatientForm] = useState({ name: '', age: '', gender: 'male', location: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });
    return unsubscribe;
  }, []);

  const handleDiagnosis = async () => {
    if (!selectedPatient || !symptoms) return;
    setIsDiagnosing(true);
    try {
      const result = await getDiagnosis(symptoms.split(','), { 
        age: selectedPatient.age, 
        gender: selectedPatient.gender 
      });
      setDiagnosisResult(result);
      
      // Log the diagnosis to the patient's record in Firestore
      await addDoc(collection(db, 'diagnoses'), {
        patientId: selectedPatient.id,
        symptoms: symptoms,
        diagnosis: result.diagnosis,
        severity: result.severity,
        recommendations: result.recommendations,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Diagnosis failed:", error);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const startCamera = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, 400, 300);
    const imageData = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    stopCamera();
    setIsDiagnosing(true); // Reusing diagnosing state for loading
    
    try {
      const result = await analyzeMalnutrition(imageData);
      setScanResult(result);
      
      // Log scan if risk is detected
      if (result.riskLevel !== 'none' && selectedPatient) {
        await addDoc(collection(db, 'scans'), {
          patientId: selectedPatient.id,
          riskLevel: result.riskLevel,
          analysis: result.analysis,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Scan analysis failed:", error);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'patients'), {
        ...patientForm,
        age: parseInt(patientForm.age),
        createdAt: new Date().toISOString()
      });
      setShowAddPatient(false);
      setPatientForm({ name: '', age: '', gender: 'male', location: '' });
    } catch (error) {
      console.error("Error adding patient:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Patient Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Patient Registry</h2>
              <div className="flex items-center gap-2 mt-1">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest">
                    <Wifi className="w-3 h-3" /> Cloud Sync Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                    <WifiOff className="w-3 h-3" /> Offline Mode
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => setShowAddPatient(true)}
              className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {patients.map(p => (
              <motion.button
                key={p.id}
                whileHover={{ x: 4 }}
                onClick={() => {
                  setSelectedPatient(p);
                  setDiagnosisResult(null);
                  setScanResult(null);
                  setSymptoms('');
                }}
                className={cn(
                  "w-full p-4 rounded-2xl text-left transition-all border group",
                  selectedPatient?.id === p.id 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
                    : "bg-white border-slate-100 text-slate-900 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{p.name}</p>
                    <p className={cn("text-[10px] mt-1 font-mono uppercase tracking-wider", selectedPatient?.id === p.id ? "text-slate-400" : "text-slate-500")}>
                      {p.age}Y • {p.gender} • {p.location}
                    </p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-1", selectedPatient?.id === p.id ? "text-white" : "text-slate-300")} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
        
        <div className="bg-blue-600 p-6 rounded-[2rem] text-white overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-2">CHV Performance</p>
            <p className="text-2xl font-bold">128 Patients</p>
            <p className="text-xs opacity-80 mt-1">Managed this month</p>
          </div>
          <Activity className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
        </div>
      </div>

      {/* Main Diagnostic Area */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {selectedPatient ? (
            <motion.div
              key={selectedPatient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 min-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                    <Activity className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedPatient.name}</h2>
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-1">ID: {selectedPatient.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Session</span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 flex-1">
                {/* Symptom Recording */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      Symptom Log
                    </h3>
                    <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Voice Input</button>
                  </div>
                  
                  <div className="relative">
                    <textarea 
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Describe symptoms in detail..."
                      className="w-full h-48 p-6 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Ready</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <button 
                    onClick={handleDiagnosis}
                    disabled={isDiagnosing || !symptoms}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
                  >
                    {isDiagnosing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                    Analyze Symptoms
                  </button>

                  {diagnosisResult && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">AI Diagnostic Engine</span>
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                            diagnosisResult.severity === 'critical' ? "bg-red-500 text-white" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          )}>
                            {diagnosisResult.severity} SEVERITY
                          </span>
                        </div>
                        <p className="font-bold text-xl mb-4 tracking-tight">{diagnosisResult.diagnosis}</p>
                        <div className="space-y-3">
                          {diagnosisResult.recommendations.map((r: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                              </div>
                              {r}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                    </motion.div>
                  )}
                </div>

                {/* Malnutrition Vision */}
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-500" />
                    Computer Vision Scan
                  </h3>
                  
                  <div className="aspect-[4/3] bg-slate-50 rounded-3xl overflow-hidden relative border border-slate-100 flex items-center justify-center group">
                    {isScanning ? (
                      <div className="w-full h-full relative">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                          <div className="w-full h-full border-2 border-white/50 rounded-lg relative">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500" />
                          </div>
                        </div>
                        <div className="absolute top-6 left-6 bg-red-600 text-[10px] font-bold text-white px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
                        </div>
                      </div>
                    ) : scanResult ? (
                      <div className="p-10 text-center">
                        <div className={cn(
                          "inline-block px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] mb-4",
                          scanResult.riskLevel === 'severe' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        )}>
                          {scanResult.riskLevel.toUpperCase()} RISK DETECTED
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">{scanResult.analysis}</p>
                        <button 
                          onClick={() => setScanResult(null)}
                          className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-2 mx-auto"
                        >
                          <RefreshCcw className="w-3 h-3" /> Retake Scan
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-10">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                          <Camera className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 mb-1">Malnutrition Detection</p>
                        <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Align patient's face and upper body within the frame for AI analysis.</p>
                      </div>
                    )}
                  </div>

                  <canvas ref={canvasRef} width="400" height="300" className="hidden" />

                  {isScanning ? (
                    <button 
                      onClick={captureAndAnalyze}
                      className="w-full py-5 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                    >
                      Analyze Frame
                    </button>
                  ) : (
                    <button 
                      onClick={startCamera}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-3"
                    >
                      <Camera className="w-5 h-5" />
                      Initiate Vision Scan
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-10 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                <UserPlus className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Select Patient Record</h3>
              <p className="text-slate-500 max-w-sm leading-relaxed">Please select a patient from the registry to begin a diagnostic session or perform a vision scan.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {showAddPatient && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-10 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Register Patient</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">New Registry Entry</p>
                </div>
                <button onClick={() => setShowAddPatient(false)} className="w-10 h-10 hover:bg-slate-50 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={addPatient} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Legal Name</label>
                  <input 
                    required
                    value={patientForm.name}
                    onChange={e => setPatientForm({...patientForm, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age (Years)</label>
                    <input 
                      required
                      type="number"
                      value={patientForm.age}
                      onChange={e => setPatientForm({...patientForm, age: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gender</label>
                    <select 
                      value={patientForm.gender}
                      onChange={e => setPatientForm({...patientForm, gender: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sub-County / Location</label>
                  <input 
                    required
                    value={patientForm.location}
                    onChange={e => setPatientForm({...patientForm, location: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. North Region"
                  />
                </div>
                <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all mt-4 shadow-xl shadow-slate-200">
                  Complete Registration
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
