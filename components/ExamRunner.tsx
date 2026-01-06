
import React, { useState, useEffect, useRef } from 'react';
import { Question, CourseConfig, ExamResult } from '../types';
import { playTextToSpeech, evaluateResponse, stopAllAudio, initAudioContext } from '../services/geminiService';
import { Mic, MicOff, Send, Clock, Volume2, Terminal, FileCode, CheckCircle2, Loader2, AlertTriangle, BarChart3, ArrowRightCircle, Bell, Radio, Zap, VolumeX, Timer, Scale } from 'lucide-react';

interface Props {
  questions: Question[];
  config: CourseConfig;
  onFinish: (results: ExamResult[]) => void;
}

export const ExamRunner: React.FC<Props> = ({ questions, config, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isAutoTransitioning, setIsAutoTransitioning] = useState(false);
  const [showFeedback, setShowFeedback] = useState<ExamResult | null>(null);
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  const currentQ = questions[currentIdx];
  const recognitionRef = useRef<any>(null);

  // Stats for the header
  const totalOral = questions.filter(q => q.type === 'ORAL').length;
  const totalCoding = questions.filter(q => q.type === 'CODING').length;
  const currentOralDone = results.filter(r => r.type === 'ORAL').length + (currentQ?.type === 'ORAL' ? 0 : 0);
  const currentCodingDone = results.filter(r => r.type === 'CODING').length + (currentQ?.type === 'CODING' ? 0 : 0);

  useEffect(() => {
    initAudioContext();
    return () => {
        stopAllAudio();
        if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const handlePlayAudio = async () => {
    if (!currentQ) return;
    
    await initAudioContext();
    setIsAudioLoading(true);
    setAudioError(false);
    try {
      setIsSpeaking(true);
      await playTextToSpeech(currentQ.aiPrompt);
    } catch (e) {
      console.error("Audio playback error", e);
      setAudioError(true);
    } finally {
      setIsAudioLoading(false);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (!currentQ || showFinalSummary) return;
    
    stopAllAudio();
    
    // Timer Logic using Config from Sheets
    const oralTime = Number(config?.timeOralMin) || 5;
    const codingTime = Number(config?.timeCodingMin) || 15;
    const minutes = currentQ.type === 'ORAL' ? oralTime : codingTime;
    
    setTimeLeft(minutes * 60);
    setAnswer('');
    setShowFeedback(null);
    setShowWarning(false);
    setIsAutoTransitioning(false);
    setIsAudioLoading(false);
    setIsSpeaking(false);
    setAudioError(false);
    
    const timer = setTimeout(handlePlayAudio, 800);
    return () => clearTimeout(timer);
  }, [currentIdx, showFinalSummary]);

  useEffect(() => {
    if (timeLeft <= 0 || isNaN(timeLeft) || showFinalSummary || showFeedback || isAutoTransitioning) return;
    
    if (timeLeft === 30) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, showFinalSummary, showFeedback, isAutoTransitioning]);

  const handleAutoSubmit = () => {
    if (showFeedback || isEvaluating || isAutoTransitioning) return;
    setIsAutoTransitioning(true);
    const finalAnswer = answer.trim() || "(Mahasiswa tidak menjawab tepat waktu)";
    setAnswer(finalAnswer);
    handleSubmit(finalAnswer, true);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'id-ID';
      
      recognitionRef.current.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        if (final) setAnswer(prev => (prev + ' ' + final).trim());
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const toggleMic = async () => {
    if (!recognitionRef.current) {
        alert("Browser Anda tidak mendukung perekaman suara.");
        return;
    }

    if (isListening) {
        recognitionRef.current.stop();
    } else {
      try {
        await initAudioContext();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
          console.error("Speech recognition error", e);
          setIsListening(false);
      }
    }
  };

  const handleSubmit = async (forcedAnswer?: string, autoNext: boolean = false) => {
      const submission = forcedAnswer || answer;
      if (!submission.trim() && !forcedAnswer) return;
      
      setIsEvaluating(true);
      if(isListening && recognitionRef.current) recognitionRef.current.stop();
      stopAllAudio(); 

      try {
          const result = await evaluateResponse(currentQ, submission);
          if (autoNext) {
            setResults(prev => {
              const updated = [...prev, result];
              if (currentIdx + 1 < questions.length) {
                setCurrentIdx(idx => idx + 1);
              } else {
                setShowFinalSummary(true);
              }
              return updated;
            });
          } else {
            setShowFeedback(result);
          }
      } catch (err) {
          const fallbackResult: ExamResult = { questionId: currentQ.id, type: currentQ.type, studentAnswer: submission, score: 0, feedback: "Evaluasi AI terputus." };
          if (autoNext) {
            setResults(prev => {
                const updated = [...prev, fallbackResult];
                if (currentIdx + 1 < questions.length) setCurrentIdx(idx => idx + 1);
                else setShowFinalSummary(true);
                return updated;
            });
          } else {
            setShowFeedback(fallbackResult);
          }
      } finally {
          setIsEvaluating(false);
          if (autoNext) setIsAutoTransitioning(false);
      }
  };

  const nextQuestion = () => {
      if (!showFeedback) return;
      const resultToSave = showFeedback;
      setShowFeedback(null);
      setResults(prev => [...prev, resultToSave]);
      
      if (currentIdx + 1 < questions.length) {
          setCurrentIdx(prev => prev + 1);
      } else {
          setShowFinalSummary(true);
      }
  };

  const formatTime = (sec: number) => {
      if (isNaN(sec)) return "00:00";
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentQ) return null;

  const oralResults = results.filter(r => r.type === 'ORAL');
  const codingResults = results.filter(r => r.type === 'CODING');
  const avgOral = oralResults.length ? Math.round(oralResults.reduce((a, b) => a + b.score, 0) / oralResults.length) : 0;
  const avgCoding = codingResults.length ? Math.round(codingResults.reduce((a, b) => a + b.score, 0) / codingResults.length) : 0;
  
  // Weighted Total from Config
  const wOral = (config.weightOral || 50) / 100;
  const wCode = (config.weightCode || 50) / 100;
  const grandTotal = Math.round((avgOral * wOral) + (avgCoding * wCode));

  if (showFinalSummary) {
      return (
          <div className="max-w-2xl mx-auto w-full p-4 animate-scale-in">
              <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
                  <div className="bg-indigo-600 p-8 text-white text-center">
                      <BarChart3 size={48} className="mx-auto mb-4 opacity-80" />
                      <h2 className="text-2xl font-black uppercase tracking-tight">Ringkasan Nilai Assessment</h2>
                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">Berdasarkan Bobot Konfigurasi Dosen</p>
                  </div>
                  <div className="p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Rata-rata Lisan ({config.weightOral}%)</p>
                              <p className="text-4xl font-black text-indigo-600">{avgOral}</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Rata-rata Coding ({config.weightCode}%)</p>
                              <p className="text-4xl font-black text-purple-600">{avgCoding}</p>
                          </div>
                      </div>
                      
                      <div className="bg-slate-900 p-8 rounded-3xl text-center shadow-2xl">
                          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                            <Scale size={16} /> NILAI TOTAL TERBOBOT
                          </p>
                          <p className="text-6xl font-black text-white">{grandTotal}</p>
                      </div>

                      <button onClick={() => onFinish(results)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95">
                        Simpan & Selesaikan Ujian <ArrowRightCircle size={28} />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-[1300px] mx-auto gap-4 p-4 animate-fade-in relative">
          {showWarning && !isAutoTransitioning && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce border-4 border-white">
                <Bell size={24} />
                <div>
                  <div className="font-black text-lg tracking-tight leading-none">WAKTU KRITIS!</div>
                  <div className="text-xs opacity-90 font-bold uppercase tracking-widest">Sisa 30 Detik Terakhir</div>
                </div>
            </div>
          )}

          {(isAutoTransitioning || isEvaluating) && (
            <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center animate-fade-in">
                <div className="relative mb-6">
                    <Loader2 size={64} className="animate-spin text-indigo-400" />
                    <Zap size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400 animate-pulse" />
                </div>
                <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">
                    {isAutoTransitioning ? "WAKTU HABIS!" : "PROSES EVALUASI AI"}
                </h2>
                <p className="text-lg text-slate-400 max-w-sm font-medium">
                  {isAutoTransitioning ? "Mengunci jawaban otomatis. Mohon jangan menutup halaman ini." : "Menganalisa keakuratan logika dan pemahaman teknis Anda..."}
                </p>
            </div>
          )}

          <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-6">
                 <div className="flex flex-col">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit mb-1 ${currentQ.type === 'ORAL' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                        {currentQ.type === 'ORAL' ? 'UJI LISAN' : 'UJI CODING'}
                    </span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">SOAL {currentIdx + 1} DARI {questions.length}</span>
                 </div>
                 
                 <div className="h-8 w-px bg-slate-100"></div>
                 
                 <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">PROGRESS LISAN</span>
                        <span className="text-sm font-black text-indigo-600">{currentOralDone + (currentQ.type === 'ORAL' ? 1 : 0)} / {totalOral}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">PROGRESS CODING</span>
                        <span className="text-sm font-black text-purple-600">{currentCodingDone + (currentQ.type === 'CODING' ? 1 : 0)} / {totalCoding}</span>
                    </div>
                 </div>
             </div>

             <div className="flex items-center gap-5">
                 <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Timer size={10} /> DURASI MAKSIMAL</span>
                    <span className="text-xs font-bold text-indigo-600">{currentQ.type === 'ORAL' ? config.timeOralMin : config.timeCodingMin} Menit Per Soal</span>
                 </div>
                 <div className={`flex items-center gap-3 font-mono text-3xl font-black px-6 py-2 bg-slate-50 rounded-2xl border transition-colors ${timeLeft < 30 ? 'text-red-600 bg-red-50 border-red-200 animate-pulse' : 'text-slate-800 border-slate-100'}`}>
                     <Clock size={28} /> {formatTime(timeLeft)}
                 </div>
             </div>
          </div>

          <div className="flex-1 flex gap-4 min-h-0">
             <div className="w-1/2 flex flex-col bg-slate-900 rounded-[32px] overflow-hidden shadow-xl border border-slate-800 transition-all">
                 <div className="bg-slate-800 p-3 px-6 border-b border-slate-700 flex justify-between items-center">
                     <h3 className="text-slate-300 font-bold text-sm flex items-center gap-3">
                        <FileCode size={20} className="text-indigo-400" /> {currentQ.fileSource || 'Project Snippet'}
                     </h3>
                     <span className="text-[9px] bg-slate-900 text-indigo-400 px-3 py-1 rounded-full uppercase font-black tracking-widest border border-indigo-900/50">{currentQ.difficulty}</span>
                 </div>
                 <div className="flex-1 overflow-auto p-6 bg-[#0b1120] code-scroll">
                     {currentQ.snippet && (
                         <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-words">
                            <code className="text-slate-100">{currentQ.snippet}</code>
                         </pre>
                     )}
                 </div>
                 <div className="p-6 bg-slate-800 border-t border-slate-700">
                     <div className="flex items-start gap-5">
                         <div className="flex flex-col gap-2 shrink-0">
                            <button 
                                onClick={handlePlayAudio} 
                                className={`p-5 rounded-2xl text-white shadow-2xl transition-all active:scale-90 flex-shrink-0 ${isSpeaking || isAudioLoading ? 'bg-orange-500 animate-pulse' : (audioError ? 'bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500')}`}
                                title="Putar Suara Penguji"
                            >
                                {isAudioLoading ? <Loader2 className="animate-spin" size={28} /> : (isSpeaking ? <Radio size={28} /> : (audioError ? <VolumeX size={28} /> : <Volume2 size={28} />))}
                            </button>
                            <span className="text-[9px] text-indigo-300 font-black uppercase text-center mt-1">Voice</span>
                         </div>
                         <div className="flex-1">
                             <h4 className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-[0.25em] flex items-center gap-2">
                                <Zap size={14} className="text-yellow-400" /> INSTRUKSI PENGUJI AI
                                {isSpeaking && <span className="text-orange-400 animate-pulse normal-case tracking-normal ml-2 flex items-center gap-1"><Radio size={10} /> Membacakan...</span>}
                             </h4>
                             <p className="text-white text-xl font-black leading-tight drop-shadow-lg italic">"{currentQ.aiPrompt || "Mempersiapkan tantangan..."}"</p>
                         </div>
                     </div>
                 </div>
             </div>

             <div className="w-1/2 flex flex-col bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden relative transition-all">
                 {showFeedback && (
                     <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in backdrop-blur-xl ${currentQ.type === 'CODING' ? 'bg-slate-950/98' : 'bg-white/98'}`}>
                        <div className={`mb-4 p-5 rounded-full shadow-lg ${showFeedback.score >= 70 ? 'bg-emerald-100 text-emerald-600' : (showFeedback.score >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600')}`}>
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className={`text-4xl font-black mb-2 tracking-tighter uppercase ${currentQ.type === 'CODING' ? 'text-white' : 'text-slate-900'}`}>
                           HASIL SKOR: <span className="text-indigo-600">{showFeedback.score}</span>
                        </h2>
                        <div className={`max-w-md p-6 rounded-[24px] border mb-8 shadow-inner ${currentQ.type === 'CODING' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <p className="text-base italic font-bold leading-relaxed">"{showFeedback.feedback}"</p>
                        </div>
                        <button onClick={nextQuestion} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center gap-3 transition-all active:scale-95 uppercase tracking-widest">
                            {currentIdx + 1 < questions.length ? 'LANJUT KE SOAL BERIKUTNYA' : 'LIHAT RINGKASAN AKHIR'} <ArrowRightCircle size={24} />
                        </button>
                     </div>
                 )}

                 <div className="bg-slate-50 p-4 px-6 border-b border-slate-200 flex justify-between items-center">
                     <h3 className="font-black text-slate-500 flex items-center gap-3 uppercase text-[10px] tracking-widest">
                        {currentQ.type === 'ORAL' ? <Mic size={18} className="text-indigo-500" /> : <Terminal size={18} className="text-purple-500" />}
                        BOX JAWABAN MAHASISWA
                     </h3>
                     {currentQ.type === 'ORAL' && (
                        <div className="flex items-center gap-3">
                           <span className={`text-[9px] font-black uppercase tracking-widest ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                             {isListening ? 'MEREKAM SUARA...' : 'MIC OFF'}
                           </span>
                           <button onClick={toggleMic} className={`p-3 rounded-xl transition-all active:scale-90 shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600'}`}>
                               {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                           </button>
                        </div>
                     )}
                 </div>
                 
                 <div className="flex-1 flex flex-col p-6">
                    <textarea 
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        className={`flex-1 w-full p-6 text-2xl border-2 border-slate-100 bg-white rounded-3xl resize-none outline-none focus:ring-[12px] focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-black leading-relaxed ${currentQ.type === 'CODING' ? 'font-mono text-base bg-slate-950 text-emerald-400 border-slate-800 p-6' : 'text-slate-800'}`}
                        placeholder={currentQ.type === 'ORAL' ? "Ketik penjelasan logika Anda di sini..." : "// Ketik baris kodingan solusi Anda di sini..."}
                    />
                 </div>

                 <div className="p-6 px-8 bg-slate-50 border-t border-slate-100">
                     <button onClick={() => handleSubmit()} disabled={isEvaluating || !answer.trim() || isAutoTransitioning} className={`w-full py-5 rounded-2xl font-black text-xl flex justify-center items-center gap-4 transition-all active:scale-[0.98] uppercase tracking-[0.15em] shadow-xl ${!answer.trim() || isEvaluating || isAutoTransitioning ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-indigo-700 shadow-indigo-100'}`}>
                         {isEvaluating ? <><Loader2 className="animate-spin" size={28} /> ANALISA JAWABAN...</> : <><Send size={28} /> SUBMIT JAWABAN</>}
                     </button>
                 </div>
             </div>
          </div>
      </div>
  );
};
