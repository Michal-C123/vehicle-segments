import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Camera, 
  Upload, 
  Car, 
  Search, 
  Loader2, 
  Info, 
  X, 
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type AnalysisResult = {
  segment: string;
  segmentCode: string;
  confidence: string;
  description: string;
  rate: string;
  alternatives: string[];
};

const SEGMENT_RATES: Record<string, string> = {
  "A": "78 zł",
  "B": "80 zł",
  "C": "91 zł",
  "D": "135 zł",
  "D Premium": "199 zł",
  "E": "264 zł",
  "F": "526 zł",
  "G": "441 zł",
  "K": "152 zł",
  "Crossover": "112 zł",
  "SUV": "137 zł",
  "SUV Premium": "257 zł",
  "I": "425 zł",
  "M": "116 zł",
  "N/R": "218 zł"
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Proszę wybrać plik graficzny.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setImage(imageData);
      setResult(null);
      setError(null);
      // Trigger analysis automatically
      analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = imageData.split(',')[1];
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: `Jesteś ekspertem motoryzacyjnym. Przeanalizuj to zdjęcie i zidentyfikuj segment pojazdu zgodnie z poniższą klasyfikacją:

                TABELA SEGMENTÓW:
                - A: miejskie (mini) - np. Toyota Aygo, Skoda Citigo, Volkswagen Up
                - B: małe - np. Toyota Yaris, Renault Clio, Opel Corsa, Skoda Fabia, Hyundai i20
                - C: kompaktowe (klasa niższa średnia) - np. Toyota Auris, Opel Astra, Renault Megane, Ford Focus, Audi A3, Skoda Octavia, Hyundai i30
                - D: klasa średnia (samochody rodzinne) - np. Toyota Avensis, Renault Talisman, Opel Insignia, Skoda SuperB, Hyundai i40, Ford Mondeo, KIA Optima, Peugeot 508, Volkswagen Passat, Mazda 6
                - D Premium: klasa średnia premium - np. Audi A4, BMW 3, Lexus IS, Infiniti Q50, Jaguar XE
                - E: klasa wyższa - np. Audi A6, BMW 5, Mercedes Benz E, Volvo S90, Jaguar XF
                - F: luksusowe - np. Audi A8, Porsche Panamera, Lexus LS, BMW Serii 7, Mercedes Benz klasy S
                - G: sportowe - np. Audi TT, Nissan 350Z, BMW Z4, Mazda MX5, Porsche 911
                - K: vany - np. Volkswagen Touran, Ford C-Max, Seat Alhambra, Citroen Xsara Picasso
                - Crossover: crossover - np. Seat Arona, Toyota CH-R, Mini Cooper Countryman, Suzuki SX4 S-Cross, Volkswagen T-Roc, Peugeot 3008, Opel Mokka
                - SUV: sportowo-użytkowe - np. Toyota RAV4, Honda CR-V, KIA Sportage, Renault Kadjar, Jeep Renegade
                - SUV Premium: sportowo-użytkowe premium - np. BMW X3, Audi Q3, Mercedes Benz GLC, Volvo XC60
                - I: sportowo-terenowe premium - np. BMW X5, BMW X6, Mercedes Benz GLE, Audi Q7, Porsche Cayenne, Lexus RX, Jaguar F-Pace, Volvo XC90
                - M: dostawcze małe - np. Renault Kangoo, Citroen Berlingo
                - N/R: dostawcze duże / 9 osobowe - np. Fiat Ducato, Peugeot Boxer, Renault Traffic, Opel Vivaro

                Zwróć odpowiedź w formacie JSON:
                {
                  "segment": "Kod segmentu (np. A, B, C, D Premium, SUV itp.)",
                  "segmentName": "Pełna nazwa segmentu z tabeli",
                  "confidence": "Wysoka/Średnia/Niska",
                  "description": "Krótki opis (dokładnie jedno zdanie) dlaczego to ten segment, wymień rozpoznany model jeśli to możliwe",
                  "alternatives": ["alternatywny segment 1", "alternatywny segment 2"]
                }
                
                Odpowiadaj wyłącznie w języku polskim.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        const parsedResult = JSON.parse(text);
        const segmentCode = parsedResult.segment;
        const rate = SEGMENT_RATES[segmentCode] || "Do ustalenia";
        
        setResult({
          ...parsedResult,
          segmentCode,
          rate,
          segment: `${segmentCode} - ${parsedResult.segmentName}`
        });
      } else {
        throw new Error("Nie udało się uzyskać odpowiedzi od AI.");
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError("Wystąpił błąd podczas analizy zdjęcia. Spróbuj ponownie.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Car size={24} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">Balcia</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 leading-none">Vehicle Segment AI</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              v1.0 Powered by Gemini
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence>
          {result && (
            <motion.div 
              key="result-summary"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Car size={28} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block mb-0.5">Zidentyfikowany Segment</span>
                  <h2 className="font-display font-bold text-2xl md:text-3xl">{result.segment}</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-xl flex flex-col items-start min-w-[120px]">
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">Stawka Dobowa</span>
                  <span className="text-xl font-display font-bold">{result.rate}</span>
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 h-full self-stretch">
                  <CheckCircle2 size={16} />
                  PEWNOŚĆ: {result.confidence}
                </div>
                <button 
                  onClick={reset}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 transition-colors px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 h-full self-stretch"
                >
                  <X size={16} />
                  Nowa analiza
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Preview */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-display font-semibold text-lg text-slate-800 flex items-center gap-2">
                  <Upload size={18} className="text-indigo-500" />
                  Dodaj zdjęcie pojazdu
                </h2>
                {image && (
                  <button 
                    onClick={reset}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Usuń zdjęcie"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="p-6">
                {!image ? (
                  <div 
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <Camera size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-700">Kliknij lub przeciągnij zdjęcie tutaj</p>
                      <p className="text-sm text-slate-400 mt-1">Obsługiwane formaty: JPG, PNG, WebP</p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
                      <img 
                        src={image} 
                        alt="Preview" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    {!result && !isAnalyzing && (
                      <div className="w-full bg-indigo-50 text-indigo-700 font-medium py-4 rounded-2xl flex items-center justify-center gap-2 border border-indigo-100">
                        <Loader2 size={20} className="animate-spin" />
                        Przesłano zdjęcie, trwa automatyczna analiza...
                      </div>
                    )}

                    {isAnalyzing && (
                      <div className="w-full bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl flex items-center justify-center gap-3">
                        <Loader2 size={20} className="animate-spin text-indigo-600" />
                        Trwa analiza pojazdu...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 h-full flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Info size={40} />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="font-display font-bold text-slate-800 text-lg">Czekam na zdjęcie</h3>
                    <p className="text-slate-500 text-sm mt-2">
                      Dodaj zdjęcie samochodu, aby dowiedzieć się, do jakiego segmentu rynkowego należy.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Main Result Card */}
                  <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Opis Ekspercki</h4>
                        <p className="text-slate-700 leading-relaxed">
                          {result.description}
                        </p>
                      </div>

                      <div className="h-px bg-slate-100" />

                      {result.alternatives && result.alternatives.length > 0 && (
                        <>
                          <div className="h-px bg-slate-100" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Możliwe Alternatywy</h4>
                            <div className="flex flex-wrap gap-2">
                              {result.alternatives.map((alt, idx) => (
                                <span key={`alt-${idx}-${alt}`} className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                  {alt}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Tip Card */}
                  <section className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex gap-4">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                      <Info size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-900 text-sm">Czy wiesz, że?</h4>
                      <p className="text-indigo-700 text-xs mt-1 leading-relaxed">
                        Segmentacja pojazdów pomaga w porównywaniu aut o podobnych gabarytach i przeznaczeniu. Klasyfikacja może się różnić w zależności od rynku (UE vs USA).
                      </p>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Car size={20} />
            <span className="font-display font-bold text-lg">Balcia</span>
          </div>
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Balcia AI. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors text-sm font-medium">O projekcie</a>
            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors text-sm font-medium">Prywatność</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
