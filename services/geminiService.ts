import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CodeFile, Difficulty, Question, ExamResult, CourseConfig } from "../types";

// Initialize Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let currentAudioSource: AudioBufferSourceNode | null = null;
let sharedAudioContext: AudioContext | null = null;
let playCounter = 0;

export const getAudioContext = () => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return sharedAudioContext;
};

// Global function to resume audio context on first user gesture
export const initAudioContext = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log("AudioContext resumed successfully");
    } catch (e) {
      console.error("Failed to resume AudioContext", e);
    }
  }
};

export const stopAllAudio = () => {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
      currentAudioSource.disconnect();
    } catch (e) {}
    currentAudioSource = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  playCounter++;
};

const parseAIJson = (text: string) => {
    try {
        const cleanJson = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        const data = JSON.parse(cleanJson);
        
        if (Array.isArray(data)) {
            return data.map(item => ({
                ...item,
                snippet: item.snippet ? String(item.snippet).replace(/\\n/g, '\n') : item.snippet
            }));
        }
        return data;
    } catch (e) {
        console.error("Failed to parse AI JSON:", text);
        try {
          const start = text.indexOf('[');
          const end = text.lastIndexOf(']');
          if (start !== -1 && end !== -1) {
            const clipped = text.substring(start, end + 1);
            return JSON.parse(clipped);
          }
        } catch (innerE) {
          console.error("Nested parsing failed", innerE);
        }
        return null;
    }
};

/**
 * Mengecek apakah kode yang diunggah terlalu sederhana (Hello World level)
 */
export const checkCodeComplexity = async (files: CodeFile[]): Promise<{ isSimple: boolean; reason: string }> => {
  const filesSample = files.slice(0, 10).map(f => `File: ${f.name}\nContent: ${f.content.substring(0, 1000)}`).join('\n---\n');
  
  const prompt = `
    Analisa apakah sekumpulan file kodingan project mahasiswa ini "TERLALU SEDERHANA" untuk sebuah tugas project IT tingkat menengah.
    
    Kriteria TERLALU SEDERHANA:
    1. Hanya berisi boilerplate (misal: hanya index.php dengan echo "hello").
    2. Tidak ada logika bisnis, perulangan, atau manipulasi data yang berarti.
    3. Jumlah baris kode produktif sangat sedikit (< 50 baris total logika).
    
    Output harus dalam JSON format:
    {
      "isSimple": boolean,
      "reason": "Alasan singkat dalam Bahasa Indonesia kenapa ini dianggap sederhana/layak"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        { text: `Source Code Sample:\n${filesSample}` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSimple: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isSimple", "reason"]
        }
      }
    });

    return JSON.parse(response.text || '{"isSimple": false, "reason": "Gagal analisa"}');
  } catch (e) {
    console.error("Complexity check failed:", e);
    return { isSimple: false, reason: "Abaikan pengecekan karena error sistem." };
  }
};

/**
 * Menganalisa kualitas kodingan secara keseluruhan
 */
export const analyzeCodebase = async (files: CodeFile[]): Promise<string> => {
  const filesContent = files.slice(0, 15).map(f => `FILE: ${f.name}\nCONTENT:\n${f.content.substring(0, 2000)}`).join('\n\n---\n\n');
  
  const prompt = `
    Bertindaklah sebagai Senior Software Architect. Lakukan review kode pada project mahasiswa berikut.
    Fokus pada:
    1. Kebersihan kode (Clean Code).
    2. Potensi Bug atau celah keamanan.
    3. Penggunaan best practices sesuai bahasa kodingannya.
    4. Saran optimasi.

    Berikan output dalam format Markdown yang rapi dengan heading, poin-poin, dan blok kode jika diperlukan.
    Gunakan Bahasa Indonesia yang profesional namun menyemangati.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        { text: `Source Code:\n${filesContent}` }
      ]
    });
    return response.text || "Gagal melakukan analisa.";
  } catch (e) {
    console.error("Code analysis failed:", e);
    return "Maaf, AI gagal menganalisa kode Anda saat ini.";
  }
};

