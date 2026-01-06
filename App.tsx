
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, User, Team, CourseConfig, Question } from './types';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { DosenDashboard } from './components/DosenDashboard';
import { TeamRegistration } from './components/TeamRegistration';
import { StudentDashboard } from './components/StudentDashboard';
import { ExamRunner } from './components/ExamRunner'; 
import { EditProfile } from './components/EditProfile';
import { LandingPage } from './components/LandingPage';
import { LoadingOverlay, Notification } from './components/SharedUI';
import { getStudentTeams, submitExamResults, getCourseConfig } from './services/mockSheetService';
import { generateExamContent, stopAllAudio, initAudioContext } from './services/geminiService';
import { 
  Layout, UserCircle, LogOut, Settings, ChevronDown, 
  Sun, Moon
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [studentTeams, setStudentTeams] = useState<Team[]>([]);
  const [step, setStep] = useState<AppStep>('LANDING');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [notification, setNotification] = useState({ show: false, type: 'INFO' as 'SUCCESS' | 'ERROR' | 'INFO', title: '', message: '' });

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [activeStudent, setActiveStudent] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examConfig, setExamConfig] = useState<CourseConfig | null>(null);
  const [currentExamTeam, setCurrentExamTeam] = useState<Team | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setIsProfileMenuOpen(false);
    };
    
    const handleFirstGesture = () => {
      initAudioContext();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const showNotify = (type: 'SUCCESS' | 'ERROR' | 'INFO', title: string, message: string) => 
    setNotification({ show: true, type, title, message });

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    initAudioContext(); 
    if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'DOSEN') {
      setStep('ADMIN_DASHBOARD');
    } else {
      setIsLoading(true);
      setLoadingMsg('Memeriksa status akademik...');
      try {
        const teams = await getStudentTeams(loggedInUser.nim!);
        setStudentTeams(teams);
        setStep('STUDENT_DASHBOARD');
      } catch (err: any) {
        showNotify('ERROR', 'Gagal Memuat Data', err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogout = () => {
    stopAllAudio();
    setUser(null);
    setStep('LANDING');
  };

  const startExam = async (targetTeam: Team) => {
    if (!targetTeam?.extractedFiles || !user) return showNotify('ERROR', 'File Belum Siap', 'File project belum siap.');
    
    setIsLoading(true);
    setLoadingMsg('AI sedang menganalisa project Anda...');
    try {
      const config = await getCourseConfig(targetTeam.course);
      setExamConfig(config);
      const usedSnippets: string[] = [];
      targetTeam.members.forEach(m => { if (m.grades && (m.grades as any).usedSnippets) usedSnippets.push(...(m.grades as any).usedSnippets); });
      const qs = await generateExamContent(targetTeam.extractedFiles, user.name, config, usedSnippets);
      if (qs.length === 0) throw new Error("AI gagal menghasilkan soal.");
      setQuestions(qs);
      setCurrentExamTeam(targetTeam);
      setActiveStudent(user);
      setStep('EXAM_RUNNER');
    } catch (e: any) {
      showNotify('ERROR', 'Gagal Memuat Soal', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamFinish = async (results: any[]) => {
    if(!activeStudent || !currentExamTeam) return;
    setIsLoading(true);
    setLoadingMsg('Menyimpan hasil ujian...');
    try {
      await submitExamResults(activeStudent.nim!, currentExamTeam.id, currentExamTeam.course, currentExamTeam.name, currentExamTeam.className, results);
      showNotify('SUCCESS', 'Berhasil', 'Nilai Anda telah disimpan!');
      const updatedTeams = await getStudentTeams(activeStudent.nim!);
      setStudentTeams(updatedTeams);
      setStep('STUDENT_DASHBOARD');
    } catch (e: any) {
      showNotify('ERROR', 'Gagal Simpan Nilai', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (step === 'LANDING' && !user) return <LandingPage onStart={() => setStep('AUTH')} />;
    
    if (!user || step === 'AUTH') return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
        <Auth onLogin={handleLogin} onNotify={showNotify} onLoading={setIsLoading} />
      </div>
    );

    switch (step) {
      case 'ADMIN_DASHBOARD': 
        return user.role === 'ADMIN' ? <AdminDashboard currentUser={user} /> : <DosenDashboard currentUser={user} />;
      case 'STUDENT_DASHBOARD': return <StudentDashboard currentUser={user} teams={studentTeams} onStartExam={startExam} onRegisterNew={() => setStep('TEAM_REGISTER')} onLogout={handleLogout} />;
      case 'TEAM_REGISTER': return <TeamRegistration currentUser={user} onSuccess={() => setStep('STUDENT_DASHBOARD')} onCancel={() => setStep('STUDENT_DASHBOARD')} onNotify={showNotify} onLoading={setIsLoading} />;
      case 'EXAM_RUNNER': return <ExamRunner questions={questions} config={examConfig!} onFinish={handleExamFinish} />;
      default: return <LandingPage onStart={() => setStep('AUTH')} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <LoadingOverlay show={isLoading} message={loadingMsg} />
      <Notification {...notification} onClose={() => setNotification(p => ({ ...p, show: false }))} />

      <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm backdrop-blur-md">
        <div className="w-full px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('LANDING')}>
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md"><Layout size={24} strokeWidth={2.5} /></div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Uji Coding<span className="text-indigo-600">Mu</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </button>
            {user && (
              <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-6 relative" ref={profileMenuRef}>
                 <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 p-1.5 pr-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-50 border-2 border-indigo-100">
                        {user.photoUrl ? <img src={user.photoUrl} className="h-full w-full object-cover" alt={user.name} /> : <UserCircle size={32} className="text-indigo-400" />}
                    </div>
                    <div className="text-left hidden md:block">
                        <div className="text-sm font-black text-slate-800 dark:text-white">{user.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          {user.role === 'ADMIN' ? 'Super Administrator' : (user.role === 'DOSEN' ? `Dosen (${user.kodedosen})` : user.nim)}
                        </div>
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {isProfileMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden py-3 z-[60] animate-fade-in">
                        <button onClick={() => { setShowEditProfile(true); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-4 px-5 py-4 text-sm font-black hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors uppercase">
                            <Settings size={20} /> Edit Profil
                        </button>
                        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors uppercase">
                            <LogOut size={20} /> Keluar
                        </button>
                    </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>
      
      <footer className="py-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">ai.masyanto.com - 2025</p>
      </footer>
      
      {showEditProfile && user && (
        <EditProfile 
            user={user} 
            onClose={() => setShowEditProfile(false)} 
            onUpdate={(u) => setUser(u)} 
            onNotify={showNotify} 
        />
      )}
    </div>
  );
}
