
import React, { useState, useEffect } from 'react';
import { User, Student, CourseItem, Team } from '../types';
import { searchUsers, registerTeam, getCourseList, getClassList, getAllTeams } from '../services/mockSheetService';
import { Users, Search, Plus, Trash2, Crown, Check, Loader2, X, AlertCircle } from 'lucide-react';

interface Props {
  currentUser: User;
  onSuccess: () => void;
  onCancel: () => void;
  onNotify: (type: 'SUCCESS' | 'ERROR' | 'INFO', title: string, message: string) => void;
  onLoading: (show: boolean, msg?: string) => void;
}

export const TeamRegistration: React.FC<Props> = ({ currentUser, onSuccess, onCancel, onNotify, onLoading }) => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  
  const [classes, setClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');

  const [noTim, setNoTim] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  
  const [members, setMembers] = useState<Student[]>([{
      nim: currentUser.nim, name: currentUser.name, photoUrl: currentUser.photoUrl
  }]);
  const [leaderNim, setLeaderNim] = useState(currentUser.nim);
  
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [courseList, allTeams] = await Promise.all([
                getCourseList(),
                getAllTeams()
            ]);
            
            if (Array.isArray(courseList)) {
                setCourses(courseList);
                if (courseList.length > 0) setSelectedCourseCode(courseList[0].code);
            }
            if (Array.isArray(allTeams)) {
                setExistingTeams(allTeams);
            }
        } catch (e) {
            console.error("Failed to fetch initial data", e);
        } finally {
            setLoadingCourses(false);
        }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedCourseCode) return;
    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const list = await getClassList(selectedCourseCode);
            if (Array.isArray(list)) {
                setClasses(list);
                if (list.length > 0) setSelectedClass(list[0]);
                else setSelectedClass('');
            } else {
                setClasses([]);
            }
        } catch (e) {
            console.error("Failed to fetch classes", e);
            setClasses([]);
        } finally {
            setLoadingClasses(false);
        }
    };
    fetchClasses();
  }, [selectedCourseCode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!query || query.length < 2) return;
    setSearching(true);
    try {
        const res = await searchUsers(query, currentUser.nim);
        setSearchResults(Array.isArray(res) ? res : []);
    } catch (e) {
        setSearchResults([]);
    } finally {
        setSearching(false);
    }
  };

  const addMember = (user: User) => {
      if (members.length >= 4) {
          onNotify('INFO', 'Batas Maksimal', "Maksimal 4 anggota dalam satu tim.");
          return;
      }
      if (members.find(m => String(m.nim).trim() === String(user.nim).trim())) {
          onNotify('INFO', 'Duplikat', "Mahasiswa ini sudah ada dalam susunan tim Anda.");
          return;
      }
      setMembers([...members, { nim: user.nim, name: user.name, photoUrl: user.photoUrl }]);
      setSearchResults([]);
      setQuery('');
  };

  const removeMember = (nim: string) => {
      if (String(nim).trim() === String(currentUser.nim).trim()) return;
      const newMembers = members.filter(m => String(m.nim).trim() !== String(nim).trim());
      setMembers(newMembers);
      if (leaderNim === nim) setLeaderNim(currentUser.nim);
  };

  const handleRegister = async () => {
      if (!selectedCourseCode || !selectedClass || !noTim || !projectTitle) {
          onNotify('INFO', 'Lengkapi Data', "Mohon lengkapi semua data tim (Nomor Tim & Judul Project).");
          return;
      }

      // ATURAN 1: Cek apakah No Tim sudah ada di Matakuliah & Kelas yang sama
      const isNoTimTaken = existingTeams.some(t => 
        String(t.id).trim() === String(selectedCourseCode).trim() && 
        String(t.className).trim() === String(selectedClass).trim() && 
        String(t.name).trim() === String(noTim).trim()
      );

      if (isNoTimTaken) {
          onNotify('ERROR', 'Nomor Tim Sudah Ada', `Nomor tim ${noTim} sudah digunakan oleh kelompok lain di kelas ${selectedClass} pada mata kuliah ini.`);
          return;
      }

      // ATURAN 2: Cek apakah mahasiswa ini sudah punya tim di matakuliah ini (Frontend check)
      const isAlreadyInCourse = existingTeams.some(t => 
        String(t.id).trim() === String(selectedCourseCode).trim() && 
        t.members.some(m => members.some(newM => String(newM.nim).trim() === String(m.nim).trim()))
      );

      if (isAlreadyInCourse) {
          onNotify('ERROR', 'Sudah Terdaftar', "Salah satu anggota tim Anda sudah terdaftar di kelompok lain untuk mata kuliah ini.");
          return;
      }
      
      setSubmitting(true);
      onLoading(true, 'Sedang mendaftarkan kelompok Anda...');
      try {
          const courseName = courses.find(c => c.code === selectedCourseCode)?.name || '';
          const payload = {
              courseCode: selectedCourseCode,
              courseName: courseName,
              className: selectedClass,
              noTim: noTim,
              projectTitle: projectTitle,
              members: members,
              leaderNim: leaderNim
          };
          await registerTeam(payload);
          onNotify('SUCCESS', 'Pendaftaran Berhasil', "Kelompok Anda telah terdaftar. Silakan hubungi dosen untuk mengaktifkan akses ujian.");
          onSuccess();
      } catch (e: any) {
          onNotify('ERROR', 'Gagal Daftar Tim', e.message);
      } finally {
          setSubmitting(false);
          onLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in py-10">
      <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-black tracking-tight">Pendaftaran Kelompok</h2>
                <p className="text-slate-400 font-medium">Lengkapi data tim untuk mengikuti assessment.</p>
            </div>
            <Users size={48} className="text-indigo-400 opacity-50" />
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mata Kuliah & Kelas</label>
                    <div className="space-y-3">
                        <select 
                            value={selectedCourseCode}
                            onChange={e => setSelectedCourseCode(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold"
                        >
                            {loadingCourses ? <option>Loading Matkul...</option> : 
                                (Array.isArray(courses) && courses.length > 0 ? 
                                    courses.map(c => <option key={c.code} value={c.code}>{c.name}</option>) : 
                                    <option disabled>Tidak ada matkul tersedia</option>
                                )
                            }
                        </select>

                        <select 
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold"
                            disabled={loadingClasses}
                        >
                            {loadingClasses ? <option>Loading Kelas...</option> : 
                                (Array.isArray(classes) && classes.length > 0 ? 
                                    classes.map(cl => <option key={cl} value={cl}>{cl}</option>) : 
                                    <option disabled>Tidak ada kelas tersedia</option>
                                )
                            }
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">No Tim</label>
                        <input 
                            type="number" value={noTim} onChange={e => setNoTim(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold"
                            placeholder="Ex: 1"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Judul Project</label>
                        <input 
                            type="text" value={projectTitle} onChange={e => setProjectTitle(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold"
                            placeholder="Nama aplikasi/website..."
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cari Anggota (Berdasarkan NIM/Nama)</label>
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                        <input 
                            type="text" value={query} onChange={e => setQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
                            placeholder="Ketik minimal 2 karakter..."
                        />
                        <button type="submit" className="hidden">Search</button>
                    </form>

                    {Array.isArray(searchResults) && searchResults.length > 0 && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                            {searchResults.map(u => (
                                <button key={u.nim} onClick={() => addMember(u)} className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                                            {u.photoUrl && <img src={u.photoUrl} className="h-full w-full object-cover" />}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-800">{u.name}</div>
                                            <div className="text-xs text-slate-400 font-bold">{u.nim}</div>
                                        </div>
                                    </div>
                                    <Plus size={20} className="text-indigo-600" />
                                </button>
                            ))}
                        </div>
                    )}
                    {searching && <div className="p-4 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>}
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Susunan Anggota Tim ({members.length}/4)</label>
                <div className="bg-slate-50 rounded-[24px] border border-slate-200 p-2 space-y-2 min-h-[300px]">
                    {members.map(m => (
                        <div key={m.nim} className={`p-4 rounded-2xl flex items-center justify-between transition-all ${leaderNim === m.nim ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-800'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-full bg-slate-100 overflow-hidden border-2 ${leaderNim === m.nim ? 'border-indigo-400' : 'border-slate-200'}`}>
                                    {m.photoUrl && <img src={m.photoUrl} className="h-full w-full object-cover" />}
                                </div>
                                <div>
                                    <div className="font-black text-sm">{m.name} {String(m.nim).trim() === String(currentUser.nim).trim() && "(Saya)"}</div>
                                    <div className={`text-[10px] font-bold ${leaderNim === m.nim ? 'text-indigo-200' : 'text-slate-400'}`}>{m.nim}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {leaderNim !== m.nim && (
                                    <button onClick={() => setLeaderNim(m.nim)} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600" title="Jadikan Ketua">
                                        <Crown size={18} />
                                    </button>
                                )}
                                {String(m.nim).trim() !== String(currentUser.nim).trim() && (
                                    <button onClick={() => removeMember(m.nim)} className={`p-2 rounded-lg ${leaderNim === m.nim ? 'hover:bg-white/10 text-white' : 'hover:bg-red-50 text-red-500'}`}>
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {members.length === 1 && (
                        <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 gap-2">
                            <Users size={32} className="opacity-20" />
                            <p className="text-xs font-bold italic">Cari dan tambahkan anggota lain</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">Batal</button>
                    <button 
                        onClick={handleRegister} 
                        disabled={submitting}
                        className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="animate-spin" /> : <><Check size={20} /> DAFTAR TIM</>}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
