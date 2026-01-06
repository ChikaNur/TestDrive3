
import React, { useState, useEffect, useRef } from 'react';
import { Question, ExamResult } from '../types';
import { playTextToSpeech, evaluateResponse } from '../services/geminiService';
import { Mic, MicOff, Send, Volume2, CheckCircle2, XCircle, Code2, Loader2 } from 'lucide-react';

interface QuizInterfaceProps {
  question: Question;
  onNext: (score: number, feedback: string) => void;
  isLastQuestion: boolean;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ question, onNext, isLastQuestion }) => {
  const [answer, setAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ExamResult | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
             setAnswer(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'aborted') {
            setIsListening(false);
            return;
        }
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
         setIsListening(false);
      };
    }

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    };
  }, []);

  useEffect(() => {
    setAnswer('');
    setEvaluation(null);
    playTextToSpeech(question.aiPrompt);
  }, [question]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Browser tidak mendukung Speech Recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    
    setIsSubmitting(true);
    if(isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    try {
      const result = await evaluateResponse(question, answer);
      setEvaluation(result);
    } catch (error) {
      alert("Gagal mengevaluasi jawaban.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyColor: any = {
    'Mudah': 'bg-green-100 text-green-800 border-green-200',
    'Sedang': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Sulit': 'bg-red-100 text-red-800 border-red-200',
  };

  if (evaluation) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            {evaluation.score >= 70 ? (
              <CheckCircle2 size={64} className="text-green-500" />
            ) : (
              <XCircle size={64} className="text-orange-500" />
            )}
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Skor: {evaluation.score}/100</h2>
            <p className="text-lg text-slate-600">{evaluation.feedback}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg text-left text-sm text-slate-500">
            <p className="font-semibold mb-1">Jawaban Anda:</p>
            <p>"{answer}"</p>
          </div>

          <button
            onClick={() => onNext(evaluation.score, evaluation.feedback)}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            {isLastQuestion ? "Lihat Hasil Akhir" : "Lanjut ke Soal Berikutnya"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2 flex flex-col h-[600px] bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-200">
                <Code2 size={20} />
                <span className="font-mono text-sm">{question.fileSource}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${difficultyColor[question.difficulty as any]}`}>
                {question.difficulty}
            </span>
        </div>
        <div className="flex-1 p-6 overflow-auto code-scroll bg-[#0f172a]">
            <pre className="font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-words" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <code className="whitespace-pre-wrap break-word">{question.snippet}</code>
            </pre>
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col justify-between h-[600px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 bg-indigo-50 border-b border-indigo-100">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 shrink-0 cursor-pointer hover:bg-indigo-200 transition-colors"
                     onClick={() => playTextToSpeech(question.aiPrompt)}
                >
                    <Volume2 size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-1">Pertanyaan AI</h3>
                    <p className="text-slate-700 italic">"{question.aiPrompt}"</p>
                </div>
            </div>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4">
            <label className="text-sm font-semibold text-slate-700">Jawaban Anda:</label>
            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Jelaskan fungsi kode di samping..."
                className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                disabled={isSubmitting}
            />
            
            <div className="flex items-center gap-2">
                <button
                    onClick={toggleListening}
                    disabled={isSubmitting}
                    className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                        ${isListening 
                            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}
                    `}
                >
                    {isListening ? <><MicOff size={20} /> Stop Rec</> : <><Mic size={20} /> Record Voice</>}
                </button>
            </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
            <button
                onClick={handleSubmit}
                disabled={!answer.trim() || isSubmitting}
                className={`
                    w-full flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold text-white shadow-lg
                    transition-all transform active:scale-95
                    ${!answer.trim() || isSubmitting 
                        ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200'}
                `}
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Kirim Jawaban</>}
            </button>
        </div>
      </div>
    </div>
  );
};
