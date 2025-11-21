// Text-to-Speech service using Web Speech API

type SpeechProfile = {
  rate?: number;
  pitch?: number;
  volume?: number;
};

const LANGUAGE_SPEECH_PROFILES: Record<string, SpeechProfile> = {
  default: { rate: 1.0, pitch: 1.0, volume: 1.0 },
  en: { rate: 1.0, pitch: 1.0 },
  ta: { rate: 0.88, pitch: 1.05 },
  hi: { rate: 0.90, pitch: 1.04 },
  fr: { rate: 0.96, pitch: 1.05 },
  es: { rate: 0.98, pitch: 1.03 },
  de: { rate: 0.97, pitch: 0.98 },
  it: { rate: 0.99, pitch: 1.04 },
  pt: { rate: 0.97, pitch: 1.0 },
  zh: { rate: 0.94, pitch: 1.02 },
  ja: { rate: 0.93, pitch: 1.05 },
  ko: { rate: 0.95, pitch: 1.0 },
  ar: { rate: 0.9, pitch: 0.98 },
  ru: { rate: 0.96, pitch: 0.96 },
  nl: { rate: 0.99, pitch: 1.0 },
  pl: { rate: 0.97, pitch: 1.0 },
  tr: { rate: 0.98, pitch: 0.99 },
};

const LANGUAGE_VOICE_PREFERENCES: Record<string, string[]> = {
  en: ['Google US English', 'Google UK English Male', 'Microsoft Zira - English (United States)', 'Microsoft David - English (United States)'],
  ta: ['Google தமிழ்', 'Microsoft Pavitra - Tamil (India)'],
  fr: ['Google français', 'Microsoft Hortense Desktop - French', 'Microsoft Claude - French (Canada)'],
  es: ['Google español', 'Microsoft Helena - Spanish (Spain)', 'Microsoft Sabina - Spanish (Mexico)'],
  de: ['Google Deutsch', 'Microsoft Hedda - German (Germany)'],
  it: ['Google italiano', 'Microsoft Cosimo - Italian (Italy)'],
  pt: ['Google português do Brasil', 'Microsoft Daniel - Portuguese (Brazil)'],
  hi: ['Google हिन्दी', 'Microsoft Kalpana - Hindi (India)'],
  ja: ['Google 日本語', 'Microsoft Haruka - Japanese'],
  ko: ['Google 한국의', 'Microsoft Heami - Korean'],
  zh: ['Google 普通话（中国大陆）', 'Microsoft Tracy - Chinese (Simplified, PRC)'],
  ar: ['Google العربية', 'Microsoft Hoda - Arabic (Egypt)'],
  ru: ['Google русский', 'Microsoft Irina - Russian (Russia)'],
  nl: ['Google Nederlands', 'Microsoft Frank - Dutch (Netherlands)'],
  pl: ['Google polski', 'Microsoft Paulina - Polish (Poland)'],
  tr: ['Google Türkçe', 'Microsoft Seda - Turkish'],
};

