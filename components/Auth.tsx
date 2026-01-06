
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { registerUser, loginUser } from '../services/mockSheetService';
import { hashPassword } from '../services/cryptoService';
import { Camera, Lock, User as UserIcon, Phone, ShieldCheck, Loader2, Sparkles, GraduationCap } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  onNotify: (type: 'SUCCESS' | 'ERROR' | 'INFO', title: string, message: string) => void;
  onLoading: (show: boolean, msg?: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onNotify, onLoading }) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'DOSEN'>('LOGIN');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [idInput, setIdInput] = useState(''); // NIM or KodeDosen
  const [password, setPassword] = useState('');

  // Register Fields
  const [regNim, setRegNim] = useState('');
  const [regName, setRegName] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regWA, setRegWA] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      onNotify('ERROR', 'Kamera Gagal', "Gagal akses kamera.");
      setIsCameraOpen(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 150; canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 150, 150);
        setPhoto(canvas.toDataURL('image/jpeg', 0.5));
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        setIsCameraOpen(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!isAdminLogin && !idInput.trim()) || !password.trim()) {
        onNotify('INFO', 'Data Kosong', 'Harap lengkapi identitas.');
        return;
    }
    setLoading(true);
    onLoading(true, 'Menghubungkan...');
    try {
      const isDosen = activeTab === 'DOSEN';
      // Hashing the password for all roles including Admin
      const passHash = await hashPassword(password.trim());
      
      const user = await loginUser({
        nim: activeTab === 'LOGIN' && !isAdminLogin ? idInput.trim() : undefined,
        kodedosen: isDosen ? idInput.trim() : undefined,
        passwordHash: passHash,
        isAdmin: isAdminLogin,
        isDosen: isDosen
      });
      
      onLoading(true, 'Menyiapkan dashboard...');
      setTimeout(() => { onLogin(user); setLoading(false); onLoading(false); }, 800);
    } catch (e: any) {
      onNotify('ERROR', 'Login Gagal', e.message);
      setLoading(false); onLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNim.trim() || !regName.trim() || !regPass.trim() || !regWA.trim() || !photo) {
      onNotify('INFO', 'Data Kurang', "Lengkapi data dan ambil foto.");
      return;
    }
    setLoading(true);
    onLoading(true, 'Mendaftarkan...');
    try {
      await registerUser({ nim: regNim, name: regName, password: await hashPassword(regPass), photo: photo, nowa: regWA });
      onNotify('SUCCESS', 'Berhasil', "Akun terdaftar. Silakan login.");
      setActiveTab('LOGIN');
    } catch (err: any) { onNotify('ERROR', 'Gagal', err.message); }
    finally { setLoading(false); onLoading(false); }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all">
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        {[
          { id: 'LOGIN', label: 'Mahasiswa' },
          { id: 'DOSEN', label: 'Dosen' },
          { id: 'REGISTER', label: 'Daftar' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setIsAdminLogin(false); }}
            className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-10">
        {activeTab !== 'REGISTER' ? (
          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl text-indigo-600 dark:text-indigo-400 mb-4">
                    {activeTab === 'DOSEN' ? <GraduationCap size={36} /> : <Sparkles size={36} />}
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    {isAdminLogin ? "Akses Administrator" : (activeTab === 'DOSEN' ? "Panel Dosen" : "Halo Mahasiswa")}
                </h3>
                <p className="text-sm text-slate-400 font-medium">Masukan identitas dan kata sandi Anda.</p>
            </div>
            
            <div className="space-y-4">
                {!isAdminLogin && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        {activeTab === 'DOSEN' ? 'Kode Dosen' : 'NIM'}
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-4 text-slate-300" size={20} />
                        <input 
                          type="text" value={idInput} onChange={e => setIdInput(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white outline-none font-bold"
                          placeholder={activeTab === 'DOSEN' ? "Ex: DSN001" : "Ex: 2021001"}
                        />
                      </div>
                    </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kata Sandi</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 text-slate-300" size={20} />
                    <input 
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white outline-none font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
            </div>

            <button disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-3">
              {loading ? <Loader2 className="animate-spin" size={24} /> : "MASUK SEKARANG"}
            </button>

            {activeTab === 'LOGIN' && (
              <div className="text-center pt-4">
                  <button type="button" onClick={() => setIsAdminLogin(!isAdminLogin)} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2 mx-auto uppercase tracking-widest">
                      <ShieldCheck size={14} /> {isAdminLogin ? "Kembali ke Mahasiswa" : "Mode Administrator"}
                  </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
             <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="NIM" value={regNim} onChange={e => setRegNim(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white font-bold"/>
                <input type="tel" placeholder="WhatsApp" value={regWA} onChange={e => setRegWA(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white font-bold"/>
            </div>
            <input type="text" placeholder="Nama Lengkap" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white font-bold"/>
            <input type="password" placeholder="Buat Kata Sandi" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white font-bold"/>
            <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl p-6 text-center bg-slate-50/50">
                {isCameraOpen ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500">
                        <video ref={videoRef} autoPlay className="w-full h-48 object-cover bg-black scale-x-[-1]"></video>
                        <button type="button" onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white font-black text-xs rounded-full shadow-lg">AMBIL FOTO</button>
                    </div>
                ) : photo ? (
                    <div className="relative">
                        <img src={photo} alt="Preview" className="mx-auto h-24 w-24 object-cover rounded-2xl border-4 border-white shadow-md" />
                        <button type="button" onClick={startCamera} className="mt-2 text-[10px] text-indigo-600 font-black uppercase underline">Ganti Foto</button>
                    </div>
                ) : (
                    <button type="button" onClick={startCamera} className="flex flex-col items-center justify-center w-full py-4 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Camera size={32} className="mb-2" /><span className="text-[10px] font-black uppercase tracking-widest">Identifikasi Wajah</span>
                    </button>
                )}
            </div>
            <button disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-lg hover:bg-slate-800 transition-all flex justify-center shadow-xl">DAFTAR SEKARANG</button>
          </form>
        )}
      </div>
    </div>
  );
};