export const generateExamContent = async (
    files: CodeFile[], 
    studentName: string, 
    config: CourseConfig,
    excludeSnippets: string[] = []
): Promise<Question[]> => {
  const priority = config.languagePriority || [];
  
  const sortedFiles = [...files].sort((a, b) => {
      const aIdx = priority.indexOf(a.language);
      const bIdx = priority.indexOf(b.language);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
  });

  const limitedFiles = sortedFiles.slice(0, 10);
  const filesContent = limitedFiles.map(f => `FILE: ${f.name}\nLANGUAGE: ${f.language}\nCONTENT:\n${f.content.substring(0, 3000)}`).join('\n\n---\n\n');

  // Oral counts
  const qEasy = Number(config.qtyEasy) || 0;
  const qMedium = Number(config.qtyMedium) || 0;
  const qHard = Number(config.qtyHard) || 0;
  
  // Coding counts
  const qCodeEasy = Number(config.qtyCodingEasy) || 0;
  const qCodeMedium = Number(config.qtyCodingMedium) || 0;
  const qCodeHard = Number(config.qtyCodingHard) || 0;
  
  const totalOral = qEasy + qMedium + qHard;
  const totalCoding = qCodeEasy + qCodeMedium + qCodeHard;
  const totalQuestions = totalOral + totalCoding;

  if (totalQuestions === 0) return [];

  const excludeContext = excludeSnippets.length > 0 
    ? `\nPENTING: Potongan kode berikut sudah digunakan tim lain, JANGAN gunakan lagi:\n${excludeSnippets.slice(0, 5).join('\n---\n')}`
    : "";

  let AI_DETAIL_STRICTNESS = "Standard: Menganalisa logika dasar dan alur data.";
  let TEMP = 0.7;
  if (config.aiDetailLevel === 1) {
    AI_DETAIL_STRICTNESS = "Basic: Bertanya tentang fungsi dasar, variabel, dan alur sederhana.";
    TEMP = 0.5;
  } else if (config.aiDetailLevel === 3) {
    AI_DETAIL_STRICTNESS = "Expert/Expert: Sangat kritis! Bedah efisiensi algoritma, security, best practices, dan kaitan antar modul.";
    TEMP = 0.9;
  }

  const instrOralContext = config.instrOral ? `\nINSTRUKSI KHUSUS LISAN: ${config.instrOral}` : "";
  const instrCodeContext = config.instrCode ? `\nINSTRUKSI KHUSUS CODING: ${config.instrCode}` : "";

  const prompt = `
    Bertindaklah sebagai Penguji IT Senior yang sangat berpengalaman. Kamu sedang menguji mahasiswa: ${studentName}.
    
    KONFIGURASI PROYEK WAJIB (Gunakan ini sebagai basis soal):
    - Jenis Proyek: ${config.projectType}
    - UI Framework: ${config.uiFramework}
    - App Framework: ${config.appFramework}
    - Level Kekritisan AI: ${AI_DETAIL_STRICTNESS}
    
    TUGAS: Hasilkan TEPAT ${totalQuestions} soal berdasarkan source code yang diberikan.

    PEMBAGIAN SOAL:
    1. SOAL UJI LISAN (Type: ORAL):
       - Mudah: ${qEasy}, Sedang: ${qMedium}, Sulit: ${qHard}.
       - Fokus: Menanyakan "Mengapa" dan "Bagaimana" logika di kode tersebut bekerja.
       ${instrOralContext}

    2. SOAL UJI CODING (Type: CODING):
       - Mudah: ${qCodeEasy}, Sedang: ${qCodeMedium}, Sulit: ${qCodeHard}.
       - Fokus: Memberikan instruksi modifikasi kode. Mahasiswa harus menulis kode baru atau memperbaiki snippet yang ada.
       - Pastikan tantangan coding sesuai dengan Framework ${config.appFramework} dan ${config.uiFramework}.
       ${instrCodeContext}

    VALIDASI TEKNOLOGI:
    - Jika mahasiswa dikonfigurasi menggunakan ${config.uiFramework} tapi kodenya tidak mencerminkan itu, tanyakan alasannya secara kritis di soal lisan.

    ATURAN JSON:
    - Snippet kode harus akurat dari file yang ada.
    - Output HARUS ARRAY JSON.
    ${excludeContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { 
        parts: [
          { text: prompt }, 
          { text: `Source code proyek mahasiswa:\n${filesContent}` }
        ] 
      },
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        temperature: TEMP,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "ORAL atau CODING" },
              fileSource: { type: Type.STRING },
              snippet: { type: Type.STRING },
              difficulty: { type: Type.STRING, description: "Mudah, Sedang, atau Sulit" },
              aiPrompt: { type: Type.STRING }
            },
            required: ["type", "aiPrompt", "difficulty", "snippet", "fileSource"]
          }
        }
      },
    });

    const rawData = parseAIJson(response.text || '[]');
    return (rawData || []).map((item: any, idx: number) => ({
        ...item,
        id: `q-${Date.now()}-${idx}`,
        aiDetailLevel: config.aiDetailLevel || 2
    }));
  } catch (e) {
    console.error("Exam generation failed:", e);
    return [];
  }
};

export const evaluateResponse = async (question: Question, answer: string): Promise<ExamResult> => {
    // 1. MANIPULASI SKOR (Diubah ke range 60-80) - Simulated
    let min = 60;
    let max = 80; 

    // Apply Bias agar tidak terlalu seragam
    if (question.type === 'ORAL') {
        min = 65; // Lisan sedikit lebih tinggi (65-80)
        max = 80;
    } else {
        min = 60;
        max = 75; // Coding sedikit lebih rendah (60-75)
    }

    let rawScore = min + (Math.random() * (max - min));
    
    // Safety clamp untuk memastikan tidak pernah tembus max atau di bawah min
    rawScore = Math.max(min, Math.min(max, rawScore));

    // Round to 1 decimal
    const score = Math.round(rawScore * 10) / 10;

    // 2. GENERATE FEEDBACK CERDAS DENGAN AI (With Circuit Breaker)
    let feedback = "";
    
    // Fungsi fallback statis (Anti-Fail)
    const getFallbackFeedback = (s: number) => {
        if (s >= 75) return "Jawaban sangat baik, logika dan implementasi teknis sudah sesuai dengan standar industri.";
        if (s >= 68) return "Jawaban cukup relevan secara logika, namun implementasi teknis bisa lebih mendetail.";
        if (s >= 65) return "Konsep dasar tertangkap, namun penjelasan belum sepenuhnya menjawab inti pertanyaan coding ini.";
        return "Jawaban masih kurang tepat. Perlu pemahaman lebih dalam mengenai alur logika kode tersebut.";
    };

    try {
        const prompt = `
            Bertindaklah sebagai Dosen Penguji IT Senior.
            Tugas: Berikan umpan balik (feedback) singkat untuk jawaban mahasiswa berikut.
            
            KONTEKS SOAL:
            - Pertanyaan Dosen: "${question.aiPrompt}"
            ${question.snippet ? `- Snippet Kode:\n${question.snippet.substring(0, 500)}...` : ''}

            JAWABAN MAHASISWA:
            "${answer}"

            INSTRUKSI FEEDBACK:
            - Bahasa: Indonesia Formal & Akademis.
            - Analisa apakah jawaban mahasiswa relevan dengan konteks kodingan/pertanyaan.
            - Jika jawaban terlihat ngawur/salah, koreksi dengan sopan.
            - Jika jawaban terlihat benar, berikan apresiasi moderat dan tambahkan sedikit insight teknis.
            - PENTING: JANGAN PERNAH MENYEBUTKAN NILAI ATAU SKOR DALAM TEKS FEEDBACK INI.
            - Panjang: Maksimal 3 kalimat.
        `;

        // Create race condition: AI vs Timeout (8 seconds)
        const feedbackPromise = ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: prompt }] },
        });

        const timeoutPromise = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const response = await Promise.race([feedbackPromise, timeoutPromise]);
        
        feedback = response.text ? response.text.trim() : "";
        
        // DeepSeek suggestion: Validation to prevent empty/short feedback
        if (!feedback || feedback.length < 10) {
             throw new Error("Feedback too short or empty");
        }

    } catch (error) {
        console.warn("Feedback generation skipped/failed (using fallback):", error);
        // Error di sini tidak akan menghentikan aplikasi, hanya switch ke fallback
    }

    // Jika AI gagal, timeout, atau return kosong, gunakan fallback
    if (!feedback) {
        feedback = getFallbackFeedback(score);
    }

    return {
        questionId: question.id,
        type: question.type,
        studentAnswer: answer,
        score: score, // Nilai ini yang akan dikirim ke MockSheet
        feedback: feedback
    };
};

function decodeBase64(base64: string) {
    const cleanBase64 = base64.replace(/\s/g, '');
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
  
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
}

export const playTextToSpeech = async (text: string): Promise<void> => {
    stopAllAudio();
    const myId = playCounter;
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch(e) {}
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Bacakan dengan nada ramah dalam bahasa Indonesia: ${text}` }] }],
        config: {
          // responseModalities values are mutually exclusive. 
          // The array MUST contain exactly one modality, which must be Modality.AUDIO.
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      
      if (myId !== playCounter) return;
      
      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
      if (!base64Audio) throw new Error("Audio data not found in response");

      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      if (myId !== playCounter) return;
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentAudioSource = source;
      
      return new Promise((resolve) => {
        source.onended = () => {
          if (myId === playCounter) currentAudioSource = null;
          resolve();
        };
        source.start(0);
      });
    } catch (error) {
      console.warn("Gemini TTS Error, falling back to WebSpeech:", error);
      if (myId !== playCounter) return;
      
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
};
