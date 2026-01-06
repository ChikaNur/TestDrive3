
import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllTeams, updateTeamStatus, getMatakulFull, saveMatakul, 
  getUjianRekap, getAllClasses, updateClassStatus, deleteClass, recalculateScores, getAllStudents
} from '../services/mockSheetService';
import { Team, User } from '../types';
import { 
  Search, Loader2, RefreshCcw, Users, 
  BookOpen, BarChart3, Plus, Edit2, Trash2, Save, X, ToggleLeft, ToggleRight,
  Layout, TrendingUp, Clock, School, ListChecks,
  Code, Cpu, MessageSquareQuote, BrainCircuit, Award, Timer, Scale, Zap, ShieldAlert, Activity, Phone, AlertCircle, Info, Calculator, CheckSquare, Square, Filter, ChevronLeft, ChevronRight, ArrowUpDown, User as UserIcon, Eye, Star
} from 'lucide-react';

interface Props {
  currentUser: User;
}

type DosenTab = 'DASHBOARD' | 'TEAMS' | 'COURSES' | 'CLASSES' | 'RESULTS';

const ITEMS_PER_PAGE = 15;

const DosenStatChart = ({ title, data, type }: { title: string, data: {label: string, value: number}[], type: 'score' | 'count' }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-80">
      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        {type === 'score' ? <BarChart3 size={16} /> : <Users size={16} />} {title}
      </h4>
      <div className="flex-1 flex items-end justify-around gap-2 px-2 pb-6 border-b border-slate-50 dark:border-slate-800">
        {data.length > 0 ? data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900 px-2 py-0.5 rounded-md shadow-sm z-20">
              {d.value}{type === 'score' ? '' : ' Tim'}
            </div>
            <div 
              style={{ height: `${(d.value / maxVal) * 100}%` }} 
              className={`w-full max-w-[40px] rounded-t-xl transition-all duration-500 shadow-lg ${type === 'score' ? 'bg-indigo-500 group-hover:bg-indigo-400 shadow-indigo-500/20' : 'bg-emerald-500 group-hover:bg-emerald-400 shadow-emerald-500/20'}`}
            ></div>
            <div className="absolute -bottom-8 w-24 text-center text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate px-1">
              {d.label}
            </div>
          </div>
        )) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No Data</div>
        )}
      </div>
      <div className="h-4"></div>
    </div>
  );
};

const FRAMEWORK_OPTIONS: Record<string, { ui: string[], app: string[] }> = {
  "WEB": {
    ui: ["TANPA FRAMEWORK", "TAILWIND CSS", "BOOTSTRAP 5", "MATERIAL UI", "DAISY UI", "ANT DESIGN", "CHAKRA UI", "FLOWBITE"],
    app: ["TANPA FRAMEWORK", "NEXT.JS", "REACT.JS", "VUE.JS", "LARAVEL (PHP)", "CODEIGNITER 4 (PHP)", "EXPRESS.JS (NODE)", "DJANGO (PYTHON)", "FLASK (PYTHON)", "SPRING BOOT (JAVA)", "SVELTEKIT"]
  },
  "MOBILE": {
    ui: ["FLUTTER UI (MATERIAL 3)", "REACT NATIVE PAPER", "NATIVE UI (XML/SWIFTUI)", "JETPACK COMPOSE", "IONIC UI"],
    app: ["FLUTTER", "REACT NATIVE", "ANDROID NATIVE (KOTLIN)", "IOS NATIVE (SWIFT)", "KOTLIN MULTIPLATFORM (KMP)", "IONIC CAPACITOR"]
  },
  "GENERAL": {
    ui: ["CONSOLE / CLI", "TKINTER (PYTHON GUI)", "QT / WXWIDGETS", "NONE"],
    app: ["PYTHON SCRIPT", "NODE.JS SCRIPT", "JAVA CONSOLE", "C / C++ EXECUTABLE", "GO LANG", "RUST"]
  }
};

const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-44 transition-transform hover:scale-[1.02]">
    <div className="flex justify-between items-center">
      <div className={`p-3 rounded-2xl ${bg} ${color}`}><Icon size={24} /></div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Analytics</span>
    </div>
    <div>
      <p className="text-4xl font-black text-slate-800 dark:text-white">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
    </div>
  </div>
);