class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return this.synth !== null;
  }

  public speak(text: string, onEnd?: () => void, lang: string = 'en-US', voiceId?: string): void {
    if (!this.synth) {
      console.warn('Speech synthesis is not available');
      return;
    }

    // Stop any current speech
    this.stop();

    // Clean text for voice output
    const cleanText = text.trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;

    // Configure voice settings per language for clarity
    const langPrefix = lang.split('-')[0].toLowerCase();
    let profile = LANGUAGE_SPEECH_PROFILES[langPrefix] || LANGUAGE_SPEECH_PROFILES[lang.toLowerCase()] || LANGUAGE_SPEECH_PROFILES.default;
    
    // Function to apply voice-specific tuning for Microsoft Zira and David for Tamil and Hindi
    const applyVoiceSpecificTuning = (voiceName: string | null, langCode: string) => {
      if (!voiceName) return;
      
      const voiceLower = voiceName.toLowerCase();
      const isZira = voiceLower.includes('zira');
      const isDavid = voiceLower.includes('david');
      const isTamil = langCode === 'ta' || langCode.startsWith('ta-');
      const isHindi = langCode === 'hi' || langCode.startsWith('hi-');
      
      if ((isZira || isDavid) && isTamil) {
        // Optimized settings for Microsoft Zira/David speaking Tamil
        utterance.rate = 0.85;  // Slower for better Tamil pronunciation clarity
        utterance.pitch = 1.08; // Higher pitch for clearer enunciation
        utterance.volume = 1.0;
        return;
      }
      
      if ((isZira || isDavid) && isHindi) {
        // Optimized settings for Microsoft Zira/David speaking Hindi
        utterance.rate = 0.87;  // Slower for better Hindi pronunciation clarity
        utterance.pitch = 1.06; // Higher pitch for clearer enunciation
        utterance.volume = 1.0;
        return;
      }
      
      // General tuning for Tamil and Hindi even without Zira/David
      if (isTamil) {
        utterance.rate = 0.88;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        return;
      }
      
      if (isHindi) {
        utterance.rate = 0.90;
        utterance.pitch = 1.04;
        utterance.volume = 1.0;
        return;
      }
    };
    
    // Set default profile first
    utterance.rate = profile.rate ?? LANGUAGE_SPEECH_PROFILES.default.rate!;
    utterance.pitch = profile.pitch ?? LANGUAGE_SPEECH_PROFILES.default.pitch!;
    utterance.volume = profile.volume ?? LANGUAGE_SPEECH_PROFILES.default.volume!;

    // Function to set voice
    const setVoice = () => {
      const voices = this.synth?.getVoices() || [];
      const langCode = lang.toLowerCase();
      const langPrefixLocal = langCode.split('-')[0];
      const isTamil = langPrefix === 'ta';
      const isHindi = langPrefix === 'hi';
      
      // If a specific voice is requested (especially for Tamil/Hindi with English voices)
      if (voiceId) {
        const selectedVoice = voices.find(v => v.voiceURI === voiceId || v.name === voiceId);
        if (selectedVoice) {
          // Apply voice-specific tuning for Zira/David with Tamil/Hindi
          applyVoiceSpecificTuning(selectedVoice.name, langPrefix);
          
          // For Tamil and Hindi, allow English voices (Zira/David) to work
          // For other languages, check if voice matches the language
          if (isTamil || isHindi || selectedVoice.lang.startsWith(langPrefix) || selectedVoice.lang === lang) {
            utterance.voice = selectedVoice;
            return;
          }
          // If selected voice doesn't match language and not Tamil/Hindi, fall through
        }
      }
      
      // For Tamil and Hindi, prefer Microsoft Zira/David if available (they work better)
      if (isTamil || isHindi) {
        const ziraVoice = voices.find(v => v.name.toLowerCase().includes('zira'));
        const davidVoice = voices.find(v => v.name.toLowerCase().includes('david'));
        
        // Prefer Zira for Tamil/Hindi if available
        if (ziraVoice) {
          applyVoiceSpecificTuning(ziraVoice.name, langPrefix);
          utterance.voice = ziraVoice;
          return;
        }
        
        // Fallback to David if Zira not available
        if (davidVoice) {
          applyVoiceSpecificTuning(davidVoice.name, langPrefix);
          utterance.voice = davidVoice;
          return;
        }
      }
      
      // Try exact language match first (e.g., 'en-US' matches 'en-US')
      const exactMatch = voices.find(v => v.lang.toLowerCase() === langCode);
      if (exactMatch) {
        applyVoiceSpecificTuning(exactMatch.name, langPrefix);
        utterance.voice = exactMatch;
        return;
      }
      
      // Then try prefix match (e.g., 'en' matches 'en-US', 'en-GB', etc.)
      const matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefixLocal));
      if (matchingVoice) {
        applyVoiceSpecificTuning(matchingVoice.name, langPrefix);
        utterance.voice = matchingVoice;
        return;
      }

      // Try curated voice preferences for better pronunciation
      const preferredVoiceList = [
        ...(LANGUAGE_VOICE_PREFERENCES[langCode] || []),
        ...(LANGUAGE_VOICE_PREFERENCES[langPrefixLocal] || []),
      ];

      for (const preferredName of preferredVoiceList) {
        const preferredVoice = voices.find(v => v.name.toLowerCase().includes(preferredName.toLowerCase()));
        if (preferredVoice) {
          applyVoiceSpecificTuning(preferredVoice.name, langPrefix);
          utterance.voice = preferredVoice;
          return;
        }
      }

      // For Tamil/Hindi, fallback to Microsoft voices if native voices not found
      if (isTamil || isHindi) {
        const microsoftVoices = [
          'Microsoft Zira - English (United States)',
          'Microsoft David - English (United States)',
        ];
        
        for (const preferred of microsoftVoices) {
          const voice = voices.find(v => v.name.includes(preferred));
          if (voice) {
            applyVoiceSpecificTuning(voice.name, langPrefix);
            utterance.voice = voice;
            return;
          }
        }
      }

      // Fallback to preferred English voices if language not found
      const preferredVoices = [
        'Google UK English Male',
        'Google US English',
        'Microsoft Zira - English (United States)',
        'Microsoft David - English (United States)',
      ];

      for (const preferred of preferredVoices) {
        const voice = voices.find(v => v.name.includes(preferred));
        if (voice) {
          applyVoiceSpecificTuning(voice.name, langPrefix);
          utterance.voice = voice;
          return;
        }
      }

      // If no preferred voice found, use default
      if (!utterance.voice && voices.length > 0) {
        // Prefer English voices
        const englishVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
        if (englishVoice) {
          applyVoiceSpecificTuning(englishVoice.name, langPrefix);
          utterance.voice = englishVoice;
        } else {
          applyVoiceSpecificTuning(voices[0].name, langPrefix);
          utterance.voice = voices[0]; // Fallback to first available voice
        }
      }
    };

    // Try to set voice immediately
    setVoice();

    // If voices aren't loaded yet, wait for them
    if (!utterance.voice && this.synth) {
      const voicesChanged = () => {
        setVoice();
        this.synth?.removeEventListener('voiceschanged', voicesChanged);
      };
      this.synth.addEventListener('voiceschanged', voicesChanged);
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (error) => {
      // Silently handle 'not-allowed' errors (browser blocking autoplay)
      if (error.error !== 'not-allowed') {
        console.error('Speech synthesis error:', error);
      }
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth && this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) {
      return [];
    }
    return this.synth.getVoices();
  }
}

export const voiceService = new VoiceService();

