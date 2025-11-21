import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Message, PdfData } from './types';
import { UPLOAD_PASSWORD, DEFAULT_PROFILE_IMAGE } from './constants';
import { revanthBrain, fileToBase64 } from './services/geminiService';
import { voiceService } from './services/voiceService';
import { SendIcon, LockIcon, UserIcon, RobotIcon, FileIcon, CheckIcon, SpeakerIcon, SpeakerOffIcon, MicIcon, MicOffIcon, LanguageIcon, VoiceIcon, PlayIcon, PauseIcon } from './components/Icons';
import { Modal } from './components/Modal';
import ProfilePanel from './components/ProfilePanel';

import { speechRecognitionService } from './services/speechRecognitionService';

// Language options for AI responses
const LANGUAGE_OPTIONS = [
  { code: 'en-US', name: 'English' },
];

const VOICE_PREVIEW_TEXT: Record<string, string> = {
  en: "Hi! I'm Praneeth's assistant voice, ready to help.",
  es: "Hola! Soy la voz del asistente de Praneeth.",
  fr: "Salut! Je suis la voix de l'assistant de Praneeth.",
  de: "Hallo! Ich bin die Stimme von Praneeths Assistent.",
  it: "Ciao! Sono la voce dell'assistente di Praneeth.",
  pt: "Ola! Eu sou a voz do assistente do Praneeth.",
  hi: "Namaste! Main Praneeth ka assistant hoon.",
  ta: "Vanakkam! Naan Praneeth-in assistant.",
  ja: "Konnichiwa! Watashi wa Praneeth no assistant desu.",
  ko: "Annyeong! Naneun Praneeth aideuimnida.",
  zh: "Ni hao! Wo shi Praneeth de zhuli.",
  ar: "Marhaba! Ana sawt musaeid Praneeth.",
  ru: "Privet! Ya golos assistenta Praneetha.",
  nl: "Hallo! Ik ben de stem van Praneeths assistent.",
  pl: "Czesc! Jestem glosem asystenta Praneetha.",
  tr: "Merhaba! Ben Praneeth'in asistan sesi.",
};

