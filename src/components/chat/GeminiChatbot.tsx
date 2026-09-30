import React, { useState, useEffect, useRef } from 'react';
import { useRover } from '../../context/RoverContext';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  HelpCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'What is the current soil moisture & hydration level?',
  'Check ambient humidity and fungal spore risk',
  'What disease was detected on the latest plant?',
  'What treatment is recommended for today’s crops?',
  'What is the current autonomous robot status?',
];

export const GeminiChatbot: React.FC = () => {
  const { environment, robotStatus, activeAiResult, language, isSupabaseLive, connectionMode, t } = useRover();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      role: 'model',
      text: 'Hello! I am your EAAR Agricultural Advisor powered by Gemini. I monitor live telemetry from ESP32-S3, autonomous navigation from ESP32 DevKit, and Edge AI diagnoses from Raspberry Pi 5. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Optional spoken response using browser Web Speech synthesis for farmer convenience
  const speakResponse = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown stars/bullets for clean audio
      const cleanText = text.replace(/[*_#`]/g, '').slice(0, 240);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error
    }
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    setErrorNotice(null);
    const textToSend = userText.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Build rich, honest telemetry context without fabrication
    const dashboardContext = {
      connectionMode,
      isSupabaseLive,
      environmentalSensors: environment
        ? {
            temperature_C: environment.temperature,
            humidity_pct: environment.humidity,
            soilMoisture_pct: environment.soil_moisture,
            sourceDevice: environment.device_id,
            timestamp: environment.timestamp,
          }
        : 'Awaiting sensor reading packet from ESP32-S3',
      robotNavigation: {
        mode: robotStatus.navigation_mode,
        currentRow: robotStatus.current_row,
        currentStep: robotStatus.current_step,
        heading_deg: robotStatus.heading,
        obstacleStatus: robotStatus.obstacle_status,
        armState: robotStatus.arm_status,
        cameraState: robotStatus.camera_status,
        currentInspectionPoint: robotStatus.current_inspection_point,
      },
      latestAiCropDiagnosis: activeAiResult
        ? {
            plant: activeAiResult.plant_name,
            diseaseOrPest: activeAiResult.disease,
            confidencePct: activeAiResult.confidence,
            affectedAreaPct: activeAiResult.affected_percentage,
            severity: activeAiResult.severity,
            recommendedSolution: activeAiResult.solution,
            isHealthy: activeAiResult.disease.toLowerCase().includes('healthy') || activeAiResult.affected_percentage === 0,
          }
        : 'No plant captures processed yet by Raspberry Pi 5',
    };

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: historyPayload,
          dashboardContext,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const modelAnswer = data.text || 'I have reviewed the EAAR rover telemetry.';

      const modelMsg: ChatMessage = {
        id: `mod-${Date.now()}`,
        role: 'model',
        text: modelAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
      speakResponse(modelAnswer);
    } catch (err: any) {
      console.warn('Chatbot query failed:', err);
      // Fallback response grounded directly in live state
      let fallbackText = `Telemetry update: Current row ${robotStatus.current_row}, Mode: ${robotStatus.navigation_mode}.`;
      if (environment) {
        fallbackText += ` Temp: ${environment.temperature}°C, Humidity: ${environment.humidity}%, Soil Moisture: ${environment.soil_moisture}%.`;
      }
      if (activeAiResult) {
        fallbackText += ` Latest crop diagnosis: ${activeAiResult.disease} on ${activeAiResult.plant_name}.`;
      }

      const modelMsg: ChatMessage = {
        id: `mod-${Date.now()}`,
        role: 'model',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
      setErrorNotice('Connected via on-device telemetry fallback.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'init-msg',
        role: 'model',
        text: 'Conversation cleared. How can I assist you with the EAAR rover today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2.5 font-heading font-semibold text-xs sm:text-sm cursor-pointer"
        aria-label="Open EAAR Gemini Assistant"
      >
        <Sparkles className="w-5 h-5 text-slate-950 fill-current animate-pulse" />
        <span className="hidden sm:inline">EAAR Gemini Assistant</span>
      </button>

      {/* Slide-Up Chat Interface Modal / Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[560px] max-h-[85vh] bg-[#07130a]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#091a0e] to-[#06120a] border-b border-emerald-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-white flex items-center gap-1.5">
                  <span>EAAR Field Assistant</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    Gemini 3.5
                  </span>
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 block">
                  {isSupabaseLive ? '● Live Supabase Stream' : '● Hardware Demo Mode'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  ttsEnabled
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                    : 'bg-[#09150d] border-emerald-950 text-slate-500'
                }`}
                title={ttsEnabled ? 'Voice responses active' : 'Voice muted'}
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg bg-[#09150d] hover:bg-emerald-950 border border-emerald-950 text-slate-400 hover:text-white transition-colors"
                title="Clear conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-[#09150d] hover:bg-rose-950/60 border border-emerald-950 text-slate-400 hover:text-white transition-colors"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isModel = msg.role === 'model';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${isModel ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                      isModel
                        ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                        : 'bg-cyan-950 border border-cyan-500/60 text-cyan-300'
                    }`}
                  >
                    {isModel ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[82%] p-3 rounded-2xl font-body leading-relaxed ${
                      isModel
                        ? 'bg-[#0a1b0f] border border-emerald-900/60 text-slate-200 rounded-tl-sm'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-medium rounded-tr-sm shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`text-[9px] font-mono mt-1 ${
                        isModel ? 'text-slate-500' : 'text-slate-900/80 text-right'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="p-3 rounded-2xl bg-[#0a1b0f] border border-emerald-900/60 text-emerald-400 rounded-tl-sm flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-mono text-[11px]">Analyzing rover telemetry...</span>
                </div>
              </div>
            )}

            {errorNotice && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[10px] font-mono text-amber-300">
                {errorNotice}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel for Farmers */}
          <div className="px-3 py-2 border-t border-emerald-950 bg-[#050e07] overflow-x-auto flex gap-2 no-scrollbar">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[#0a1a0f] hover:bg-emerald-950 border border-emerald-900 text-[10px] font-mono text-emerald-300 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 bg-[#061109] border-t border-emerald-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, humidity, disease, or robot status..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#030904] border border-emerald-900/80 text-xs font-body text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold transition-colors cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
