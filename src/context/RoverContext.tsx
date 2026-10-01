import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  DeviceInfo,
  EnvironmentReading,
  RobotStatus,
  AiResult,
  SupportedLanguage,
  Solution,
} from '../types';
import {
  supabase,
  IS_SUPABASE_VALID,
  INITIAL_DEVICES,
  INITIAL_ENVIRONMENT,
  INITIAL_ROBOT_STATUS,
  INITIAL_AI_RESULTS,
  KNOWN_SOLUTIONS,
} from '../lib/supabase';
import { TRANSLATIONS } from '../i18n/translations';

interface RoverContextType {
  // Navigation & Page state
  activeSection: string;
  setActiveSection: (section: string) => void;

  // Real-time Data
  environment: EnvironmentReading | null;
  environmentHistory: EnvironmentReading[];
  devices: DeviceInfo[];
  robotStatus: RobotStatus;
  aiResults: AiResult[];
  activeAiResult: AiResult | null;
  setActiveAiResult: (res: AiResult) => void;

  // Supabase Connection & Modes
  isSupabaseLive: boolean;
  connectionMode: 'supabase' | 'demo';
  setConnectionMode: (mode: 'supabase' | 'demo') => void;
  totalRows: number;
  setTotalRows: (rows: number) => void;
  supabaseError: string | null;
  lastPacketTimestamp: string | null;

  // Injectors / Simulators
  injectHardwareReading: (reading: Partial<EnvironmentReading>) => Promise<boolean>;
  injectAiResult: (detection: Partial<AiResult>) => Promise<boolean>;
  injectRobotStatus: (status: Partial<RobotStatus>) => Promise<boolean>;

  // Drawer & Modals
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  isSimulatorModalOpen: boolean;
  setIsSimulatorModalOpen: (open: boolean) => void;

  // Language & i18n
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;

  // Voice Command System
  isVoiceListening: boolean;
  voiceTranscript: string;
  voiceStatusMessage: string;
  startVoiceListening: () => void;
  stopVoiceListening: () => void;
}

const RoverContext = createContext<RoverContextType | undefined>(undefined);

const mapEnvironmentReading = (row: any): EnvironmentReading => ({
  id: row.id !== undefined && row.id !== null ? String(row.id) : undefined,
  temperature: Number(row.temperature),
  humidity: Number(row.humidity),
  soil_moisture: Number(row.soil_moisture),
  device_id: row.device_id || 'ESP32-S3-ACT-01',
  timestamp: row.created_at || row.timestamp || new Date().toISOString(),
});

