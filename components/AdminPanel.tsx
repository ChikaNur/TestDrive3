
import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllTeams, updateTeamStatus, getMatakulFull, saveMatakul, 
  deleteMatakul, getAllStudents, deleteStudent, getUjianRekap,
  getCourseList, updateAdminPassword,
  getAllClasses, saveClass, updateClassStatus, deleteClass
} from '../services/mockSheetService';
import { Team, User, CourseItem } from '../types';
import { 
  Search, Loader2, RefreshCcw, Users, 
  BookOpen, GraduationCap, BarChart3, Settings, 
  Plus, Edit2, Trash2, Save, Lock,
  X, ToggleLeft, ToggleRight,
  Layout, Activity, Award, Clock, TrendingUp, Monitor, Smartphone, Terminal, Layers,
  ChevronRight, Filter, Code, School, ListChecks,
  Phone, UserCheck, Cpu, Box, Globe, Smartphone as MobileIcon, MessageSquareQuote,
  Zap, BrainCircuit, ShieldAlert, Key, Eye, EyeOff
} from 'lucide-react';

interface Props {
  currentUser: User;
}

type AdminTab = 'DASHBOARD' | 'TEAMS' | 'COURSES' | 'CLASSES' | 'STUDENTS' | 'RESULTS' | 'SETTINGS';

const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-44 transition-transform hover:scale-[1.02]">
    <div className="flex justify-between items-center">
      <div className={`p-3 rounded-2xl ${bg} ${color}`}><Icon size={24} /></div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Status</span>
    </div>
    <div>
      <p className="text-4xl font-black text-slate-800 dark:text-white">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
    </div>
  </div>
);

