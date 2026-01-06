import React, { useState } from 'react';
import { TeamData, Student } from '../types';
import { Users, UserPlus, Trash2, ArrowRight } from 'lucide-react';

interface RegistrationProps {
  onRegister: (data: TeamData) => void;
}

const Registration: React.FC<RegistrationProps> = ({ onRegister }) => {
  const [className, setClassName] = useState('');
  const [members, setMembers] = useState<Student[]>([{ nim: '', name: '' }]);

  const addMember = () => {
    if (members.length < 4) {
      setMembers([...members, { nim: '', name: '' }]);
    }
  };

  const removeMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const updateMember = (index: number, field: 'nim' | 'name', value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || members.some(m => !m.nim || !m.name)) {
      alert("Mohon lengkapi semua data.");
      return;
    }
    onRegister({ className, members });
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-indigo-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <Users size={28} />
          <h2 className="text-2xl font-bold">Data Kelompok</h2>
        </div>
        <p className="opacity-80 mt-1">Masukkan identitas anggota tim (Max 4 orang).</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8">
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Kelas</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: TI-3A"
            className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-4 mb-8">
          <label className="block text-sm font-semibold text-slate-700">Anggota Tim</label>
          {members.map((member, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="NIM"
                  value={member.nim}
                  onChange={(e) => updateMember(index, 'nim', e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div className="flex-[2]">
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={member.name}
                  onChange={(e) => updateMember(index, 'name', e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
          
          {members.length < 4 && (
            <button
              type="button"
              onClick={addMember}
              className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors mt-2"
            >
              <UserPlus size={18} /> Tambah Anggota
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
          >
            Mulai Ujian <ArrowRight size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Registration;