
import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllTeams, updateTeamStatus, getMatakulFull, saveMatakul, 
  deleteMatakul, getAllStudents, deleteStudent, getUjianRekap,
  getAllClasses, saveClass, updateClassStatus, deleteClass, recalculateScores
} from '../services/mockSheetService';
import { Team, User } from '../types';
import { 
  Search, Loader2, RefreshCcw, Users, 
  BookOpen, GraduationCap, BarChart3, 
  Plus, Edit2, Trash2, Save, X, ToggleLeft, ToggleRight,
  Layout, TrendingUp, Clock, Code, School, ListChecks,
  Phone, Cpu, Box, Globe, Smartphone as MobileIcon, MessageSquareQuote,
  Zap, BrainCircuit, ShieldAlert, Award, Timer, Scale, ChevronRight,
  Activity, Calculator, CheckSquare, Square, Eye, ChevronLeft, ArrowUpDown, User as UserIcon,
  Filter
} from 'lucide-react';

interface Props {
  currentUser: User;
}

type AdminTab = 'DASHBOARD' | 'TEAMS' | 'COURSES' | 'CLASSES' | 'STUDENTS' | 'RESULTS';

const ITEMS_PER_PAGE = 18;

const AdminStatChart = ({ title, data, type }: { title: string, data: {label: string, value: number}[], type: 'score' | 'count' }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-80">
      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        {type === 'score' ? <BarChart3 size={16} /> : <Users size={16} />} {title}
      </h4>
      <div className="flex-1 flex items-end justify-around gap-2 px-2 pb-6 border-b border-slate-50 dark:border-slate-800">
        {data.length > 0 ? data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shadow-sm">
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

export const AdminDashboard: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [studentsData, setStudentsData] = useState<User[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [matakulData, setMatakulData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, dir: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<User | null>(null);

  // Multiselect for Results
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, s, m, r, c] = await Promise.all([
        getAllTeams(), 
        getAllStudents(), 
        getMatakulFull(),
        getUjianRekap(),
        getAllClasses()
      ]);
      setTeamsData(t || []);
      setStudentsData(s || []);
      setMatakulData(m || []);
      setResultsData(r || []);
      setClassesData(c || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, courseFilter, classFilter, activeTab]);

  const stats = useMemo(() => {
    const avg = resultsData.length ? Math.round(resultsData.reduce((a, b) => a + Number(b.score_total || 0), 0) / resultsData.length) : 0;
    
    // Chart data for scores
    const avgScoresByCourse = matakulData.map(m => {
      const mResults = resultsData.filter(r => String(r.course_id).toLowerCase() === String(m.code).toLowerCase());
      const mAvg = mResults.length ? Math.round(mResults.reduce((a, b) => a + Number(b.score_total || 0), 0) / mResults.length) : 0;
      return { label: m.name, value: mAvg };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 8);

    // Chart data for team distribution
    const teamsByCourse = matakulData.map(m => {
      const count = teamsData.filter(t => String(t.id).toLowerCase() === String(m.code).toLowerCase()).length;
      return { label: m.name, value: count };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 8);

    return { students: studentsData.length, teams: teamsData.length, courses: matakulData.length, avg, avgScoresByCourse, teamsByCourse };
  }, [studentsData, teamsData, resultsData, matakulData]);

  // Unified Filtering & Sorting Logic
  const processedData = useMemo(() => {
    let items: any[] = [];
    if (activeTab === 'TEAMS') items = [...teamsData];
    else if (activeTab === 'RESULTS') items = [...resultsData];
    else if (activeTab === 'COURSES') items = [...matakulData];
    else if (activeTab === 'CLASSES') items = [...classesData];
    else if (activeTab === 'STUDENTS') items = [...studentsData];

    // Search
    if (searchTerm) {
      items = items.filter(it => JSON.stringify(it).toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Filters for Teams and Results
    if (activeTab === 'TEAMS' || activeTab === 'RESULTS') {
      if (courseFilter) items = items.filter(it => String(it.id || it.course_id).toLowerCase() === courseFilter.toLowerCase());
      if (classFilter) items = items.filter(it => String(it.className || it.class).toLowerCase() === classFilter.toLowerCase());
    }

    // Sorting
    if (sortConfig) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Specific mapping for keys that might differ
        if (sortConfig.key === 'class' && activeTab === 'RESULTS') {
            aVal = a.class;
            bVal = b.class;
        }

        // Handle numeric sorting
        if (!isNaN(Number(aVal)) && !isNaN(Number(bVal)) && typeof aVal !== 'string') {
            return sortConfig.dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
        }

        // Standard string comparison
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        if (aStr < bStr) return sortConfig.dir === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [activeTab, teamsData, resultsData, matakulData, classesData, studentsData, searchTerm, courseFilter, classFilter, sortConfig]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedData.slice(start, start + ITEMS_PER_PAGE);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);

  const handleRecalculate = async () => {
    if (selectedResults.length === 0) return;
    setIsRecalculating(true);
    try {
      const targets = selectedResults.map(id => {
        const [nim, course_id] = id.split('|');
        return { nim, course_id };
      });
      const res = await recalculateScores(targets);
      alert(`Berhasil menghitung ulang ${res.updatedCount} data nilai.`);
      setSelectedResults([]);
      await loadData();
    } catch (e: any) {
      alert("Gagal menghitung ulang: " + e.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  const requestSort = (key: string) => {
    let dir: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.dir === 'asc') dir = 'desc';
    setSortConfig({ key, dir });
  };

  return (
    <div className="flex h-[calc(100vh-68px)] bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <nav className="flex-1 p-6 space-y-3 pt-10">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: Layout },
            { id: 'TEAMS', label: 'Semua Tim', icon: Users },
            { id: 'COURSES', label: 'Mata Kuliah', icon: BookOpen },
            { id: 'CLASSES', label: 'Kelola Kelas', icon: School },
            { id: 'STUDENTS', label: 'Mahasiswa', icon: GraduationCap },
            { id: 'RESULTS', label: 'Hasil Ujian', icon: BarChart3 },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as AdminTab); setSelectedResults([]); setCourseFilter(''); setClassFilter(''); setSortConfig(null); }}
              className={`w-full flex items-center gap-5 px-6 py-4 rounded-[24px] font-black transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon size={22} />
              <span className="text-sm uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-8 flex justify-between items-center transition-colors">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Super Admin Control</h2>
          <div className="flex gap-4">
            {(activeTab !== 'DASHBOARD') && (
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input type="text" placeholder="Cari data..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold w-64 outline-none dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all"/>
              </div>
            )}
            <button onClick={loadData} className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors">
              <RefreshCcw size={22} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar relative">
          {loading ? (
             <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
          ) : (
            <div className="animate-fade-in space-y-8">
              {activeTab === 'DASHBOARD' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-44">
                        <div className={`p-3 rounded-2xl bg-indigo-50 text-indigo-600 w-fit`}><GraduationCap size={24} /></div>
                        <div>
                          <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.students}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mahasiswa</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-44">
                        <div className={`p-3 rounded-2xl bg-emerald-50 text-emerald-600 w-fit`}><Users size={24} /></div>
                        <div>
                          <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.teams}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tim Terdaftar</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-44">
                        <div className={`p-3 rounded-2xl bg-rose-50 text-rose-600 w-fit`}><BookOpen size={24} /></div>
                        <div>
                          <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.courses}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Kuliah</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-44">
                        <div className={`p-3 rounded-2xl bg-amber-50 text-amber-600 w-fit`}><Award size={24} /></div>
                        <div>
                          <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.avg}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rata-rata Skor</p>
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <AdminStatChart title="Rata-rata Nilai per Matakuliah" data={stats.avgScoresByCourse} type="score" />
                    <AdminStatChart title="Distribusi Total Tim tiap Mata Kuliah" data={stats.teamsByCourse} type="count" />
                  </div>
                </div>
              )}

              {(activeTab === 'TEAMS' || activeTab === 'RESULTS') && (
                <div className="space-y-6">
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
                          <p className="font-black text-lg uppercase tracking-tight">{selectedResults.length} Mahasiswa Terpilih</p>
                       </div>
                       <button onClick={handleRecalculate} disabled={isRecalculating} className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-100 transition-all shadow-lg">
                          {isRecalculating ? <Loader2 className="animate-spin" /> : <Calculator size={20} />} HITUNG ULANG NILAI
                       </button>
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {activeTab === 'RESULTS' && <th className="p-8 w-10"><Square size={20} /></th>}
                          <th className="p-8 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort(activeTab === 'TEAMS' ? 'course' : 'name')}>
                            {activeTab === 'TEAMS' ? 'Matakuliah' : 'Mahasiswa'} <ArrowUpDown size={12} className="inline ml-1" />
                          </th>
                          <th className="p-8">{activeTab === 'TEAMS' ? 'Tim' : 'Matakuliah'}</th>
                          <th className="p-8 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('class')}>
                            Kelas <ArrowUpDown size={12} className="inline ml-1" />
                          </th>
                          <th className="p-8 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => activeTab === 'RESULTS' ? requestSort('score_total') : null}>
                            {activeTab === 'TEAMS' ? 'Status' : 'Skor Total'} {activeTab === 'RESULTS' && <ArrowUpDown size={12} className="inline ml-1" />}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {pagedData.map((it, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            {activeTab === 'RESULTS' && (
                              <td className="p-8">
                                <button onClick={() => {
                                  const id = `${it.nim}|${it.course_id}`;
                                  setSelectedResults(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                }} className={selectedResults.includes(`${it.nim}|${it.course_id}`) ? 'text-indigo-600' : 'text-slate-300'}>
                                  {selectedResults.includes(`${it.nim}|${it.course_id}`) ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                              </td>
                            )}
                            <td className="p-8">
                              <div className="font-black text-slate-800 dark:text-white uppercase text-sm">{activeTab === 'TEAMS' ? it.course : it.name}</div>
                              <div className="text-[9px] font-bold text-slate-400">{activeTab === 'TEAMS' ? it.id : it.nim}</div>
                            </td>
                            <td className="p-8">
                              <div className="font-black text-slate-500 uppercase text-xs">{activeTab === 'TEAMS' ? `Tim #${it.name}` : it.course}</div>
                              <div className="text-[8px] text-slate-400 font-bold uppercase">{activeTab === 'TEAMS' ? it.projectTitle : `Tim #${it.team}`}</div>
                            </td>
                            <td className="p-8 text-center font-bold text-slate-500">{it.className || it.class}</td>
                            <td className="p-8 text-center">
                               {activeTab === 'TEAMS' ? (
                                 <button onClick={() => updateTeamStatus(it.team_ref, !it.isActive).then(loadData)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${it.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {it.isActive ? 'Aktif' : 'Non-Aktif'}
                                 </button>
                               ) : (
                                 <div className="inline-block px-4 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl font-black text-lg">{it.score_total}</div>
                               )}
                            </td>
                          </tr>
                        ))}
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
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button onClick={() => setEditingCourse({ code: '', name: '', lang_priority: 'php, js, css, html', project_type: 'WEB', ui_framework: 'TANPA FRAMEWORK', app_framework: 'TANPA FRAMEWORK', q_easy: 1, q_medium: 1, q_hard: 1, q_code_easy: 1, q_code_medium: 1, q_code_hard: 1, time_oral: 5, time_code: 15, weight_oral: 50, weight_code: 50, instr_oral: '', instr_code: '', ai_detail_level: 2 })} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">
                      <Plus size={20} /> TAMBAH MATAKULIAH
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-8">Mata Kuliah</th>
                          <th className="p-8">Rangkuman Pengaturan</th>
                          <th className="p-8">Kekritisan</th>
                          <th className="p-8 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {pagedData.map(c => (
                          <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                            <td className="p-8 text-right flex justify-end gap-2">
                              <button onClick={() => setEditingCourse(c)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button>
                              <button onClick={() => confirm(`Hapus ${c.name}?`) && deleteMatakul(c.code).then(loadData)} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white"><Trash2 size={18} /></button>
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
                    <button onClick={() => alert('Fitur tambah kelas dapat diakses via GAS / Menu lainnya sementara ini.')} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">
                      <Plus size={20} /> TAMBAH KELAS
                    </button>
                  </div>
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
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-8 font-black text-indigo-600 uppercase text-sm">{cl.class_name}</td>
                              <td className="p-8">
                                <div className="font-black text-slate-800 dark:text-white uppercase text-xs">{matakulData.find(m => m.code === cl.course_code)?.name || cl.course_code}</div>
                                <div className="text-[9px] text-slate-400 font-bold">{cl.course_code}</div>
                              </td>
                              <td className="p-8 text-center font-black text-slate-500">{teamCount}</td>
                              <td className="p-8 text-center">
                                 <button onClick={() => updateClassStatus(cl.course_code, cl.class_name, parseInt(cl.is_active) === 0).then(loadData)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${parseInt(cl.is_active) === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {parseInt(cl.is_active) === 1 ? 'Aktif' : 'Non-Aktif'}
                                 </button>
                              </td>
                              <td className="p-8 text-right flex justify-end gap-2">
                                <button onClick={() => confirm('Hapus Kelas?') && deleteClass(cl.course_code, cl.class_name).then(loadData)} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white"><Trash2 size={18} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'STUDENTS' && (
                <div className="space-y-10">
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                      {pagedData.map((s, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center group relative overflow-hidden transition-all hover:scale-105 hover:shadow-xl">
                            <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-indigo-50 dark:border-slate-800 shadow-inner mb-4 transition-transform group-hover:scale-110">
                              {s.photoUrl ? <img src={s.photoUrl} className="h-full w-full object-cover" /> : <UserIcon size={40} className="m-auto mt-6 text-slate-300" />}
                            </div>
                            <div className="text-center w-full">
                              <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate px-2">{s.name}</p>
                              <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">{s.nim}</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button onClick={() => setSelectedStudentDetail(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Eye size={16} /></button>
                              <button onClick={() => confirm(`Hapus ${s.name}?`) && deleteStudent(s.nim).then(loadData)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                      ))}
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
            </div>
          )}
        </div>
      </main>

      {/* MODAL DETAIL MAHASISWA */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-in">
              <div className="relative h-40 bg-indigo-600">
                 <button onClick={() => setSelectedStudentDetail(null)} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-all"><X size={20} /></button>
                 <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-32 w-32 rounded-full border-[6px] border-white dark:border-slate-900 bg-slate-200 overflow-hidden shadow-xl">
                    {selectedStudentDetail.photoUrl ? <img src={selectedStudentDetail.photoUrl} className="h-full w-full object-cover" /> : <UserIcon size={64} className="m-auto mt-8 text-slate-400" />}
                 </div>
              </div>
              <div className="pt-20 pb-10 px-8 text-center space-y-4">
                 <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{selectedStudentDetail.name}</h3>
                 <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{selectedStudentDetail.nim}</p>
                 <div className="pt-4 flex flex-col gap-2">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between text-left">
                       <span className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</span>
                       <span className="text-xs font-black text-slate-700 dark:text-slate-300">{selectedStudentDetail.nowa || '-'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between text-left">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Role</span>
                       <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[9px] font-black">MAHASISWA</span>
                    </div>
                 </div>
                 <button onClick={() => setSelectedStudentDetail(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest">Tutup Detail</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL MATAKULIAH (Original Code Kept) */}
      {editingCourse && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[64px] shadow-2xl w-full max-w-7xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
               <div className="flex items-center gap-6">
                 <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg"><BookOpen size={32} /></div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase leading-none mb-1 tracking-tighter">Konfigurasi Matakuliah</h3>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">ID: {editingCourse.code || 'BARU'}</p>
                 </div>
               </div>
               <button onClick={() => setEditingCourse(null)} className="p-4 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={32} /></button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); saveMatakul(editingCourse).then(() => { setEditingCourse(null); loadData(); }); }} className="p-12 space-y-12 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Matakuliah</label>
                    <input type="text" required value={editingCourse.code} onChange={e => setEditingCourse({...editingCourse, code: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-100 dark:bg-slate-800 rounded-[28px] font-black border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white transition-all" />
                </div>
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Matakuliah</label>
                    <input type="text" required value={editingCourse.name} onChange={e => setEditingCourse({...editingCourse, name: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[28px] font-black border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white transition-all shadow-sm" />
                </div>
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Bahasa Prioritas (CSV)</label>
                    <input type="text" required value={editingCourse.lang_priority} onChange={e => setEditingCourse({...editingCourse, lang_priority: e.target.value})} className="w-full p-5 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-800 rounded-[28px] font-black outline-none dark:text-white focus:border-indigo-500 transition-all shadow-sm" placeholder="php, js, dart, python" />
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
