
import React, { useState } from 'react';
import { extractCodeFiles } from '../services/zipService';
import { CodeFile } from '../types';
import { Upload, FileCode, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFilesExtracted: (files: CodeFile[]) => void;
  allowedExtensions?: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesExtracted, allowedExtensions }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError("Mohon upload file dengan format .zip");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const files = await extractCodeFiles(file, allowedExtensions);
      if (files.length === 0) {
        const extList = allowedExtensions?.join(', ') || 'HTML, CSS, PHP, JS';
        setError(`Tidak ditemukan file kodingan sesuai kriteria (${extList}) di dalam zip ini.`);
      } else {
        onFilesExtracted(files);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memproses file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-slate-100 text-center">
      <div className="mb-6 flex justify-center text-indigo-600">
        <Upload size={64} strokeWidth={1.5} />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Project Source Code</h2>
      <p className="text-slate-500 mb-8">Upload file .zip yang berisi kodingan project kelompok kalian.</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center justify-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <input
          type="file"
          id="file-upload"
          accept=".zip"
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />
        <label
          htmlFor="file-upload"
          className={`
            inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-medium text-white 
            transition-all duration-300 cursor-pointer shadow-lg shadow-indigo-200
            ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}
          `}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Memproses...
            </>
          ) : (
            <>
              <FileCode /> Pilih File ZIP
            </>
          )}
        </label>
      </div>
      <p className="mt-4 text-xs text-slate-400 uppercase font-black tracking-widest">
        Dibutuhkan: {allowedExtensions?.join(', ') || 'PHP, HTML, CSS, JS, TS, Python'}
      </p>
    </div>
  );
};

export default FileUpload;
