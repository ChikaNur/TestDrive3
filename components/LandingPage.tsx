
import React, { useState, useEffect, useRef } from 'react';
import { Rocket, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);

  useEffect(() => {
    // Fix: Cast window to any to access the global VANTA object provided by external script
    if (!vantaEffect && (window as any).VANTA) {
      setVantaEffect(
        (window as any).VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x6366f1,
          backgroundColor: 0x0f172a,
          points: 12.00,
          maxDistance: 20.00,
          spacing: 16.00
        })
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return (
    <div ref={vantaRef} className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden h-full">
      <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in bg-slate-900/40 p-12 rounded-[60px] backdrop-blur-sm border border-white/5 shadow-2xl">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-500/20 text-indigo-300 rounded-full font-black text-xs uppercase tracking-widest border border-indigo-500/30">
          <Rocket size={16} /> Platform Validasi Koding Cerdas
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
          Uji Pemahaman <br/> <span className="text-indigo-400">Coding Projectmu</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-medium">
          Platform berbasis AI untuk Uji Kompetensi Kemampuan dan Pemahaman Coding untuk Mahasiswa
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <button 
            onClick={onStart}
            className="group px-12 py-6 bg-indigo-600 text-white rounded-[32px] font-black text-2xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-4 border border-indigo-400/50"
          >
            MULAI UJIAN <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
