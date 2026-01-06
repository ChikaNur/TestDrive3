
import React, { useState, useEffect } from 'react';
import { Team, User, CourseConfig, CodeFile } from '../types';
import { 
  Play, Users, FileCode, CheckCircle, AlertCircle, Lock, 
  HelpCircle, History, ChevronDown, ChevronUp, Star, Info, 
  Loader2, RefreshCcw, Plus, BookOpen, GraduationCap, X,
  Award, Target, MessageSquare, Radio, ArrowRightCircle,
  ArrowRight, SearchCode, Sparkles, ShieldCheck, Key
} from 'lucide-react';
import FileUpload from './FileUpload';
import { getStudentHistory, getStudentTeams, getCourseConfig, getAllClasses, loginUser } from '../services/mockSheetService';
import { analyzeCodebase, checkCodeComplexity } from '../services/geminiService';
import { hashPassword } from '../services/cryptoService';

interface DashboardProps {
  currentUser: User;
  teams: Team[];
  onStartExam: (updatedTeam: Team) => void;
  onRegisterNew: () => void;
  onLogout: () => void;
}

const CARD_COLORS = [
  'from-indigo-600 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-blue-600 to-cyan-700',
  'from-violet-600 to-fuchsia-700',
  'from-sky-500 to-indigo-700',
];