export const AdminPanel: React.FC<Props> = ({ currentUser }) => {
  const isDosen = currentUser.role === 'DOSEN';
  const isAdmin = currentUser.role === 'ADMIN';
  
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [studentsData, setStudentsData] = useState<User[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [matakulData, setMatakulData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClass, setNewClass] = useState({ courseCode: '', className: '' });
  
  const [newAdminPass, setNewAdminPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      // Jika Admin, kodedosen dikirim undefined (tanpa filter di GAS)
      const kodedosen = isDosen ? currentUser.kodedosen : undefined;
      const [t, s, m, r, c] = await Promise.all([
        getAllTeams(kodedosen), 
        getAllStudents(), 
        getMatakulFull(kodedosen),
        getUjianRekap(kodedosen),
        getAllClasses(kodedosen)
      ]);
      
      setTeamsData(t || []);
      setStudentsData(s || []);
      setMatakulData(m || []);
      setResultsData(r || []);
      setClassesData(c || []);

      if (activeTab === 'TEAMS') setData(t || []);
      else if (activeTab === 'COURSES') setData(m || []);
      else if (activeTab === 'CLASSES') setData(c || []);
      else if (activeTab === 'STUDENTS') setData(s || []);
      else if (activeTab === 'RESULTS') setData(r || []);
      else setData([]);
    } catch (e) { 
        console.error("Load failed:", e); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { loadTabContent(); }, [activeTab]);

  const dashboardStats = useMemo(() => {
    const totalStudents = isAdmin ? studentsData.length : Array.from(new Set(teamsData.flatMap(t => t.members.map(m => m.nim)))).length;
    const avgScore = resultsData.length ? Math.round(resultsData.reduce((acc, curr) => acc + (Number(curr.score_total || 0)), 0) / resultsData.length) : 0;
    
    const perfData = matakulData.map(m => {
        const cRes = resultsData.filter(r => String(r.course_id || "").trim().toLowerCase() === String(m.code || "").trim().toLowerCase());
        const avg = cRes.length ? Math.round(cRes.reduce((a, b) => a + Number(b.score_total || 0), 0) / cRes.length) : 0;
        return { name: m.name, avg, count: cRes.length, code: m.code };
    }).filter(c => c.count > 0).sort((a, b) => b.avg - a.avg).slice(0, 6);

    return { totalStudents, totalTeams: teamsData.length, activeTeams: teamsData.filter(t => t.isActive).length, avgScore, perf: perfData };
  }, [studentsData, teamsData, resultsData, matakulData, isAdmin]);

  const filteredData = useMemo(() => {
    let items = Array.isArray(data) ? [...data] : [];
    if (!searchTerm) return items;
    return items.filter(item => JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, searchTerm]);

  const PROJECT_TYPES = ["WEB", "MOBILE", "GENERAL"];
  const UI_FRAMEWORKS = ["TANPA FRAMEWORK", "BOOTSTRAP", "TAILWIND", "NATIVE", "MATERIAL UI", "VUE", "FLUTTER"];
  const APP_FRAMEWORKS = ["TANPA FRAMEWORK", "FLUTTER", "REACT NATIVE", "LARAVEL", "CODEIGNITER", "REACT JS", "NEXT JS", "SPRING BOOT", "EXPRESS JS"];

  const handleUpdateAdminPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass) return;
    if (confirm('Ubah password administrator?')) {
      try {
        await updateAdminPassword(newAdminPass);
        alert('Password admin berhasil diperbarui.');
        setNewAdminPass('');
      } catch (e: any) { alert(e.message); }
    }
  };

  return (
    <div className="flex h-[calc(100vh-68px)] bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-2xl">
        <nav className="flex-1 p-6 space-y-3 pt-10">
           {[
             { id: 'DASHBOARD', label: 'Dashboard', icon: Layout },
             { id: 'TEAMS', label: 'Kelola Tim', icon: Users },
             { id: 'COURSES', label: 'Mata Kuliah', icon: BookOpen },
             { id: 'CLASSES', label: 'Kelola Kelas', icon: School },
             { id: 'STUDENTS', label: 'Mahasiswa', icon: GraduationCap, hide: isDosen },
             { id: 'RESULTS', label: 'Hasil Ujian', icon: BarChart3 },
             { id: 'SETTINGS', label: 'Pengaturan', icon: Settings, hide: isDosen },
           ].filter(it => !it.hide).map(item => (
             <button
               key={item.id}
               onClick={() => { setActiveTab(item.id as AdminTab); setSearchTerm(''); }}
               className={`w-full flex items-center gap-5 px-6 py-4 rounded-[24px] font-black transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
             >
               <item.icon size={22} />
               <span className="text-sm uppercase tracking-widest">{item.label}</span>
             </button>
           ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-8 flex justify-between items-center transition-colors">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
               {isAdmin ? 'Admin Console' : `Dosen: ${currentUser.name}`}
            </h2>
            <div className="flex gap-4">
               <div className="relative">
                  <Search className="absolute left-4 top-3 text-slate-400" size={20} />
                  <input type="text" placeholder="Cari data..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold w-64 outline-none dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all"/>
               </div>
               <button onClick={loadTabContent} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors">
                  <RefreshCcw size={22} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                <Loader2 size={40} className="animate-spin text-indigo-500" /><span>Sinkronisasi Data...</span>
             </div>
           ) : (
             <div className="animate-fade-in space-y-8">
                {activeTab === 'DASHBOARD' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard label={isAdmin ? "Total Mahasiswa" : "Mhs Ampu"} value={dashboardStats.totalStudents} icon={GraduationCap} color="text-indigo-600" bg="bg-indigo-50" />
                      <StatCard label="Tim Terdaftar" value={dashboardStats.totalTeams} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
                      <StatCard label="Mata Kuliah" value={matakulData.length} icon={BookOpen} color="text-rose-600" bg="bg-rose-50" />
                      <StatCard label="Skor Rata-rata" value={dashboardStats.avgScore} icon={Award} color="text-amber-600" bg="bg-amber-50" />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 p-10 bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
                          <h3 className="text-xl font-black mb-10 flex items-center gap-3"><TrendingUp className="text-indigo-600" /> Performa Mata Kuliah</h3>
                          <div className="h-64 flex items-end justify-around px-4 border-b border-slate-100 dark:border-slate-800 pb-2 gap-4">
                             {dashboardStats.perf.length > 0 ? dashboardStats.perf.map(cp => (
                                <div key={cp.code} className="w-full max-w-[60px] flex flex-col items-center group relative h-full justify-end">
                                   <div style={{ height: `${cp.avg}%` }} className="w-full bg-indigo-600 rounded-t-xl transition-all shadow-lg shadow-indigo-500/20 group-hover:bg-indigo-400"></div>
                                   <div className="absolute -bottom-14 w-32 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter line-clamp-2">{cp.name}</div>
                                </div>
                             )) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Belum Ada Data Penilaian</div>
                             )}
                          </div>
                          <div className="h-14"></div>
                       </div>
                       <div className="p-10 bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                          <h3 className="text-xl font-black mb-8 flex items-center gap-3 shrink-0"><Clock className="text-rose-600" /> Ujian Terbaru</h3>
                          <div className="space-y-4 overflow-y-auto no-scrollbar flex-1">
                             {resultsData.length > 0 ? resultsData.slice(0, 8).map((r, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
                                   <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-slate-800 dark:text-white truncate uppercase">{r.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 truncate uppercase">{r.course}</p>
                                   </div>
                                   <div className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-xl">{r.score_total}</div>
                                </div>
                             )) : (
                                <div className="text-center py-10 text-slate-300 text-[10px] font-black uppercase tracking-widest italic">Belum Ada Data</div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'COURSES' && (
                  <div className="space-y-6">
                    {isAdmin && (
                      <div className="flex justify-end">
                        <button onClick={() => setEditingCourse({ code: '', name: '', lang_priority: '', project_type: 'GENERAL', ui_framework: 'TANPA FRAMEWORK', app_framework: 'TANPA FRAMEWORK', q_easy: 1, q_medium: 1, q_hard: 1, q_code_easy: 1, q_code_medium: 1, q_code_hard: 1, time_oral: 5, time_code: 15, weight_oral: 50, weight_code: 50, ai_detail_level: 2 })} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl transition-all uppercase tracking-widest hover:bg-indigo-700 shadow-indigo-600/20 active:scale-95">
                          <Plus size={20} /> TAMBAH MATAKULIAH
                        </button>
                      </div>
                    )}
                    <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                             <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-8">Mata Kuliah</th><th className="p-8">Tipe Project</th><th className="p-8">Kekritisan AI</th><th className="p-8 text-right">Aksi</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {filteredData.map(c => (
                               <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-8">
                                    <div className="font-black text-slate-800 dark:text-white uppercase">{c.name}</div>
                                    <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{c.code}</div>
                                  </td>
                                  <td className="p-8 text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                     {c.project_type === 'WEB' ? <Globe size={14} /> : (c.project_type === 'MOBILE' ? <MobileIcon size={14} /> : <Box size={14} />)}
                                     {c.project_type || 'GENERAL'}
                                  </td>
                                  <td className="p-8">
                                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${Number(c.ai_detail_level) === 3 ? 'bg-rose-100 text-rose-600' : (Number(c.ai_detail_level) === 2 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600')}`}>
                                          <BrainCircuit size={14} />
                                          {Number(c.ai_detail_level) === 3 ? 'Expert' : (Number(c.ai_detail_level) === 2 ? 'Standard' : 'Basic')}
                                      </div>
                                  </td>
                                  <td className="p-8 text-right flex justify-end gap-2">
                                     <button onClick={() => setEditingCourse(c)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                                     {isAdmin && (
                                       <button onClick={() => { if(confirm(`Hapus matakuliah ${c.name}?`)) deleteMatakul(c.code).then(loadTabContent); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                     )}
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  </div>
                )}

                {activeTab === 'CLASSES' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <button onClick={() => setShowAddClass(true)} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl transition-all uppercase tracking-widest hover:bg-indigo-700 active:scale-95 shadow-indigo-600/20">
                        <Plus size={20} /> TAMBAH KELAS
                      </button>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                             <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-8">Mata Kuliah</th><th className="p-8">Nama Kelas</th><th className="p-8 text-center">Status</th><th className="p-8 text-right">Aksi</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {filteredData.map((c, i) => (
                               <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-8 font-black text-slate-800 dark:text-white uppercase text-sm">
                                    {matakulData.find(m => String(m.code).toLowerCase() === String(c.course_code).toLowerCase())?.name || c.course_code}
                                  </td>
                                  <td className="p-8 font-black text-indigo-600 uppercase tracking-widest">{c.class_name}</td>
                                  <td className="p-8 text-center">
                                     <button onClick={() => updateClassStatus(c.course_code, c.class_name, parseInt(c.is_active) === 0).then(loadTabContent)} 
                                        className={`px-5 py-2 rounded-2xl font-black text-[10px] transition-all flex items-center gap-2 mx-auto ${parseInt(c.is_active) === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {parseInt(c.is_active) === 1 ? <><ToggleRight size={24} /> BUKA</> : <><ToggleLeft size={24} /> TUTUP</>}
                                     </button>
                                  </td>
                                  <td className="p-8 text-right">
                                     <button onClick={() => { if(window.confirm('Hapus kelas?')) deleteClass(c.course_code, c.class_name).then(loadTabContent); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  </div>
                )}

                {activeTab === 'TEAMS' && (
                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                             <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-8">Mata Kuliah</th><th className="p-8">Kelompok</th><th className="p-8">Kelas</th><th className="p-8 text-center">Status Ujian</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {filteredData.map((t: Team) => (
                               <tr key={t.team_ref} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-8 font-black text-slate-800 dark:text-white uppercase text-sm">{t.course}</td>
                                  <td className="p-8">
                                    <div className="font-black text-indigo-600">Tim #{t.name}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase italic line-clamp-1">{t.projectTitle}</div>
                                  </td>
                                  <td className="p-8 font-bold text-slate-400 uppercase tracking-widest text-[10px]">{t.className}</td>
                                  <td className="p-8 text-center">
                                     <button onClick={() => updateTeamStatus(t.team_ref, !t.isActive).then(loadTabContent)} 
                                        className={`px-6 py-2 rounded-2xl font-black text-[10px] transition-all flex items-center gap-2 mx-auto ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {t.isActive ? <><ToggleRight size={24} /> AKTIF</> : <><ToggleLeft size={24} /> NON-AKTIF</>}
                                     </button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                  </div>
                )}

                {activeTab === 'STUDENTS' && (
                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                             <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-8">Identitas Mahasiswa</th><th className="p-8">Kontak</th><th className="p-8 text-right">Aksi</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {filteredData.map((s, i) => (
                               <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-8 flex items-center gap-4">
                                     <div className="h-12 w-12 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                                        {s.photoUrl ? <img src={s.photoUrl} className="h-full w-full object-cover" /> : <GraduationCap className="h-full w-full p-2 text-slate-300" />}
                                     </div>
                                     <div>
                                        <div className="font-black text-slate-800 dark:text-white uppercase">{s.name}</div>
                                        <div className="text-[10px] font-bold text-indigo-600 uppercase">{s.nim}</div>
                                     </div>
                                  </td>
                                  <td className="p-8 text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                     <Phone size={14} className="text-emerald-500" /> {s.nowa || '-'}
                                  </td>
                                  <td className="p-8 text-right">
                                     <button onClick={() => { if(confirm(`Hapus data mahasiswa ${s.name}?`)) deleteStudent(s.nim).then(loadTabContent); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                  </div>
                )}

                {activeTab === 'RESULTS' && (
                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                             <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-8">Mahasiswa</th><th className="p-8">Mata Kuliah</th><th className="p-8">Kelas / Tim</th><th className="p-8 text-center">Skor Akhir</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {filteredData.map((r, i) => (
                               <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-8">
                                    <div className="font-black text-slate-800 dark:text-white uppercase text-sm">{r.name}</div>
                                    <div className="text-[9px] font-bold text-slate-400">{r.nim}</div>
                                  </td>
                                  <td className="p-8 font-black text-slate-500 uppercase text-xs">{r.course}</td>
                                  <td className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas {r.class} / #{r.team}</td>
                                  <td className="p-8 text-center">
                                     <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl font-black text-xl shadow-sm">{r.score_total}</div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                  </div>
                )}

                {activeTab === 'SETTINGS' && isAdmin && (
                  <div className="max-w-2xl mx-auto pt-10">
                    <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-xl border border-slate-100 dark:border-slate-800 p-12 space-y-10">
                       <div className="text-center">
                          <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Key size={40} /></div>
                          <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Pengaturan Sistem</h3>
                          <p className="text-sm text-slate-400 font-medium">Ubah kredensial akses administrator.</p>
                       </div>
                       
                       <form onSubmit={handleUpdateAdminPass} className="space-y-6">
                          <div className="space-y-3">
                             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Administrator Baru</label>
                             <div className="relative">
                                <input 
                                  type={showPass ? "text" : "password"} 
                                  value={newAdminPass} 
                                  onChange={e => setNewAdminPass(e.target.value)}
                                  className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl font-black outline-none dark:text-white pr-16"
                                  placeholder="Password Baru"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-6 top-5 text-slate-300">
                                   {showPass ? <EyeOff size={22} /> : <Eye size={22} />}
                                </button>
                             </div>
                          </div>
                          <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 shadow-xl uppercase tracking-widest">SIMPAN PERUBAHAN</button>
                       </form>
                    </div>
                  </div>
                )}
             </div>
           )}
        </div>
      </main>

      {/* MODAL EDIT/ADD MATAKULIAH */}
      {editingCourse && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[64px] shadow-2xl w-full max-w-7xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-in">
               <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg"><BookOpen size={32} /></div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none mb-1">Konfigurasi Matakuliah</h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">ID: {editingCourse.code || 'BARU'}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingCourse(null)} className="p-4 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={32} /></button>
               </div>
               
               <form onSubmit={(e) => { e.preventDefault(); saveMatakul(editingCourse).then(() => { setEditingCourse(null); loadTabContent(); }); }} className="p-12 space-y-12 max-h-[80vh] overflow-y-auto no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Matakuliah</label>
                        <input type="text" required value={editingCourse.code} onChange={e => setEditingCourse({...editingCourse, code: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl font-black outline-none dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Matakuliah</label>
                        <input type="text" required value={editingCourse.name} onChange={e => setEditingCourse({...editingCourse, name: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl font-black outline-none dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Bahasa Prioritas (CSV)</label>
                        <input type="text" required placeholder="php, js, html" value={editingCourse.lang_priority} onChange={e => setEditingCourse({...editingCourse, lang_priority: e.target.value})} className="w-full p-5 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-800 rounded-3xl font-black outline-none dark:text-white focus:border-indigo-500 transition-all shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="p-10 bg-slate-50 dark:bg-slate-800/40 rounded-[48px] border border-slate-100 dark:border-slate-800 space-y-8">
                        <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-3 mb-4"><Cpu size={24} className="text-indigo-600" /> Spesifikasi Proyek</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Project</label>
                                <select value={editingCourse.project_type || "GENERAL"} onChange={e => setEditingCourse({...editingCourse, project_type: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none">
                                    {PROJECT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">UI Framework</label>
                                <select value={editingCourse.ui_framework || "TANPA FRAMEWORK"} onChange={e => setEditingCourse({...editingCourse, ui_framework: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none">
                                    {UI_FRAMEWORKS.map(fw => <option key={fw} value={fw}>{fw}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">App Framework</label>
                                <select value={editingCourse.app_framework || "TANPA FRAMEWORK"} onChange={e => setEditingCourse({...editingCourse, app_framework: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none">
                                    {APP_FRAMEWORKS.map(fw => <option key={fw} value={fw}>{fw}</option>)}
                                </select>
                            </div>
                        </div>
                     </div>

                     <div className="p-10 bg-indigo-50/20 dark:bg-indigo-900/10 rounded-[48px] border border-indigo-100 dark:border-indigo-800 space-y-8">
                        <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-3 mb-4"><BrainCircuit size={24} /> AI Detail Level (Kekritisan)</h4>
                        <div className="grid grid-cols-3 gap-6">
                            {[
                                { val: 1, label: 'Basic', icon: Zap, color: 'text-indigo-500', desc: 'Soal mendasar, feedback ringan' },
                                { val: 2, label: 'Standard', icon: Activity, color: 'text-amber-500', desc: 'Analisa logika menengah' },
                                { val: 3, label: 'Expert', icon: ShieldAlert, color: 'text-rose-500', desc: 'Kritis, koding mendalam' }
                            ].map(level => (
                                <button 
                                    key={level.val}
                                    type="button"
                                    onClick={() => setEditingCourse({...editingCourse, ai_detail_level: level.val})}
                                    className={`p-6 rounded-3xl flex flex-col items-center gap-3 transition-all border-2 ${Number(editingCourse.ai_detail_level) === level.val ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105' : 'bg-transparent border-transparent grayscale opacity-50'}`}
                                >
                                    <level.icon size={28} className={level.color} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${level.color}`}>{level.label}</span>
                                    <p className="text-[8px] font-bold text-slate-400 text-center leading-tight">{level.desc}</p>
                                </button>
                            ))}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="p-10 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[48px] border border-indigo-100 dark:border-indigo-800 space-y-6">
                        <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-3"><ListChecks size={24}/> Pengaturan Uji Lisan</h4>
                        <div className="grid grid-cols-3 gap-4">
                           {[{id:'q_easy',label:'MUDAH',color:'text-emerald-500'},{id:'q_medium',label:'SEDANG',color:'text-amber-500'},{id:'q_hard',label:'SULIT',color:'text-rose-500'}].map(f => (
                              <div key={f.id} className="space-y-2 text-center">
                                <label className={`text-[9px] font-black uppercase tracking-widest block ${f.color}`}>{f.label}</label>
                                <input type="number" min="0" value={editingCourse[f.id] || 0} onChange={e => setEditingCourse({...editingCourse, [f.id]: parseInt(e.target.value) || 0})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl text-center font-black outline-none border-none dark:text-white shadow-sm" />
                              </div>
                           ))}
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquareQuote size={14}/> Instruksi Lisan Khusus (Prompt AI)</label>
                           <textarea 
                             value={editingCourse.instr_oral || ""} 
                             onChange={e => setEditingCourse({...editingCourse, instr_oral: e.target.value})}
                             placeholder="Contoh: Fokuskan pertanyaan pada penggunaan hooks dan state management..."
                             className="w-full p-5 bg-white dark:bg-slate-800 rounded-3xl text-sm font-bold outline-none dark:text-white border-none shadow-sm min-h-[100px] resize-none"
                           />
                        </div>
                     </div>
                     
                     <div className="p-10 bg-purple-50/30 dark:bg-purple-900/10 rounded-[48px] border border-purple-100 dark:border-purple-800 space-y-6">
                        <h4 className="text-sm font-black text-purple-600 uppercase tracking-widest flex items-center gap-3"><Code size={24}/> Pengaturan Uji Coding</h4>
                        <div className="grid grid-cols-3 gap-4">
                           {[{id:'q_code_easy',label:'MUDAH',color:'text-emerald-500'},{id:'q_code_medium',label:'SEDANG',color:'text-amber-500'},{id:'q_code_hard',label:'SULIT',color:'text-rose-500'}].map(f => (
                              <div key={f.id} className="space-y-2 text-center">
                                <label className={`text-[9px] font-black uppercase tracking-widest block ${f.color}`}>{f.label}</label>
                                <input type="number" min="0" value={editingCourse[f.id] || 0} onChange={e => setEditingCourse({...editingCourse, [f.id]: parseInt(e.target.value) || 0})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl text-center font-black outline-none border-none dark:text-white shadow-sm" />
                              </div>
                           ))}
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquareQuote size={14}/> Instruksi Coding Khusus (Prompt AI)</label>
                           <textarea 
                             value={editingCourse.instr_code || ""} 
                             onChange={e => setEditingCourse({...editingCourse, instr_code: e.target.value})}
                             placeholder="Contoh: Berikan tantangan untuk melakukan optimasi perulangan atau validasi input..."
                             className="w-full p-5 bg-white dark:bg-slate-800 rounded-3xl text-sm font-bold outline-none dark:text-white border-none shadow-sm min-h-[100px] resize-none"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="p-10 bg-slate-50 dark:bg-slate-800/40 rounded-[48px] border border-slate-100 dark:border-slate-800 space-y-12">
                      <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-3"><BarChart3 size={24} className="text-indigo-600" /> Bobot Penilaian (Total 100%)</h4>
                      <div className="px-4">
                        <div className="flex justify-between mb-6">
                           <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Bobot Lisan</p><p className="text-4xl font-black text-indigo-600">{editingCourse.weight_oral || 50}%</p></div>
                           <div className="text-center"><p className="text-[10px] font-black text-purple-400 uppercase mb-1">Bobot Coding</p><p className="text-4xl font-black text-purple-600">{editingCourse.weight_code || 50}%</p></div>
                        </div>
                        <div className="relative h-6 flex items-center group">
                          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                              <div style={{ width: `${editingCourse.weight_oral || 50}%` }} className="h-full bg-indigo-600 transition-all duration-300"></div>
                              <div style={{ width: `${editingCourse.weight_code || 50}%` }} className="h-full bg-purple-600 transition-all duration-300"></div>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={editingCourse.weight_oral || 50} onChange={e => { const val = parseInt(e.target.value); setEditingCourse({...editingCourse, weight_oral: val, weight_code: 100 - val}); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                          <div style={{ left: `${editingCourse.weight_oral || 50}%` }} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full border-4 border-slate-900 shadow-2xl pointer-events-none z-20"></div>
                        </div>
                      </div>
                  </div>

                  <button type="submit" className="w-full py-8 bg-indigo-600 text-white rounded-[40px] font-black text-2xl shadow-2xl hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-indigo-600/20 active:scale-95">
                     <Save size={32} /> SIMPAN SEMUA KONFIGURASI
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL TAMBAH KELAS */}
      {showAddClass && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
               <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-3"><School size={28} className="text-indigo-600" /> TAMBAH KELAS</h3>
                  <button onClick={() => setShowAddClass(false)} className="p-3 bg-white dark:bg-slate-700 rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={24} /></button>
               </div>
               <form onSubmit={(e) => { e.preventDefault(); saveClass(newClass.courseCode, newClass.className, currentUser.kodedosen || 'ADMIN').then(() => { setShowAddClass(false); loadTabContent(); }); }} className="p-10 space-y-8">
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">Mata Kuliah</label>
                     <input list="courses-list-add" required placeholder="Masukan Kode Matkul" value={newClass.courseCode} onChange={e => setNewClass({...newClass, courseCode: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10"/>
                     <datalist id="courses-list-add">
                        {matakulData.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                     </datalist>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">Nama Kelas</label>
                     <input type="text" required placeholder="Contoh: TI-3A" value={newClass.className} onChange={e => setNewClass({...newClass, className: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>
                  <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest shadow-indigo-600/20">SIMPAN KELAS</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};
