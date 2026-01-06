
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { updateUserProfile } from '../services/mockSheetService';
import { hashPassword } from '../services/cryptoService';
import { Camera, Lock, User as UserIcon, Loader2, X, Upload, Check, Shield } from 'lucide-react';

interface EditProfileProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  onNotify?: (type: 'SUCCESS' | 'ERROR' | 'INFO', title: string, message: string) => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({ user, onClose, onUpdate, onNotify }) => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [photo, setPhoto] = useState<string | null>(user.photoUrl || null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      onNotify?.('ERROR', 'Kamera Gagal', "Gagal akses kamera. Pastikan izin diberikan.");
      setIsCameraOpen(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 150, 150);
        const data = canvas.toDataURL('image/jpeg', 0.5);
        setPhoto(data);
        stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) {
      onNotify?.('ERROR', 'File Terlalu Besar', "Maksimal ukuran foto adalah 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 150;
          canvas.height = 150;
          const ctx = canvas.getContext('2d');
          if(ctx) {
            ctx.drawImage(img, 0, 0, 150, 150);
            setPhoto(canvas.toDataURL('image/jpeg', 0.5));
          }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        let payload: any = {};
        if (newPassword) payload.passwordHash = await hashPassword(newPassword);
        if (photo !== user.photoUrl) payload.photo = photo;

        if (Object.keys(payload).length === 0) {
            onNotify?.('INFO', 'Tidak Ada Perubahan', "Anda belum melakukan perubahan apapun.");
            setLoading(false);
            return;
        }

        const userId = user.role === 'ADMIN' ? 'admin' : (user.role === 'DOSEN' ? user.kodedosen : user.nim);
        if (!userId) throw new Error("ID User tidak ditemukan.");

        await updateUserProfile(userId, payload, user.role);
        onNotify?.('SUCCESS', 'Berhasil', "Profil Anda telah diperbarui.");
        onUpdate({ ...user, photoUrl: photo || user.photoUrl });
        onClose();
    } catch (e: any) {
        onNotify?.('ERROR', 'Gagal Update', e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
          <h3 className="text-xl font-black flex items-center gap-2">
            <UserIcon size={24} className="text-indigo-400" /> EDIT PROFIL
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                    <div className="h-40 w-40 rounded-full bg-slate-100 overflow-hidden border-4 border-indigo-50 shadow-lg">
                        {isCameraOpen ? (
                             <video ref={videoRef} autoPlay className="h-full w-full object-cover bg-black scale-x-[-1]"></video>
                        ) : photo ? (
                            <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300">
                                <UserIcon size={64} />
                            </div>
                        )}
                    </div>
                    {isCameraOpen && (
                        <button onClick={takePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-full shadow-lg animate-bounce">
                           AMBIL
                        </button>
                    )}
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={isCameraOpen ? stopCamera : startCamera} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isCameraOpen ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Camera size={18} /> {isCameraOpen ? 'Batal' : 'Kamera'}
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                        <Upload size={18} /> Upload
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-100">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Informasi Akun</label>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Nama</span>
                            <span className="text-slate-700 font-black">{user.name}</span>
                        </div>
                        {user.role !== 'ADMIN' && (
                          <div className="flex justify-between text-sm">
                              <span className="text-slate-400 font-bold">{user.role === 'DOSEN' ? 'Kode Dosen' : 'NIM'}</span>
                              <span className="text-slate-700 font-black">{user.role === 'DOSEN' ? user.kodedosen : user.nim}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Role</span>
                            <span className="text-indigo-600 font-black flex items-center gap-1 uppercase tracking-widest text-[10px]">
                              {user.role === 'ADMIN' && <Shield size={12} />}
                              {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ganti Password (Opsional)</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Masukkan password baru"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400 font-medium italic">Biarkan kosong jika tidak ingin mengubah password.</p>
                </div>
            </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
            <button 
                disabled={loading}
                onClick={handleSave}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:shadow-none"
            >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24} /> SIMPAN PERUBAHAN</>}
            </button>
        </div>
      </div>
    </div>
  );
};