export const RoverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<string>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState<boolean>(false);
  const [totalRows, setTotalRowsState] = useState<number>(() => {
    const saved = Number(localStorage.getItem('EAAR_TOTAL_ROWS'));
    return Number.isInteger(saved) && saved >= 1 && saved <= 100 ? saved : 8;
  });

  const setTotalRows = (rows: number) => {
    const value = Math.max(1, Math.min(100, Math.round(rows)));
    setTotalRowsState(value);
    localStorage.setItem('EAAR_TOTAL_ROWS', String(value));
  };

  // Language state (persisted in localStorage)
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('EAAR_LANG') as SupportedLanguage;
    return saved && TRANSLATIONS[saved] ? saved : 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('EAAR_LANG', lang);
  };

  const t = useCallback(
    (key: string): string => {
      const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
      return langDict[key] || TRANSLATIONS.en[key] || key;
    },
    [language]
  );

  // Connection mode: if Supabase is valid, default to 'supabase', otherwise 'demo'
  const [connectionMode, setConnectionModeState] = useState<'supabase' | 'demo'>(() => {
    const saved = localStorage.getItem('EAAR_CONNECTION_MODE');
    if (saved === 'supabase' || saved === 'demo') return saved;
    return IS_SUPABASE_VALID ? 'supabase' : 'demo';
  });

  const setConnectionMode = (mode: 'supabase' | 'demo') => {
    setConnectionModeState(mode);
    localStorage.setItem('EAAR_CONNECTION_MODE', mode);
  };

  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [lastPacketTimestamp, setLastPacketTimestamp] = useState<string | null>(null);

  // State data
  const [environment, setEnvironment] = useState<EnvironmentReading | null>(() => {
    return connectionMode === 'demo' ? INITIAL_ENVIRONMENT : null;
  });
  const [environmentHistory, setEnvironmentHistory] = useState<EnvironmentReading[]>([INITIAL_ENVIRONMENT]);
  const [devices, setDevices] = useState<DeviceInfo[]>(INITIAL_DEVICES);
  const [robotStatus, setRobotStatus] = useState<RobotStatus>(INITIAL_ROBOT_STATUS);
  const [aiResults, setAiResults] = useState<AiResult[]>(INITIAL_AI_RESULTS);
  const [activeAiResult, setActiveAiResult] = useState<AiResult | null>(INITIAL_AI_RESULTS[0]);

  // Voice Command System
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string>('');
  const speechRecognitionRef = useRef<any>(null);

  // 1. SUPABASE REALTIME SUBSCRIPTIONS
  useEffect(() => {
    if (connectionMode !== 'supabase' || !supabase) {
      setIsSupabaseLive(false);
      return;
    }

    let isMounted = true;

    const setupSupabase = async () => {
      const client = supabase;
      if (!client) {
        setIsSupabaseLive(false);
        return;
      }

      try {
        setSupabaseError(null);

        // Fetch initial recent readings from the actual environment_readings schema.
        const { data: envData, error: envError } = await client
          .from('environment_readings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);

        if (envError) {
          console.warn('Supabase env read error:', envError.message);
          setSupabaseError(`Supabase query notice: ${envError.message}`);
        } else if (envData && envData.length > 0 && isMounted) {
          const history = envData.map(mapEnvironmentReading).reverse();
          const latest = history[history.length - 1];
          setEnvironment(latest);
          setEnvironmentHistory(history);
          setLastPacketTimestamp(latest.timestamp);
        } else if (isMounted) {
          setEnvironment(null);
          setEnvironmentHistory([]);
          setLastPacketTimestamp(null);
        }

        // Fetch devices
        const { data: devData } = await client.from('devices').select('*');
        if (devData && devData.length > 0 && isMounted) {
          setDevices(devData);
        }

        // Fetch latest robot status
        const { data: botData } = await client
          .from('robot_status')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1);
        if (botData && botData.length > 0 && isMounted) {
          setRobotStatus(botData[0]);
        }

        // Fetch AI Results
        const { data: aiData } = await client
          .from('ai_results')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10);
        if (aiData && aiData.length > 0 && isMounted) {
          const resultsWithSolutions = aiData.map((res: any) => ({
            ...res,
            solution: KNOWN_SOLUTIONS[res.disease] || {
              disease: res.disease,
              treatment: 'Broad-Spectrum Botanical Treatment',
              pesticide: 'Organic Copper / Neem formulation',
              quantity: '2.0 g/L',
              application_method: 'Localized electrostatic spray',
              timing: 'Morning cool window',
              spraying_info: 'Robotic precision burst',
            },
          }));
          setAiResults(resultsWithSolutions);
          setActiveAiResult(resultsWithSolutions[0]);
        }

        if (isMounted) {
          setIsSupabaseLive(true);
        }

        // Setup Realtime Channel
        const channel = client
          .channel('eaar_realtime_stream')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'environment_readings' },
            (payload) => {
              if (!isMounted) return;
              const newReading = mapEnvironmentReading(payload.new);
              setEnvironment(newReading);
              setLastPacketTimestamp(newReading.timestamp);
              setEnvironmentHistory((prev) => [...prev.slice(-19), newReading]);

              setDevices((prev) =>
                prev.map((d) =>
                  d.device_type === 'esp32_s3'
                    ? { ...d, status: 'online', last_seen: new Date().toISOString() }
                    : d
                )
              );
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'robot_status' },
            (payload) => {
              if (!isMounted) return;
              const newStatus = payload.new as RobotStatus;
              setRobotStatus(newStatus);
              setLastPacketTimestamp(newStatus.timestamp || new Date().toISOString());
              setDevices((prev) =>
                prev.map((d) =>
                  d.device_type === 'esp32_devkit'
                    ? { ...d, status: 'online', last_seen: new Date().toISOString() }
                    : d
                )
              );
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'ai_results' },
            (payload) => {
              if (!isMounted) return;
              const newAi = payload.new as AiResult;
              const enriched: AiResult = {
                ...newAi,
                solution: KNOWN_SOLUTIONS[newAi.disease] || {
                  disease: newAi.disease,
                  treatment: 'Targeted Agronomic Solution',
                  pesticide: 'Field compound',
                  quantity: '2.0 g/L',
                  application_method: 'Electrostatic canopy spray',
                  timing: 'Early morning',
                  spraying_info: 'Precision burst',
                },
              };
              setAiResults((prev) => [enriched, ...prev.slice(0, 19)]);
              setActiveAiResult(enriched);
              setLastPacketTimestamp(newAi.timestamp || new Date().toISOString());

              setDevices((prev) =>
                prev.map((d) =>
                  d.device_type === 'raspberry_pi'
                    ? { ...d, status: 'online', last_seen: new Date().toISOString() }
                    : d
                )
              );
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'devices' },
            (payload) => {
              if (!isMounted) return;
              const updatedDev = payload.new as DeviceInfo;
              setDevices((prev) =>
                prev.map((d) => (d.device_id === updatedDev.device_id ? { ...d, ...updatedDev } : d))
              );
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsSupabaseLive(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setIsSupabaseLive(false);
            }
          });

        return () => {
          supabase?.removeChannel(channel);
        };
      } catch (err: any) {
        if (isMounted) {
          console.warn('Supabase Realtime setup notice:', err);
          setIsSupabaseLive(false);
          setSupabaseError(err?.message || 'Supabase connection issue');
        }
      }
    };

    const cleanup = setupSupabase();

    return () => {
      isMounted = false;
      cleanup.then((fn) => fn && fn());
    };
  }, [connectionMode]);

  // Heartbeat checker for device online/offline transitions
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDevices((prev) =>
        prev.map((dev) => {
          const lastSeenMs = new Date(dev.last_seen).getTime();
          const diffMinutes = (now - lastSeenMs) / 60000;
          if (connectionMode === 'supabase' && diffMinutes > 10 && dev.status === 'online') {
            return { ...dev, status: 'standby' };
          }
          return dev;
        })
      );
    }, 15000);

    return () => clearInterval(timer);
  }, [connectionMode]);

  // Injectors: write directly to Supabase if connected, or update local demo state
  const injectHardwareReading = useCallback(
    async (reading: Partial<EnvironmentReading>): Promise<boolean> => {
      const fullReading: EnvironmentReading = {
        temperature: reading.temperature ?? 27.5,
        humidity: reading.humidity ?? 65.0,
        soil_moisture: reading.soil_moisture ?? 58.0,
        device_id: reading.device_id || 'ESP32-S3-ACT-01',
        timestamp: new Date().toISOString(),
      };

      if (connectionMode === 'supabase' && supabase) {
        try {
          const { error } = await supabase.from('environment_readings').insert([
            {
              temperature: fullReading.temperature,
              humidity: fullReading.humidity,
              soil_moisture: fullReading.soil_moisture,
            },
          ]);
          if (error) {
            console.error('Failed to insert into Supabase:', error);
            setEnvironment(fullReading);
            setEnvironmentHistory((prev) => [...prev.slice(-19), fullReading]);
            return false;
          }
          setLastPacketTimestamp(fullReading.timestamp);
          return true;
        } catch (e) {
          console.error(e);
          setEnvironment(fullReading);
          return false;
        }
      } else {
        setEnvironment(fullReading);
        setEnvironmentHistory((prev) => [...prev.slice(-19), fullReading]);
        setLastPacketTimestamp(fullReading.timestamp);
        setDevices((prev) =>
          prev.map((d) =>
            d.device_type === 'esp32_s3'
              ? { ...d, status: 'online', last_seen: new Date().toISOString() }
              : d
          )
        );
        return true;
      }
    },
    [connectionMode]
  );

  const injectAiResult = useCallback(
    async (detection: Partial<AiResult>): Promise<boolean> => {
      const diseaseName = detection.disease || 'Early Blight (Alternaria solani)';
      const fullAiResult: AiResult = {
        id: `ai-${Date.now()}`,
        batch_id: detection.batch_id || `BATCH-${new Date().toISOString().slice(0, 10)}`,
        plant_name: detection.plant_name || 'Tomato (Solanum lycopersicum)',
        capture_step: detection.capture_step || Math.floor(Math.random() * 50) + 1,
        disease: diseaseName,
        confidence: detection.confidence ?? 94.2,
        affected_percentage: detection.affected_percentage ?? 24.0,
        severity: detection.severity || 'Moderate',
        timestamp: new Date().toISOString(),
        solution: KNOWN_SOLUTIONS[diseaseName] || {
          disease: diseaseName,
          treatment: 'Targeted Field Spray',
          pesticide: 'Custom bio-pesticide',
          quantity: '2.0 g/L',
          application_method: 'Electrostatic spray nozzle',
          timing: 'Dawn / Pre-sunset',
          spraying_info: 'Precision pulse',
        },
      };

      if (connectionMode === 'supabase' && supabase) {
        try {
          const { error } = await supabase.from('ai_results').insert([
            {
              batch_id: fullAiResult.batch_id,
              plant_name: fullAiResult.plant_name,
              disease: fullAiResult.disease,
              confidence: fullAiResult.confidence,
              affected_percentage: fullAiResult.affected_percentage,
              severity: fullAiResult.severity,
              timestamp: fullAiResult.timestamp,
            },
          ]);
          if (error) {
            console.error('Supabase AI insert error:', error);
            setAiResults((prev) => [fullAiResult, ...prev.slice(0, 19)]);
            setActiveAiResult(fullAiResult);
            return false;
          }
          setLastPacketTimestamp(fullAiResult.timestamp);
          return true;
        } catch (e) {
          setAiResults((prev) => [fullAiResult, ...prev.slice(0, 19)]);
          setActiveAiResult(fullAiResult);
          return false;
        }
      } else {
        setAiResults((prev) => [fullAiResult, ...prev.slice(0, 19)]);
        setActiveAiResult(fullAiResult);
        setLastPacketTimestamp(fullAiResult.timestamp);
        setDevices((prev) =>
          prev.map((d) =>
            d.device_type === 'raspberry_pi'
              ? { ...d, status: 'online', last_seen: new Date().toISOString() }
              : d
          )
        );
        return true;
      }
    },
    [connectionMode]
  );

  const injectRobotStatus = useCallback(
    async (statusUpdate: Partial<RobotStatus>): Promise<boolean> => {
      const updated: RobotStatus = {
        ...robotStatus,
        ...statusUpdate,
        timestamp: new Date().toISOString(),
      };

      if (connectionMode === 'supabase' && supabase) {
        try {
          const { error } = await supabase.from('robot_status').insert([updated]);
          if (error) {
            console.warn('Robot status update error:', error);
            setRobotStatus(updated);
            return false;
          }
          setRobotStatus(updated);
          return true;
        } catch {
          setRobotStatus(updated);
          return false;
        }
      } else {
        setRobotStatus(updated);
        setLastPacketTimestamp(updated.timestamp);
        return true;
      }
    },
    [connectionMode, robotStatus]
  );

  // Web Speech API for Voice Commands
  const startVoiceListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatusMessage('Speech recognition not supported in this browser environment.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceStatusMessage('Listening for agricultural command...');
      };

      recognition.onresult = async (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setVoiceTranscript(transcript);

        const lower = transcript.toLowerCase();
        if (lower.includes('home')) {
          setActiveSection('home');
          setVoiceStatusMessage('Navigated to Home');
          return;
        } else if (lower.includes('architecture') || lower.includes('system')) {
          setActiveSection('architecture');
          setVoiceStatusMessage('Navigated to System Architecture');
          return;
        } else if (lower.includes('result') || lower.includes('disease') || lower.includes('temperature') || lower.includes('humidity')) {
          setActiveSection('results');
        } else if (lower.includes('device') || lower.includes('hardware')) {
          setActiveSection('devices');
        } else if (lower.includes('status') || lower.includes('live') || lower.includes('robot')) {
          setActiveSection('live-status');
        }

        setVoiceStatusMessage('Analyzing with Gemini Voice AI...');
        try {
          const res = await fetch('/api/gemini/voice-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript,
              dashboardContext: {
                environment,
                robotStatus,
                activeAiResult,
              },
              language,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const answer = data.answer || 'Command received.';
            setVoiceStatusMessage(answer);

            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(answer.slice(0, 180));
              utterance.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
              window.speechSynthesis.speak(utterance);
            }
          } else {
            setVoiceStatusMessage(`Command logged: "${transcript}"`);
          }
        } catch {
          setVoiceStatusMessage(`Command processed: "${transcript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        setIsVoiceListening(false);
        setVoiceStatusMessage(`Voice error: ${event.error || 'Check microphone permission'}`);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setIsVoiceListening(false);
      setVoiceStatusMessage(`Could not start speech recognition: ${e?.message || e}`);
    }
  }, [language, injectRobotStatus]);

  const stopVoiceListening = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsVoiceListening(false);
  }, []);

  return (
    <RoverContext.Provider
      value={{
        activeSection,
        setActiveSection,
        environment,
        environmentHistory,
        devices,
        robotStatus,
        aiResults,
        activeAiResult,
        setActiveAiResult,
        isSupabaseLive,
        connectionMode,
        setConnectionMode,
        totalRows,
        setTotalRows,
        supabaseError,
        lastPacketTimestamp,
        injectHardwareReading,
        injectAiResult,
        injectRobotStatus,
        isDrawerOpen,
        setIsDrawerOpen,
        isConfigModalOpen,
        setIsConfigModalOpen,
        isSimulatorModalOpen,
        setIsSimulatorModalOpen,
        language,
        setLanguage,
        t,
        isVoiceListening,
        voiceTranscript,
        voiceStatusMessage,
        startVoiceListening,
        stopVoiceListening,
      }}
    >
      {children}
    </RoverContext.Provider>
  );
};

export const useRover = (): RoverContextType => {
  const context = useContext(RoverContext);
  if (!context) {
    throw new Error('useRover must be used within a RoverProvider');
  }
  return context;
};