export const DosenDashboard: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<DosenTab>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [matakulData, setMatakulData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<any[]>([]);
  const [allStudentsData, setAllStudentsData] = useState<User[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, dir: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [hoveredStudent, setHoveredStudent] = useState<string | null>(null);

  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const kd = currentUser.kodedosen;
      const [t, m, r, c, s] = await Promise.all([
        getAllTeams(kd), 
        getMatakulFull(kd),
        getUjianRekap(kd),
        getAllClasses(kd),
        getAllStudents()
      ]);
      setTeamsData(t || []);
      setMatakulData(m || []);
      setResultsData(r || []);
      setClassesData(c || []);
      setAllStudentsData(s || []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, courseFilter, classFilter, activeTab]);

  const stats = useMemo(() => {
    const students = Array.from(new Set(teamsData.flatMap(t => t.members.map(m => m.nim)))).length;
    const avg = resultsData.length ? Math.round(resultsData.reduce((a, b) => a + Number(b.score_total || 0), 0) / resultsData.length) : 0;
    
    const avgScoresByCourse = matakulData.map(m => {
      const mRes = resultsData.filter(r => String(r.course_id).toLowerCase() === String(m.code).toLowerCase());
      const mAvg = mRes.length ? Math.round(mRes.reduce((a,b) => a + Number(b.score_total || 0), 0) / mRes.length) : 0;
      return { label: m.name, value: mAvg };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 8);

    const teamsByCourseClass = matakulData.map(m => {
      const count = teamsData.filter(t => String(t.id).toLowerCase() === String(m.code).toLowerCase()).length;
      return { label: m.name, value: count };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 8);

    const top10Scores = [...resultsData]
      .sort((a,b) => Number(b.score_total) - Number(a.score_total))
      .slice(0, 10)
      .map(r => ({ label: r.name, value: Number(r.score_total) }));

    return { students, teams: teamsData.length, courses: matakulData.length, avg, avgScoresByCourse, teamsByCourseClass, top10Scores };
  }, [teamsData, resultsData, matakulData]);

  const processedData = useMemo(() => {
    let items: any[] = [];
    if (activeTab === 'TEAMS') items = [...teamsData];
    else if (activeTab === 'RESULTS') items = [...resultsData];
    else if (activeTab === 'COURSES') items = [...matakulData];
    else if (activeTab === 'CLASSES') items = [...classesData];

    if (searchTerm) {
      items = items.filter(it => JSON.stringify(it).toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (activeTab === 'TEAMS' || activeTab === 'RESULTS') {
      if (courseFilter) items = items.filter(it => String(it.id || it.course_id).toLowerCase() === courseFilter.toLowerCase());
      if (classFilter) items = items.filter(it => String(it.className || it.class).toLowerCase() === classFilter.toLowerCase());
    }

    if (sortConfig) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'score_total' || sortConfig.key === 'score_oral' || sortConfig.key === 'score_code') {
            return sortConfig.dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
        }
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        if (aStr < bStr) return sortConfig.dir === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [activeTab, teamsData, resultsData, matakulData, classesData, searchTerm, courseFilter, classFilter, sortConfig]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedData.slice(start, start + ITEMS_PER_PAGE);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);

  const requestSort = (key: string) => {
    let dir: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.dir === 'asc') dir = 'desc';
    setSortConfig({ key, dir });
  };

  const handleRecalculate = async () => {
    if (selectedResults.length === 0) return;
    setIsRecalculating(true);
    try {
      const targets = selectedResults.map(id => {
        const [nim, course_id] = id.split('|');
        return { nim, course_id };
      });
      const res = await recalculateScores(targets, currentUser.kodedosen);
      alert(`Berhasil menghitung ulang ${res.updatedCount} data nilai.`);
      setSelectedResults([]);
      await loadData();
    } catch (e: any) {
      alert("Gagal menghitung ulang: " + e.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedResults.length === pagedData.length && pagedData.length > 0) {
      setSelectedResults([]);
    } else {
      setSelectedResults(pagedData.map(it => `${it.nim}|${it.course_id}`));
    }
  };

  const getStudentPhoto = (nim: string) => {
      const s = allStudentsData.find(st => String(st.nim).trim() === String(nim).trim());
      return s?.photoUrl || null;
  };

  return (
    <div className="flex h-[calc(100vh-68px)] bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <nav className="flex-1 p-6 space-y-3 pt-10">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: Layout },
            { id: 'TEAMS', label: 'Kelola Tim', icon: Users },
            { id: 'COURSES', label: 'Mata Kuliah', icon: BookOpen },
            { id: 'CLASSES', label: 'Kelola Kelas', icon: School },
            { id: 'RESULTS', label: 'Hasil Ujian', icon: BarChart3 },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as DosenTab); setSelectedResults([]); setCourseFilter(''); setClassFilter(''); setSortConfig(null); }}
              className={`w-full flex items-center gap-5 px-6 py-4 rounded-[24px] font-black transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon size={22} />
              <span className="text-sm uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-8 flex justify-between items-center transition-colors">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Dosen: {currentUser.name}</h2>
          <div className="flex gap-4">
            {activeTab !== 'DASHBOARD' && (
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input type="text" placeholder="Cari data..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold w-64 outline-none dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all"/>
              </div>
            )}
            <button onClick={loadData} className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors"><RefreshCcw size={22} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar relative">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 font-black gap-4 uppercase tracking-widest text-xs">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <span>Memuat Data Akademik...</span>
             </div>
          ) : (
            <div className="animate-fade-in space-y-10">
              {activeTab === 'DASHBOARD' && (
                <div className="space-y-10 pb-20">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard label="Mahasiswa Ampu" value={stats.students} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
                    <StatCard label="Tim Aktif" value={stats.teams} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
                    <StatCard label="Mata Kuliah" value={stats.courses} icon={BookOpen} color="text-rose-600" bg="bg-rose-50" />
                    <StatCard label="Rata-rata Skor" value={stats.avg} icon={Award} color="text-amber-600" bg="bg-amber-50" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <DosenStatChart title="Rata-rata Nilai per Matakuliah" data={stats.avgScoresByCourse} type="score" />
                    <DosenStatChart title="Distribusi Tim tiap Matakuliah" data={stats.teamsByCourseClass} type="count" />
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Star size={16} className="text-amber-500" /> Top 10 Nilai Tertinggi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                       {stats.top10Scores.map((r, i) => (
                         <div key={i} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center group transition-all hover:scale-105">
                            <div className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xs mb-3 shadow-lg">#{i+1}</div>
                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate w-full">{r.label}</p>
                            <p className="text-2xl font-black text-indigo-600 mt-1">{r.value}</p>
                         </div>
                       ))}
                       {stats.top10Scores.length === 0 && <p className="col-span-full text-center py-10 text-slate-300 font-bold uppercase italic text-[10px]">Belum Ada Data Ujian.</p>}
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === 'TEAMS' || activeTab === 'RESULTS') && (
                <div className="space-y-6 pb-20">
                   <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3">
                         <Filter size={18} className="text-slate-400" />
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Filter:</span>
                      </div>
                      <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none dark:text-white">
                         <option value="">Semua Matakuliah</option>
                         {matakulData.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                      </select>
                      <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none dark:text-white">
                         <option value="">Semua Kelas</option>
                         {[...new Set(classesData.map(c => c.class_name))].map(cl => <option key={cl} value={cl}>{cl}</option>)}
                      </select>
                      <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Total {processedData.length} data ditemukan
                      </div>
                   </div>

                   {activeTab === 'RESULTS' && selectedResults.length > 0 && (
                    <div className="flex items-center justify-between p-6 bg-indigo-600 rounded-[32px] text-white shadow-xl animate-scale-in">
                       <div className="flex items-center gap-4">
                          <CheckSquare size={32} />
                          <div>
                            <p className="font-black text-lg uppercase tracking-tight">{selectedResults.length} Mahasiswa Terpilih</p>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Aksi masal untuk menghitung ulang skor berdasarkan bobot terbaru.</p>
                          </div>
                       </div>
                       <button onClick={handleRecalculate} disabled={isRecalculating} className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-100 transition-all shadow-lg active:scale-95">
                          {isRecalculating ? <Loader2 className="animate-spin" /> : <Calculator size={20} />} HITUNG ULANG NILAI
                       </button>
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {activeTab === 'RESULTS' && (
                            <th className="p-8 w-10 text-center">
                              <button onClick={toggleSelectAll} className="text-indigo-600 hover:scale-110 transition-transform">
                                {selectedResults.length === pagedData.length && pagedData.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                              </button>
                            </th>
                          )}
                          <th className="p-8 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort(activeTab === 'TEAMS' ? 'course' : 'name')}>
                            {activeTab === 'TEAMS' ? 'Matakuliah' : 'Mahasiswa'} <ArrowUpDown size={12} className="inline ml-1" />
                          </th>
                          <th className="p-8">{activeTab === 'TEAMS' ? 'Anggota Tim' : 'Matakuliah'}</th>
                          <th className="p-8 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort(activeTab === 'TEAMS' ? 'className' : 'class')}>
                            Kelas <ArrowUpDown size={12} className="inline ml-1" />
                          </th>
                          <th className="p-8 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => activeTab === 'RESULTS' ? requestSort('score_total') : null}>
                            {activeTab === 'TEAMS' ? 'Status' : 'Skor Total'} {activeTab === 'RESULTS' && <ArrowUpDown size={12} className="inline ml-1" />}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {pagedData.map((it, i) => {
                          const resultId = `${it.nim}|${it.course_id}`;
                          const isSelected = selectedResults.includes(resultId);
                          return (
                            <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                              {activeTab === 'RESULTS' && (
                                <td className="p-8 text-center">
                                  <button onClick={() => {
                                    setSelectedResults(prev => prev.includes(resultId) ? prev.filter(x => x !== resultId) : [...prev, resultId]);
                                  }} className={isSelected ? 'text-indigo-600' : 'text-slate-300'}>
                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                  </button>
                                </td>
                              )}
                              <td className="p-8">
                                <div className="font-black text-slate-800 dark:text-white uppercase text-sm">{activeTab === 'TEAMS' ? it.course : it.name}</div>
                                <div className="text-[9px] font-bold text-slate-400">{activeTab === 'TEAMS' ? it.id : it.nim}</div>
                              </td>
                              <td className="p-8">
                                {activeTab === 'TEAMS' ? (
                                  <div className="flex flex-wrap gap-2">
                                    {it.members.map((m: any) => (
                                      <div key={m.nim} className="relative group/name">
                                        <span 
                                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold uppercase cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors"
                                          onMouseEnter={() => setHoveredStudent(m.nim)}
                                          onMouseLeave={() => setHoveredStudent(null)}
                                        >
                                          {m.name}
                                        </span>
                                        {hoveredStudent === m.nim && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-fade-in w-32">
                                            <div className="h-28 w-full bg-slate-200 rounded-xl overflow-hidden">
                                              {getStudentPhoto(m.nim) ? <img src={getStudentPhoto(m.nim)!} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center"><UserIcon className="text-slate-400" /></div>}
                                            </div>
                                            <p className="text-[8px] font-black text-center mt-2 uppercase text-slate-400">{m.nim}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="font-black text-slate-500 uppercase text-xs">{it.course}</div>
                                )}
                              </td>
                              <td className="p-8 text-center font-bold text-slate-500">{it.className || it.class}</td>
                              <td className="p-8 text-center">
                                 {activeTab === 'TEAMS' ? (
                                   <button onClick={() => updateTeamStatus(it.team_ref, !it.isActive).then(loadData)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${it.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                      {it.isActive ? 'Aktif' : 'Non-Aktif'}
                                   </button>
                                 ) : (
                                   <div className="inline-block px-4 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl font-black text-lg">{it.score_total}</div>
                                 )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 disabled:opacity-30"><ChevronLeft /></button>
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Halaman {currentPage} dari {totalPages}</span>
                      <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 disabled:opacity-30"><ChevronRight /></button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'COURSES' && (
                <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden pb-10">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="p-8">Mata Kuliah</th>
                        <th className="p-8">Rangkuman Pengaturan</th>
                        <th className="p-8">Kekritisan AI</th>
                        <th className="p-8 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {pagedData.map(c => (
                        <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-8">
                            <div className="font-black text-slate-800 dark:text-white uppercase">{c.name}</div>
                            <div className="text-[10px] font-bold text-indigo-600 uppercase">{c.code}</div>
                          </td>
                          <td className="p-8">
                               <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-black uppercase text-slate-500">
                                  <div className="flex justify-between gap-4"><span>Bobot (L/C):</span> <span className="text-indigo-600">{c.weight_oral}% / {c.weight_code}%</span></div>
                                  <div className="flex justify-between gap-4"><span>Soal Lisan:</span> <span className="text-indigo-600">{Number(c.q_easy)+Number(c.q_medium)+Number(c.q_hard)}</span></div>
                                  <div className="flex justify-between gap-4"><span>Waktu (L/C):</span> <span className="text-indigo-600">{c.time_oral}m / {c.time_code}m</span></div>
                                  <div className="flex justify-between gap-4"><span>Soal Coding:</span> <span className="text-indigo-600">{Number(c.q_code_easy)+Number(c.q_code_medium)+Number(c.q_code_hard)}</span></div>
                               </div>
                          </td>
                          <td className="p-8">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${Number(c.ai_detail_level) === 3 ? 'bg-rose-100 text-rose-600' : (Number(c.ai_detail_level) === 2 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600')}`}>
                                {Number(c.ai_detail_level) === 3 ? 'Expert' : (Number(c.ai_detail_level) === 2 ? 'Standard' : 'Basic')}
                              </span>
                          </td>
                          <td className="p-8 text-right">
                            <button onClick={() => setEditingCourse(c)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'CLASSES' && (
                <div className="space-y-6 pb-20">
                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-8">Nama Kelas</th>
                          <th className="p-8">Mata Kuliah</th>
                          <th className="p-8 text-center">Jumlah Tim</th>
                          <th className="p-8 text-center">Status</th>
                          <th className="p-8 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {processedData.map((cl, idx) => {
                           const teamCount = teamsData.filter(t => String(t.className).toLowerCase() === String(cl.class_name).toLowerCase() && String(t.id).toLowerCase() === String(cl.course_code).toLowerCase()).length;
                           return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="p-8 font-black text-indigo-600 uppercase text-sm">{cl.class_name}</td>
                              <td className="p-8">
                                <div className="font-black text-slate-800 dark:text-white uppercase text-xs">{matakulData.find(m => m.code === cl.course_code)?.name || cl.course_code}</div>
                                <div className="text-[9px] text-slate-400 font-bold">{cl.course_code}</div>
                              </td>
                              <td className="p-8 text-center font-black text-slate-500">{teamCount}</td>
                              <td className="p-8 text-center">
                                 <button onClick={() => updateClassStatus(cl.course_code, cl.class_name, parseInt(cl.is_active) === 0).then(loadData)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${parseInt(cl.is_active) === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {parseInt(cl.is_active) === 1 ? 'Aktif' : 'Non-Aktif'}
                                 </button>
                              </td>
                              <td className="p-8 text-right flex justify-end gap-2">
                                <button onClick={() => setEditingCourse(matakulData.find(m => m.code === cl.course_code))} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                              </td>
                            </tr>
                           );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL MATAKULIAH */}
      {editingCourse && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[64px] shadow-2xl w-full max-w-7xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
               <div className="flex items-center gap-6">
                 <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg"><BookOpen size={32} /></div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase leading-none mb-1 tracking-tighter">Konfigurasi Matakuliah</h3>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">ID: {editingCourse.code}</p>
                 </div>
               </div>
               <button onClick={() => setEditingCourse(null)} className="p-4 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={32} /></button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); saveMatakul(editingCourse).then(() => { setEditingCourse(null); loadData(); }); }} className="p-12 space-y-12 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Matakuliah</label>
                    <input type="text" disabled value={editingCourse.code} className="w-full p-5 bg-slate-100 dark:bg-slate-800 rounded-[28px] font-black outline-none cursor-not-allowed opacity-60" />
                </div>
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Matakuliah</label>
                    <input type="text" required value={editingCourse.name} onChange={e => setEditingCourse({...editingCourse, name: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[28px] font-black border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white transition-all shadow-sm" />
                </div>
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Bahasa Prioritas (CSV)</label>
                    <input type="text" required value={editingCourse.lang_priority} onChange={e => setEditingCourse({...editingCourse, lang_priority: e.target.value})} className="w-full p-5 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-800 rounded-[28px] font-black outline-none dark:text-white focus:border-indigo-500 transition-all shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="p-10 bg-slate-50 dark:bg-slate-800/40 rounded-[48px] border border-slate-100 dark:border-slate-800 space-y-8">
                    <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-3 mb-4"><Cpu size={24} className="text-indigo-600" /> Spesifikasi Proyek</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Project</label>
                            <select value={editingCourse.project_type || "WEB"} onChange={e => setEditingCourse({...editingCourse, project_type: e.target.value, ui_framework: 'TANPA FRAMEWORK', app_framework: 'TANPA FRAMEWORK'})} className="w-full p-5 bg-white dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none">
                                <option value="WEB">WEB</option><option value="MOBILE">MOBILE</option><option value="GENERAL">GENERAL</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">UI Framework</label>
                            <select value={editingCourse.ui_framework} onChange={e => setEditingCourse({...editingCourse, ui_framework: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none">
                                {FRAMEWORK_OPTIONS[editingCourse.project_type || "WEB"].ui.map(fw => <option key={fw} value={fw}>{fw}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">App Framework</label>
                            <select value={editingCourse.app_framework} onChange={e => setEditingCourse({...editingCourse, app_framework: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-800 border-none rounded-3xl text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none">
                                {FRAMEWORK_OPTIONS[editingCourse.project_type || "WEB"].app.map(fw => <option key={fw} value={fw}>{fw}</option>)}
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
                            <button key={level.val} type="button" onClick={() => setEditingCourse({...editingCourse, ai_detail_level: level.val})}
                                className={`p-6 rounded-[40px] flex flex-col items-center gap-3 transition-all border-2 ${Number(editingCourse.ai_detail_level) === level.val ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105' : 'bg-transparent border-transparent grayscale opacity-50'}`}>
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
                            <input type="number" value={editingCourse[f.id] || 0} onChange={e => setEditingCourse({...editingCourse, [f.id]: parseInt(e.target.value) || 0})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl text-center font-black outline-none border-none dark:text-white shadow-sm" />
                          </div>
                       ))}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquareQuote size={14}/> Instruksi Lisan Khusus (Prompt AI)</label>
                       <textarea value={editingCourse.instr_oral || ""} onChange={e => setEditingCourse({...editingCourse, instr_oral: e.target.value})} placeholder="Contoh: Fokuskan pertanyaan pada penggunaan hooks dan state management..." className="w-full p-5 bg-white dark:bg-slate-800 rounded-3xl text-sm font-bold outline-none dark:text-white border-none shadow-sm min-h-[100px] resize-none" />
                    </div>
                 </div>
                 
                 <div className="p-10 bg-purple-50/30 dark:bg-purple-900/10 rounded-[48px] border border-purple-100 dark:border-purple-800 space-y-6">
                    <h4 className="text-sm font-black text-purple-600 uppercase tracking-widest flex items-center gap-3"><Code size={24}/> Pengaturan Uji Coding</h4>
                    <div className="grid grid-cols-3 gap-4">
                       {[{id:'q_code_easy',label:'MUDAH',color:'text-emerald-500'},{id:'q_code_medium',label:'SEDANG',color:'text-amber-500'},{id:'q_code_hard',label:'SULIT',color:'text-rose-500'}].map(f => (
                          <div key={f.id} className="space-y-2 text-center">
                            <label className={`text-[9px] font-black uppercase tracking-widest block ${f.color}`}>{f.label}</label>
                            <input type="number" value={editingCourse[f.id] || 0} onChange={e => setEditingCourse({...editingCourse, [f.id]: parseInt(e.target.value) || 0})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl text-center font-black outline-none border-none dark:text-white shadow-sm" />
                          </div>
                       ))}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquareQuote size={14}/> Instruksi Coding Khusus (Prompt AI)</label>
                       <textarea value={editingCourse.instr_code || ""} onChange={e => setEditingCourse({...editingCourse, instr_code: e.target.value})} placeholder="Contoh: Berikan tantangan untuk melakukan optimasi perulangan..." className="w-full p-5 bg-white dark:bg-slate-800 rounded-3xl text-sm font-bold outline-none dark:text-white border-none shadow-sm min-h-[100px] resize-none" />
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
                          <div style={{ width: `${editingCourse.weight_oral || 50}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"></div>
                          <div style={{ width: `${editingCourse.weight_code || 50}%` }} className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"></div>
                      </div>
                      <input type="range" min="0" max="100" step="5" value={editingCourse.weight_oral || 50} onChange={e => { const val = parseInt(e.target.value); setEditingCourse({...editingCourse, weight_oral: val, weight_code: 100 - val}); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                      <div style={{ left: `${editingCourse.weight_oral || 50}%` }} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full border-[6px] border-slate-900 shadow-2xl pointer-events-none z-20"></div>
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
    </div>
  );
};
