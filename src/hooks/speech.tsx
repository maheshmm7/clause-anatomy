import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Read-aloud (text-to-speech) and voice questions (speech-to-text) using the
 * browser's built-in engines: no extra download, no audio sent to our server.
 * Both degrade gracefully: controls are hidden where the browser lacks support.
 */

interface SpeechContextValue {
  supported: boolean;
  speakingId: string | null;
  speak: (id: string, text: string, languageTag: string) => void;
  stop: () => void;
}

const SpeechContext = createContext<SpeechContextValue | null>(null);

function pickVoice(languageTag: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const normalized = (lang: string): string => lang.replace('_', '-').toLowerCase();
  const exact = voices.find((voice) => normalized(voice.lang) === languageTag.toLowerCase());
  const base = languageTag.slice(0, 2).toLowerCase();
  return exact ?? voices.find((voice) => normalized(voice.lang).startsWith(base));
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  useEffect(() => stop, [stop]);

  const speak = useCallback(
    (id: string, text: string, languageTag: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageTag;
      const voice = pickVoice(languageTag);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9; // Slightly slower is easier to follow.
      const finish = (): void => setSpeakingId((current) => (current === id ? null : current));
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
      setSpeakingId(id);
    },
    [supported],
  );

  const value = useMemo(
    () => ({ supported, speakingId, speak, stop }),
    [supported, speakingId, speak, stop],
  );
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech(): SpeechContextValue {
  const value = useContext(SpeechContext);
  if (!value) throw new Error('useSpeech must be used inside <SpeechProvider>');
  return value;
}

/* ----------------------------- Speech input ------------------------------ */

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => Recognition;

function getRecognition(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const candidate = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition;
}

export function useSpeechInput(languageTag: string, onText: (text: string) => void) {
  const RecognitionImpl = getRecognition();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!RecognitionImpl) return;
    const recognition = new RecognitionImpl();
    recognition.lang = languageTag;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (transcript) onTextRef.current(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [RecognitionImpl, languageTag]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported: RecognitionImpl !== undefined, listening, start, stop };
}