export const StudentDashboard: React.FC<DashboardProps> = ({ currentUser, teams: initialTeams, onStartExam, onRegisterNew, onLogout }) => {
  const [localTeams, setLocalTeams] = useState<Team[]>(initialTeams);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeConfig, setActiveConfig] = useState<CourseConfig | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  
  // States for Code Analysis & Complexity
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isComplexityChecking, setIsComplexityChecking] = useState(false);
  const [showDosenOverride, setShowDosenOverride] = useState(false);
  const [complexityReason, setComplexityReason] = useState('');
  const [pendingFiles, setPendingFiles] = useState<CodeFile[] | null>(null);
  const [dosenPass, setDosenPass] = useState('');
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentUser.nim]);

  // Fetch config when team selected
  useEffect(() => {
    if (selectedTeam) {
      const fetchConfig = async () => {
        try {
          const config = await getCourseConfig(selectedTeam.course);
          setActiveConfig(config);
        } catch (e) {
          console.error("Failed to fetch course config for team", e);
          setActiveConfig(null);
        }
      };
      fetchConfig();
    } else {
      setActiveConfig(null);
    }
  }, [selectedTeam]);

  const fetchData = async () => {
    setLoadingHistory(true);
    setLoadingTeams(true);
    try {
      const [teamsData, historyData] = await Promise.all([
        getStudentTeams(currentUser.nim!),
        getStudentHistory(currentUser.nim!)
      ]);
      setLocalTeams(Array.isArray(teamsData) ? teamsData : []);
      setHistory(Array.isArray(historyData) ? historyData.reverse() : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
      setLoadingTeams(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    if (selectedTeam) {
        const updated = await getStudentTeams(currentUser.nim!);
        const matching = updated.find(t => String(t.team_ref).trim() === String(selectedTeam.team_ref).trim());
        if (matching) {
            setSelectedTeam({
                ...matching,
                extractedFiles: selectedTeam.extractedFiles
            });
        }
    }
    setIsRefreshing(false);
  };

  const handleFilesReady = async (files: CodeFile[]) => {
    setIsComplexityChecking(true);
    try {
      const result = await checkCodeComplexity(files);
      if (result.isSimple) {
        setPendingFiles(files);
        setComplexityReason(result.reason);
        setShowDosenOverride(true);
      } else {
        if (selectedTeam) {
          setSelectedTeam({ ...selectedTeam, extractedFiles: files });
        }
      }
    } catch (e) {
      console.error("Complexity check error", e);
      if (selectedTeam) {
        setSelectedTeam({ ...selectedTeam, extractedFiles: files });
      }
    } finally {
      setIsComplexityChecking(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!dosenPass || !pendingFiles || !selectedTeam) return;
    
    setIsVerifyingPass(true);
    try {
      const classes = await getAllClasses();
      const classInfo = classes.find((c: any) => 
        String(c.course_code).trim().toLowerCase() === String(selectedTeam.id).trim().toLowerCase() && 
        String(c.class_name).trim().toLowerCase() === String(selectedTeam.className).trim().toLowerCase()
      );
      
      if (!classInfo || !classInfo.kodedosen) {
        alert("Gagal menemukan informasi dosen pengampu kelas ini.");
        return;
      }

      const passHash = await hashPassword(dosenPass);
      // Verify lecturer password
      try {
        await loginUser({ 
          kodedosen: classInfo.kodedosen, 
          passwordHash: passHash, 
          isDosen: true 
        });
        
        // Success: override accepted
        setSelectedTeam({ ...selectedTeam, extractedFiles: pendingFiles });
        setShowDosenOverride(false);
        setDosenPass('');
        setPendingFiles(null);
      } catch (err) {
        alert("Password Dosen tidak valid. Akses ditolak.");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat verifikasi.");
    } finally {
      setIsVerifyingPass(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedTeam?.extractedFiles) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeCodebase(selectedTeam.extractedFiles);
      setAnalysisResult(result);
    } catch (e) {
      alert("Gagal menganalisa kode.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const targetNim = String(currentUser.nim).trim();
  
  const isTeamFinished = (team: Team) => {
    const member = team.members.find(m => String(m.nim).trim() === targetNim);
    return !!member?.grades;
  };

  const currentMemberData = selectedTeam?.members.find(m => String(m.nim).trim() === targetNim);
  const hasFinished = !!currentMemberData?.grades;
  const readyToStart = selectedTeam && selectedTeam.isActive && selectedTeam.extractedFiles && selectedTeam.extractedFiles.length > 0 && !hasFinished;

  const safeScore = (item: any, key: string) => {
    const upperKey = key.toUpperCase();
    const val = item[key] ?? item[upperKey] ?? 0;
    const num = Number(val);
    return isNaN(num) ? 0 : Math.round(num);
  };

  if (!selectedTeam) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in pb-20">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 transition-colors duration-300">
            <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full border-4 border-indigo-50 dark:border-slate-800 overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-800">
                    {currentUser.photoUrl ? (
                        <img src={currentUser.photoUrl} className="h-full w-full object-cover" alt={currentUser.name}/>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-indigo-300">
                            <GraduationCap size={40} />
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-2 transition-colors">Halo, {currentUser.name}!</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">NIM: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentUser.nim}</span> • Pantau status ujian kelompok Anda.</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={handleRefresh} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all">
                    <RefreshCcw size={24} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button onClick={onLogout} className="px-8 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">Keluar</button>
            </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 transition-colors">
                    <BookOpen className="text-indigo-600 dark:text-indigo-400" /> Kelompok Terdaftar
                </h3>
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {localTeams.length} KELOMPOK
                </span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                    onClick={onRegisterNew}
                    className="h-64 rounded-[40px] border-4 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-4 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group shadow-sm hover:shadow-xl"
                >
                    <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shadow-sm transition-all group-hover:scale-110">
                        <Plus size={32} />
                    </div>
                    <div className="text-center">
                        <div className="font-black text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Daftar Tim Baru</div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Satu tim per mata kuliah</p>
                    </div>
                </button>

                {loadingTeams && localTeams.length === 0 ? (
                    <div className="col-span-1 h-64 flex items-center justify-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800">
                        <Loader2 className="animate-spin text-indigo-400" size={32} />
                    </div>
                ) : localTeams.length === 0 ? (
                   <div className="h-64 rounded-[40px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <AlertCircle size={40} className="mb-4 opacity-20" />
                      <p className="font-bold italic text-sm leading-relaxed">Belum ada tim terdaftar. Silakan klik tombol "Daftar Tim Baru" untuk memulai.</p>
                   </div>
                ) : (
                    localTeams.map((t, idx) => {
                        const gradient = CARD_COLORS[idx % CARD_COLORS.length];
                        const finished = isTeamFinished(t);
                        
                        return (
                            <button 
                                key={t.team_ref} 
                                onClick={() => setSelectedTeam(t)}
                                className={`group relative h-64 rounded-[40px] shadow-xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95 text-left p-8 flex flex-col justify-between bg-gradient-to-br ${gradient}`}
                            >
                                <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <BookOpen size={200} />
                                </div>
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase">
                                            {t.id}
                                        </span>
                                        {finished ? (
                                            <div className="bg-emerald-400/30 text-white p-1.5 rounded-full shadow-lg"><CheckCircle size={20} /></div>
                                        ) : (
                                            t.isActive ? <div className="bg-white/20 p-1.5 rounded-full animate-pulse shadow-lg"><Radio size={20} className="text-white" /></div> : <Lock size={20} className="text-white/40" />
                                        )}
                                    </div>
                                    <h4 className="text-2xl font-black text-white leading-tight pr-6 drop-shadow-md">{t.course}</h4>
                                </div>

                                <div className="relative z-10">
                                    <div className="space-y-1 mb-4">
                                        <p className="text-white/90 text-[10px] font-black uppercase tracking-widest">Kelas: {t.className}</p>
                                        <p className="text-white/90 text-[10px] font-black uppercase tracking-widest">Tim: #{t.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-xl p-2.5 px-5 w-fit group-hover:bg-white transition-all">
                                        <span className={`font-black text-xs uppercase tracking-tighter ${finished ? 'text-white group-hover:text-emerald-600' : 'text-white group-hover:text-indigo-600'}`}>
                                            {finished ? 'Lihat Nilai' : (t.isActive ? 'Buka Panel' : 'Belum Aktif')}
                                        </span>
                                        <ArrowRight size={14} className={finished ? 'text-white group-hover:text-emerald-600' : 'text-white group-hover:text-indigo-600'} />
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-lg border border-slate-100 dark:border-slate-800 p-8 transition-colors">
            <h3 className="font-black text-2xl mb-8 flex items-center gap-3 text-slate-800 dark:text-white transition-colors"><History className="text-indigo-600 dark:text-indigo-400" /> Riwayat Assessment</h3>
            {loadingHistory ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Memuat data...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px]">
                    <AlertCircle size={48} className="text-slate-200 dark:text-slate-800" />
                    <p className="text-slate-400 dark:text-slate-500 font-bold italic">Belum ada riwayat ujian yang tersimpan.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {history.map((h, i) => (
                        <button 
                            key={i} 
                            onClick={() => setSelectedHistoryItem(h)}
                            className="group flex flex-col gap-4 p-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-xl text-left animate-fade-in"
                        >
                            <div className="flex justify-between items-start">
                                <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-400 group-hover:text-white transition-colors">
                                    <Star size={24} />
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none transition-colors">{safeScore(h, 'score_total')}</div>
                                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1 text-center">SKOR</div>
                                </div>
                            </div>
                            <div>
                                <div className="font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-1">{h.course || h.COURSE}</div>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1">
                                    Kelas {h.class || h.CLASS} • Tim {h.team || h.TEAM}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {selectedHistoryItem && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                                <Award size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">{selectedHistoryItem.course || selectedHistoryItem.COURSE}</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Detail Penilaian Selesai</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedHistoryItem(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                                <div className="p-3 bg-white dark:bg-slate-700 w-fit mx-auto rounded-xl shadow-sm mb-3 text-indigo-600 dark:text-indigo-400 transition-colors"><Target size={24} /></div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Skor Lisan</p>
                                <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{safeScore(selectedHistoryItem, 'score_oral')}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                                <div className="p-3 bg-white dark:bg-slate-700 w-fit mx-auto rounded-xl shadow-sm mb-3 text-purple-600 dark:text-purple-400 transition-colors"><FileCode size={24} /></div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Skor Coding</p>
                                <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{safeScore(selectedHistoryItem, 'score_code')}</p>
                            </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden transition-colors">
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <MessageSquare className="text-indigo-600 dark:text-indigo-400" size={20} />
                                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Feedback AI</h4>
                            </div>
                            <p className="text-indigo-800 dark:text-indigo-200 font-medium italic leading-relaxed relative z-10">
                                "{selectedHistoryItem.feedback || 'Pemahaman teknis yang solid pada proyek ini. Selamat atas pencapaian Anda!'}"
                            </p>
                            <Star className="absolute -bottom-4 -right-4 text-indigo-200 dark:text-indigo-900 opacity-20" size={100} />
                        </div>

                        <button 
                            onClick={() => setSelectedHistoryItem(null)}
                            className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                        >
                            TUTUP DETAIL
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in pb-20">
      {/* LOADING KOMPLEKSITAS & ANALISIS */}
      {(isAnalyzing || isComplexityChecking) && (
        <div className="fixed inset-0 z-[250] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
           <div className="relative mb-8">
              <div className="h-32 w-32 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                  {isComplexityChecking ? <ShieldCheck size={48} className="text-indigo-400 animate-pulse" /> : <SearchCode size={48} className="text-indigo-400 animate-pulse" />}
              </div>
           </div>
           <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">
             {isComplexityChecking ? "Audit Kedalaman Kode..." : "AI Sedang Mengecek Kodingan..."}
           </h3>
           <p className="text-slate-400 font-bold max-w-md">
             {isComplexityChecking ? "Memastikan project Anda memenuhi standar kompleksitas teknis yang ditetapkan." : "Menganalisa baris kode, arsitektur, dan potensi celah keamanan project Anda secara real-time."}
           </p>
        </div>
      )}

      {/* MODAL OTORISASI DOSEN (JIKA KODE TERLALU SEDERHANA) */}
      {showDosenOverride && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-in">
              <div className="bg-orange-600 p-8 text-white text-center">
                  <div className="h-20 w-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <ShieldCheck size={48} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Project Terlalu Sederhana</h3>
                  <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mt-1">Otorisasi Dosen Diperlukan</p>
              </div>
              <div className="p-10 space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 italic text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed">
                    "{complexityReason}"
                  </div>
                  
                  <div className="space-y-4">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">Silakan panggil Dosen Pengampu untuk memasukkan Password</p>
                      <div className="relative">
                        <Key className="absolute left-4 top-4 text-slate-300" size={20} />
                        <input 
                          type="password" 
                          value={dosenPass} 
                          onChange={e => setDosenPass(e.target.value)}
                          placeholder="Password Dosen..." 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 dark:text-white font-black text-center text-lg"
                        />
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <button 
                        onClick={() => { setShowDosenOverride(false); setPendingFiles(null); setDosenPass(''); }}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                      >
                        Batal / Ganti File
                      </button>
                      <button 
                        onClick={handleOverrideSubmit}
                        disabled={isVerifyingPass || !dosenPass}
                        className="flex-[2] py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-200 dark:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                      >
                        {isVerifyingPass ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Izinkan Proyek</>}
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL HASIL ANALISA */}
      {analysisResult && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-in">
              <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                  <div className="flex items-center gap-5">
                      <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center"><Sparkles size={32} /></div>
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter">Hasil Cek Kodingan</h3>
                          <p className="text-indigo-200 text-xs font-bold tracking-widest">AI CODE AUDIT REPORT</p>
                      </div>
                  </div>
                  <button onClick={() => setAnalysisResult(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                      <X size={28} />
                  </button>
              </div>
              <div className="p-10 overflow-y-auto max-h-[70vh] no-scrollbar">
                  <div className="prose prose-indigo dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                    <div className="whitespace-pre-wrap font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/### (.*?)/g, '<h3 class="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-6 mb-2">$1</h3>') }}></div>
                  </div>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button onClick={() => setAnalysisResult(null)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">MENGERTI, TERIMA KASIH</button>
              </div>
           </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-lg w-full overflow-hidden p-10 text-center animate-scale-in border border-slate-100 dark:border-slate-800">
              <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-inner">
                <HelpCircle size={56} />
              </div>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tighter transition-colors">Mulai Assessment?</h3>
              <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 leading-relaxed font-medium transition-colors">AI akan menganalisa kodingan tim <strong>{selectedTeam.course}</strong> Anda secara real-time.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Batal</button>
                <button onClick={() => { setShowConfirm(false); onStartExam(selectedTeam); }} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl text-xl shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">MULAI SEKARANG</button>
              </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col md:row justify-between items-center gap-6 transition-colors">
        <div className="flex items-center gap-5">
            <button 
                onClick={() => setSelectedTeam(null)}
                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
            >
                <ChevronDown className="rotate-90" />
            </button>
            <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight transition-colors">{selectedTeam.course}</h2>
                <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">Kelas: <span className="text-indigo-600 dark:text-indigo-400">{selectedTeam.className}</span></span>
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">Tim: <span className="text-indigo-600 dark:text-indigo-400">#{selectedTeam.name}</span></span>
                </div>
            </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="p-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <RefreshCcw size={24} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setSelectedTeam(null)} className="px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-md border dark:border-slate-700">Kembali ke Beranda</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-10">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-lg border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-2xl flex items-center gap-3 text-slate-800 dark:text-white"><Users className="text-indigo-600 dark:text-indigo-400" size={32} /> Anggota Kelompok</h3>
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">TIM #{selectedTeam.name}</span>
              </div>
              <div className="space-y-4">
                 {selectedTeam.members.map((m, idx) => (
                   <div key={idx} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${String(m.nim).trim() === targetNim ? 'ring-4 ring-indigo-500/10 dark:ring-indigo-400/10 border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-900/10' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                      <div className="flex items-center gap-4">
                         <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                            <GraduationCap size={24} className="text-slate-300 dark:text-slate-500" />
                         </div>
                         <div>
                            <div className="font-black text-lg text-slate-800 dark:text-white leading-tight transition-colors">{m.name}</div>
                            <div className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">{String(m.nim).trim() === targetNim ? 'SAYA (Dashboard)' : m.nim}</div>
                         </div>
                      </div>
                      {m.grades ? (
                        <div className="text-right bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                          <span className="block text-emerald-600 dark:text-emerald-400 font-black text-2xl leading-none">{m.grades.scoreTotal}</span>
                          <span className="text-[8px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-tighter">SELESAI</span>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-600 italic font-black text-[9px] uppercase">Antrian</div>
                      )}
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-lg border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="font-black text-2xl mb-2 flex items-center gap-3 text-slate-800 dark:text-white transition-colors"><FileCode className="text-indigo-600 dark:text-indigo-400" size={32} /> Project Source Code</h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 flex gap-3 items-start">
                  <Info className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" size={20} />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed transition-colors">
                    Unggah file ZIP proyek Anda. AI akan merancang soal berdasarkan baris kode yang Anda tulis sendiri.
                  </p>
              </div>
              
              {!selectedTeam.isActive ? (
                <div className="p-16 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[40px] bg-slate-50 dark:bg-slate-800/20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center transition-colors">
                    <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm"><Lock size={40} className="text-slate-200 dark:text-slate-700" /></div>
                    <p className="text-xl font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Status: Belum Aktif</p>
                    <p className="text-sm font-medium mt-1">Sesi ujian tim ini belum diaktifkan oleh dosen pengampu.</p>
                </div>
              ) : hasFinished ? (
                 <div className="p-16 border-4 border-dashed border-emerald-100 dark:border-emerald-900/30 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/10 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 text-center transition-colors">
                    <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-md"><CheckCircle size={40} className="text-emerald-500 dark:text-emerald-400" /></div>
                    <p className="text-xl font-black uppercase tracking-tighter">Assessment Selesai!</p>
                    <p className="text-sm font-medium mt-1">Nilai Anda telah tersimpan. Lihat di riwayat assessment.</p>
                </div>
              ) : (
                !selectedTeam.extractedFiles ? (
                    <FileUpload 
                      onFilesExtracted={handleFilesReady} 
                      allowedExtensions={activeConfig?.languagePriority}
                    />
                 ) : (
                    <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 text-green-700 dark:text-emerald-400 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col gap-6 shadow-inner transition-colors">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                           <div className="h-16 w-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-sm transition-colors"><CheckCircle size={32} /></div>
                           <div>
                               <div className="font-black text-2xl leading-none">ZIP Berhasil Dibaca</div>
                               <div className="text-sm font-bold opacity-70 mt-1 uppercase tracking-widest">{selectedTeam.extractedFiles.length} File Kodingan Terdeteksi</div>
                           </div>
                          </div>
                          <button 
                           onClick={() => setSelectedTeam({...selectedTeam, extractedFiles: undefined})} 
                           className="p-3 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                              <X size={20} />
                          </button>
                       </div>
                       
                       <button 
                        onClick={handleRunAnalysis}
                        className="w-full py-4 bg-white/40 dark:bg-emerald-800/30 backdrop-blur-md rounded-2xl border border-emerald-200 dark:border-emerald-700 flex items-center justify-center gap-3 font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all shadow-sm uppercase tracking-widest text-sm"
                       >
                          <SearchCode size={20} /> Cek Kodingan dengan AI
                       </button>
                    </div>
                 )
              )}
           </div>
        </div>

        <div className="flex flex-col gap-10">
            <div className={`p-10 rounded-[48px] text-white text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px] transition-all duration-500 ${readyToStart ? 'bg-indigo-600' : 'bg-slate-800 dark:bg-slate-900/80 opacity-95'}`}>
               <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                   <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-white blur-[150px] rounded-full"></div>
               </div>
               
               <div className="relative z-10 w-full">
                   <h3 className="text-2xl font-black mb-10 uppercase tracking-widest opacity-60">Status Assessment</h3>
                   
                   {!selectedTeam.isActive ? (
                     <div className="mb-12">
                        <div className="h-28 w-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={80} className="text-red-400" /></div>
                        <p className="text-2xl font-black text-red-400 uppercase tracking-tight">Sesi Belum Aktif</p>
                     </div>
                   ) : hasFinished ? (
                     <div className="mb-12">
                        <div className="h-28 w-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={80} className="text-emerald-400" /></div>
                        <p className="text-2xl font-black text-emerald-400 uppercase tracking-tight">Sudah Selesai</p>
                     </div>
                   ) : (
                     <div className="mb-12">
                        <div className="h-28 w-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6"><Play size={80} className="text-emerald-400 fill-emerald-400" /></div>
                        <p className="text-2xl font-black text-emerald-400 uppercase tracking-tight">Siap Untuk Tes</p>
                     </div>
                   )}

                   <button 
                     disabled={!readyToStart}
                     onClick={() => setShowConfirm(true)}
                     className={`w-full py-7 rounded-[32px] font-black text-2xl flex items-center justify-center gap-4 transition-all transform active:scale-95 shadow-2xl ${readyToStart ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/40 dark:shadow-none' : 'bg-slate-700 dark:bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                   >
                     {selectedTeam.isActive ? (hasFinished ? 'UJIAN SELESAI' : (readyToStart ? 'MULAI SEKARANG' : 'LENGKAPI ZIP')) : 'TERKUNCI'}
                     {readyToStart && <ArrowRightCircle className="ml-2" size={32} />}
                   </button>
                   
                   {!readyToStart && selectedTeam.isActive && !hasFinished && (
                       <p className="mt-8 text-xs font-bold text-slate-400 italic">Harap unggah file ZIP kodingan kelompok Anda terlebih dahulu.</p>
                   )}
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-lg border border-slate-100 dark:border-slate-800 p-8 flex-1 overflow-hidden flex flex-col transition-colors">
                <h3 className="font-black text-2xl mb-8 flex items-center gap-3 text-slate-800 dark:text-white transition-colors"><Star className="text-indigo-600 dark:text-indigo-400" /> Hasil Penilaian</h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                    {history.filter(h => String(h.course_id || h.ID || "").trim() === String(selectedTeam.id).trim()).length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl">
                            <AlertCircle size={40} className="text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-300 dark:text-slate-700 font-black uppercase text-[10px] tracking-widest">Belum ada nilai tersimpan</p>
                        </div>
                    ) : (
                        history.filter(h => String(h.course_id || h.ID || "").trim() === String(selectedTeam.id).trim()).map((h, i) => (
                            <button 
                                key={i} 
                                onClick={() => setSelectedHistoryItem(h)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all group shadow-sm"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-yellow-500 shadow-sm group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <Award size={28} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Assessment Tuntas</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1">Dihasilkan oleh AI</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none transition-colors">{safeScore(h, 'score_total')}</div>
                                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1 text-center">SKOR</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