const getPreviewText = (langCode: string) => {
  const prefix = langCode.split('-')[0].toLowerCase();
  return VOICE_PREVIEW_TEXT[prefix] || VOICE_PREVIEW_TEXT.en;
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Welcome! I'm Praneeth's personal assistant. I've got all his resume details loaded, so feel free to ask about his education, projects, skills, or anything else.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pdfFile, setPdfFile] = useState<PdfData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [activeSpeech, setActiveSpeech] = useState<{ id: string; text: string } | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'starting' | 'playing'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState<string>('en-US');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoPlayEnabled] = useState<boolean>(true);
  const [profileImage, setProfileImage] = useState<string>(() => {
    // Load from localStorage on mount, fallback to default image
    const stored = localStorage.getItem('profileImage');
    return stored || DEFAULT_PROFILE_IMAGE;
  });
  const [imageError, setImageError] = useState(false);
  
  // Reset error state when profile image changes
  useEffect(() => {
    setImageError(false);
  }, [profileImage]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-play initial welcome message on mount - DISABLED to prevent browser blocking
  // Users can manually click the speaker icon to hear the message
  // useEffect(() => {
  //   if (autoPlayEnabled && voiceService.isAvailable() && messages.length > 0 && messages[0].role === 'model') {
  //     // Small delay to ensure UI is ready and voices are loaded
  //     const timer = setTimeout(() => {
  //       const welcomeMsg = messages[0];
  //       if (welcomeMsg) {
  //         voiceService.stop();
  //         setSpeakingMessageId(welcomeMsg.id);
  //         voiceService.speak(welcomeMsg.text, () => {
  //           setSpeakingMessageId(null);
  //         }, responseLanguage, selectedVoice || undefined);
  //       }
  //     }, 1000);
  //     return () => clearTimeout(timer);
  //   }
  // }, []); // Only run on mount

  // Cleanup speech on unmount
  const stopSpeaking = useCallback(() => {
    voiceService.stop();
    setSpeakingMessageId(null);
    setActiveSpeech(null);
    setVoiceStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      speechRecognitionService.stop();
    };
  }, [stopSpeaking]);

  // Listen for profile image changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profileImage') {
        setProfileImage(e.newValue || DEFAULT_PROFILE_IMAGE);
        setImageError(false);
      }
    };

    const handleProfileImageUpdate = (e: CustomEvent) => {
      setProfileImage(e.detail || DEFAULT_PROFILE_IMAGE);
      setImageError(false);
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom events (from same tab)
    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, []);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = voiceService.getVoices();
      setAvailableVoices(voices);
    };
    
    loadVoices();
    // Voices may load asynchronously
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // When language changes, check if selected voice matches the new language
  useEffect(() => {
    if (selectedVoiceId && availableVoices.length > 0) {
      const selectedVoiceObj = availableVoices.find((voice) => voice.voiceURI === selectedVoiceId);
      if (selectedVoiceObj) {
        const langPrefix = responseLanguage.split('-')[0].toLowerCase();
        const selectedVoiceLang = selectedVoiceObj.lang.toLowerCase();
        if (!selectedVoiceLang.startsWith(langPrefix) && selectedVoiceLang !== responseLanguage.toLowerCase()) {
          setSelectedVoiceId('');
        }
      }
    }
  }, [responseLanguage, selectedVoiceId, availableVoices]); // Only check when language or voices change

  const handleSpeak = (messageId: string, text: string) => {
    if (!voiceService.isAvailable()) {
      alert("Voice playback isn't supported in this browser.");
      return;
    }

    if (speakingMessageId === messageId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    setVoiceStatus('starting');
    setSpeakingMessageId(messageId);
    setActiveSpeech({ id: messageId, text });

    voiceService.speak(
      text,
      () => {
        setVoiceStatus('idle');
        setSpeakingMessageId((current) => (current === messageId ? null : current));
        setActiveSpeech((current) => (current?.id === messageId ? null : current));
      },
      responseLanguage,
      selectedVoiceId || undefined
    );

    // Move to playing state immediately after initiating speech
    setVoiceStatus('playing');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Stop recording if active
    if (isRecording) {
      speechRecognitionService.stop();
      setIsRecording(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await revanthBrain.sendMessage(userMsg.text, responseLanguage);
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, modelMsg]);
      
      // Auto-play voice for AI responses
      if (autoPlayEnabled && voiceService.isAvailable()) {
        // Small delay to ensure message is rendered
        setTimeout(() => {
          handleSpeak(modelMsg.id, responseText);
        }, 100);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenUpload = () => {
    setIsModalOpen(true);
    setPasswordInput('');
    setAuthError('');
    setUploadStatus('idle');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === UPLOAD_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Incorrect Password.');
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      speechRecognitionService.stop();
      setIsRecording(false);
    } else {
      if (!speechRecognitionService.isAvailable()) {
        alert('Speech recognition is not available in your browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      setIsRecording(true);
      speechRecognitionService.start(
        (text, isFinal) => {
          if (text) {
            setInput(text);
            if (isFinal) {
              // Auto-submit when final result is received
              setTimeout(() => {
                handleSendMessage();
              }, 300);
            }
          }
        },
        (error) => {
          console.error('Speech recognition error:', error);
          setIsRecording(false);
          if (error === 'no-speech' || error === 'aborted') {
            // These are expected errors, don't show alert
            return;
          }
          alert(`Speech recognition error: ${error}`);
        },
        () => {
          setIsRecording(false);
        },
        responseLanguage
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
    const files = e.target.files;
    if (!files || !files[0]) {
      return;
    }

    const file = files[0];
    
    // Accept all file types, but show a warning for non-document types
    const preferredTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    const preferredExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx'];
    const fileName = file.name.toLowerCase();
    const fileExtension = '.' + fileName.split('.').pop();
    const hasPreferredExtension = preferredExtensions.includes(fileExtension);
    const hasPreferredType = file.type && preferredTypes.includes(file.type);
    
    // Warn but allow all file types
    if (!hasPreferredType && !hasPreferredExtension) {
      // Still allow upload, but note that results may vary
      console.log('Uploading non-standard file type:', file.type || fileExtension);
    }

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setAuthError('File size must be less than 20MB.');
      return;
    }

    setUploadStatus('processing');
    setAuthError('');
    
    try {
      const base64 = await fileToBase64(file);
      
      // For non-PDF files, we'll still store them but note that Gemini works best with PDFs
      const documentData: PdfData = {
        base64,
        mimeType: file.type || 'application/pdf',
        name: file.name
      };
      
      setPdfFile(documentData);
      revanthBrain.setPdfContext(documentData);
      setUploadStatus('done');
      
      // Add system message to chat
      const sysMsg: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: `Memory updated! I've just processed your ${file.name}. Ask me anything about it.`,
          timestamp: Date.now(),
      };
      setMessages(prev => [...prev, sysMsg]);
      
      // Auto-play voice for document upload confirmation
      if (autoPlayEnabled && voiceService.isAvailable()) {
        handleSpeak(sysMsg.id, sysMsg.text);
      }

      setTimeout(() => {
          setIsModalOpen(false);
          setIsAuthenticated(false); // Reset auth for security
      }, 1500);

    } catch (error) {
      console.error("File processing error", error);
      setAuthError("Failed to process document. Please try again.");
      setUploadStatus('idle');
    }
  };

  const userPrompts = messages.filter((msg) => msg.role === 'user').length;
  const modelResponses = messages.filter((msg) => msg.role === 'model').length;
  const currentLanguage = LANGUAGE_OPTIONS.find((lang) => lang.code === responseLanguage)?.name || 'English';
  const selectedVoice = useMemo(
    () => availableVoices.find((voice) => voice.voiceURI === selectedVoiceId) || null,
    [availableVoices, selectedVoiceId]
  );
  const filteredVoices = useMemo(
    () => availableVoices.filter((voice) => {
      const voiceName = voice.name.toLowerCase();
      return voiceName.includes('microsoft david') || voiceName.includes('microsoft zira');
    }),
    [availableVoices]
  );
  const voiceLabel = selectedVoice?.name || 'Auto voice';
  const statusCopy = pdfFile
    ? 'Memory core engaged with your uploaded PDF context.'
    : 'Operating with default resume intelligence.';
  return (
    <div
      className="min-h-screen bg-black text-white font-sans"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[320px,minmax(0,1fr)] items-stretch">
          <aside className="flex">
            <ProfilePanel
              className="shadow-sm w-full"
              onEditPersona={handleOpenUpload}
            />
          </aside>

          <section className="relative flex min-h-[75vh] flex-col rounded-[32px] border border-orange-500/30 bg-gray-900 text-white shadow-[0_25px_80px_rgba(251,146,60,0.15)]">
            <header className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 shadow-md bg-gray-800">
                    {!imageError ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-500/40 to-orange-600/40 flex items-center justify-center">
                        <span className="text-xl">🤖</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">Praneeth's Assistant</h1>
                  <p className="text-xs text-orange-300 flex items-center gap-1">
                    {pdfFile ? (
                      <span className="text-orange-500 flex items-center gap-1">
                        <CheckIcon className="w-3 h-3"/> Memory Loaded
                      </span>
                    ) : (
                      "Standard Mode"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsLanguageModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white rounded-full border border-orange-500/30 transition-all shadow-sm hover:shadow-md group"
                  title="Select response language"
                >
                  <LanguageIcon className="w-4 h-4 text-orange-400 group-hover:text-orange-500" />
                  <span className="hidden sm:inline">
                    {LANGUAGE_OPTIONS.find(l => l.code === responseLanguage)?.name || 'Language'}
                  </span>
                </button>

                <button 
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white rounded-full border border-orange-500/30 transition-all shadow-sm hover:shadow-md group"
                  title="Select voice"
                >
                  <VoiceIcon className="w-4 h-4 text-orange-400 group-hover:text-orange-500" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-gray-900 px-4 py-6 sm:px-8 lg:px-10">
              <div className="space-y-5">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                          isUser ? 'bg-orange-500 text-white' : 'bg-gray-800 text-orange-400'
                        }`}
                      >
                        {isUser ? <UserIcon className="h-5 w-5" /> : <RobotIcon className="h-5 w-5" />}
                      </div>
                      <div
                        className={`relative max-w-[80%] rounded-2xl border p-5 text-sm leading-relaxed shadow-sm sm:max-w-[70%] ${
                          isUser
                            ? 'border-orange-500/30 bg-orange-500/10 text-white'
                            : 'border-orange-500/20 bg-gray-800 text-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {!isUser && voiceService.isAvailable() && (
                          <button
                            onClick={() => handleSpeak(msg.id, msg.text)}
                            className={`absolute -bottom-3 right-5 rounded-full border p-2 text-xs shadow-sm transition ${
                              speakingMessageId === msg.id
                                ? 'border-orange-500 bg-orange-500 text-white'
                                : 'border-orange-500/30 bg-gray-800 text-orange-400 hover:border-orange-500 hover:text-orange-500'
                            }`}
                            title={speakingMessageId === msg.id ? 'Stop speaking' : 'Speak message'}
                          >
                            {speakingMessageId === msg.id ? (
                              <SpeakerOffIcon className="h-4 w-4" />
                            ) : (
                              <SpeakerIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-3 text-orange-400">
                    <div className="h-10 w-10 rounded-2xl bg-gray-800 text-orange-400 shadow flex items-center justify-center">
                      <RobotIcon className="h-5 w-5" />
                    </div>
                    <div className="rounded-2xl border border-orange-500/20 bg-gray-800 px-4 py-3 shadow-sm">
                      <div className="flex gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-orange-500" />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-orange-500"
                          style={{ animationDelay: '0.12s' }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-orange-500"
                          style={{ animationDelay: '0.24s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>

            <footer className="border-t border-orange-500/20 bg-gray-900 px-4 py-6 sm:px-8 lg:px-10">
              <form onSubmit={handleSendMessage} className="group relative">
                <div className="relative flex items-center gap-3 rounded-full border border-orange-500/30 bg-[#202124] px-4 py-2.5 shadow-sm">
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={isLoading}
                    className={`flex-shrink-0 rounded-2xl border px-3 py-3 transition ${
                      isRecording
                        ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
                        : 'border-orange-500/30 bg-[#202124] text-orange-500 hover:border-orange-500'
                    } disabled:opacity-50`}
                    title={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    {isRecording ? <MicOffIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about Praneeth"
                    className="w-full border-none bg-transparent text-base text-white placeholder-orange-400/60 focus:outline-none"
                    disabled={isLoading || isRecording}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || isRecording}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-gray-200 shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SendIcon className="h-5 w-5" />
                  </button>
                </div>
              </form>
              <p className="mt-3 text-center text-xs text-orange-300/70">
                Praneeth's Assistant can make mistakes. Verify important information.
              </p>
            </footer>
          </section>
        </div>
      </div>

      {/* Language Selection Modal */}
      <Modal 
        isOpen={isLanguageModalOpen} 
        onClose={() => setIsLanguageModalOpen(false)} 
        title="Select Response Language"
      >
        <div className="space-y-4">
          <p className="text-sm text-orange-300 text-center mb-4">
            Choose the language for AI responses and voice output
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setResponseLanguage(lang.code);
                  setIsLanguageModalOpen(false);
                }}
                  className={`
                  px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium
                  ${responseLanguage === lang.code
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                    : 'bg-gray-800 text-white border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10'
                  }
                `}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Voice Selection Modal */}
      <Modal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
        title="Select Voice"
      >
        <div className="space-y-4">
          <p className="text-sm text-orange-300 text-center mb-4">
            Choose a voice for text-to-speech output
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            <button
              onClick={() => {
                setSelectedVoiceId('');
                setIsVoiceModalOpen(false);
              }}
              className={`
                w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                ${selectedVoiceId === ''
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                  : 'bg-gray-800 text-white border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10'
                }
              `}
            >
              Auto (Default)
            </button>
            {filteredVoices.length === 0 && availableVoices.length > 0 && (
              <p className="text-sm text-orange-300 text-center py-4">
                No Microsoft voices available. Please ensure Microsoft David or Microsoft Zira voices are installed.
              </p>
            )}
            {availableVoices.length === 0 && (
              <p className="text-sm text-orange-300 text-center py-4">
                Loading voices...
              </p>
            )}
            {filteredVoices.map((voice) => (
              <button
                key={voice.name}
                onClick={() => {
                  setSelectedVoiceId(voice.voiceURI);
                  setIsVoiceModalOpen(false);
                }}
                className={`
                  w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                  ${selectedVoiceId === voice.voiceURI
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                    : 'bg-gray-800 text-white border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10'
                  }
                `}
              >
                <div className="font-semibold">{voice.name}</div>
                <div className={`text-xs mt-1 ${selectedVoiceId === voice.voiceURI ? 'text-orange-100' : 'text-orange-300/70'}`}>
                  {voice.lang} {voice.default && '(Default)'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Access Memory Core"
      >
        {!isAuthenticated ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex flex-col items-center justify-center mb-6">
                <div className="p-4 bg-gray-800 rounded-full mb-3">
                    <LockIcon className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-orange-300 text-center text-sm">Enter the secure password to upload new persona data.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-orange-300 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-gray-800 border border-orange-500/30 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:outline-none focus:border-orange-500 shadow-sm"
                placeholder="•••••••"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-red-400 text-sm font-medium bg-red-500/20 p-3 rounded-lg border border-red-500/30">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all mt-2 shadow-sm"
            >
              Unlock Access
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {uploadStatus === 'done' ? (
                 <div className="flex flex-col items-center py-6 text-green-600">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckIcon className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-white">Upload Complete!</h4>
                    <p className="text-orange-300 text-sm mt-1">Memory has been updated.</p>
                 </div>
            ) : (
                <>
                    <div className="text-center">
                        <h4 className="text-white font-medium mb-2">Upload Resume or Document</h4>
                        <p className="text-sm text-orange-300 mb-6">
                            Upload your resume, CV, or any document. The AI will use this to answer questions about the content.
                        </p>
                    </div>

                    <label
                        htmlFor="document-upload"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (uploadStatus === 'processing') return;
                            
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                                handleFileChange({ target: { files: [file] } } as any);
                            }
                        }}
                        className={`
                            border-2 border-dashed border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/20 
                            rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all block
                            ${uploadStatus === 'processing' ? 'opacity-50 pointer-events-none' : ''}
                        `}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            id="document-upload"
                            accept="*/*"
                            onChange={handleFileChange}
                            multiple={false}
                        />
                        {uploadStatus === 'processing' ? (
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <span className="text-orange-500 text-sm font-medium">Processing document...</span>
                            </div>
                        ) : (
                            <>
                                <FileIcon className="w-12 h-12 text-orange-400 mb-4" />
                                <span className="text-white font-medium text-base mb-1">Click to upload document</span>
                                <span className="text-orange-300 text-xs">or drag and drop</span>
                                <span className="text-orange-300/70 text-xs mt-2">All file types supported</span>
                                <span className="text-orange-300/70 text-xs">Max size: 20MB</span>
                            </>
                        )}
                    </label>
                </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;
