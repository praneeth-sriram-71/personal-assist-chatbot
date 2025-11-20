import React, { useState, useRef, useEffect } from 'react';
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
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-PT', name: 'Portuguese' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'tr-TR', name: 'Turkish' },
];

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
  const [isRecording, setIsRecording] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState<string>('en-US');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
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
  useEffect(() => {
    return () => {
      voiceService.stop();
      speechRecognitionService.stop();
    };
  }, []);

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
    if (selectedVoice && availableVoices.length > 0) {
      const selectedVoiceObj = availableVoices.find(v => v.name === selectedVoice);
      if (selectedVoiceObj) {
        const langPrefix = responseLanguage.split('-')[0];
        // If selected voice doesn't match the new language, clear it to auto-select
        if (!selectedVoiceObj.lang.startsWith(langPrefix) && selectedVoiceObj.lang !== responseLanguage) {
          setSelectedVoice('');
        }
      }
    }
  }, [responseLanguage, availableVoices]); // Only check when language or voices change

  const handleSpeak = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      // Stop speaking if already speaking this message
      voiceService.stop();
      setSpeakingMessageId(null);
    } else {
      // Stop any current speech and start new one
      voiceService.stop();
      setSpeakingMessageId(messageId);
      voiceService.speak(text, () => {
        setSpeakingMessageId(null);
      }, responseLanguage, selectedVoice || undefined);
    }
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
  const voiceLabel = selectedVoice || 'Auto voice';
  const statusCopy = pdfFile
    ? 'Memory core engaged with your uploaded PDF context.'
    : 'Operating with default resume intelligence.';
  const quickActions = [
    {
      id: 'memory',
      title: pdfFile ? 'Refresh memory core' : 'Load persona PDF',
      description: pdfFile ? 'Swap in a fresh data drop for deeper recall.' : 'Upload a PDF document to provide context.',
      icon: FileIcon,
      onClick: handleOpenUpload,
    },
    {
      id: 'mic',
      title: isRecording ? 'Stop live mic' : 'Start live mic',
      description: isRecording ? 'Listening for your prompt…' : 'Speak instead of typing to drive the chat.',
      icon: isRecording ? MicOffIcon : MicIcon,
      onClick: handleToggleRecording,
    },
    {
      id: 'language',
      title: 'Response language',
      description: currentLanguage,
      icon: LanguageIcon,
      onClick: () => setIsLanguageModalOpen(true),
    },
    {
      id: 'voice',
      title: 'Voice persona',
      description: voiceLabel,
      icon: VoiceIcon,
      onClick: () => setIsVoiceModalOpen(true),
    },
  ];

  return (
    <div
      className="min-h-screen bg-black text-white font-sans"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
          <aside>
            <ProfilePanel
              className="shadow-[0_30px_100px_rgba(5,7,17,0.55)]"
              onEditPersona={handleOpenUpload}
            />
          </aside>

          <section className="relative flex min-h-[75vh] flex-col rounded-[40px] border border-orange-500/30 bg-gray-900 text-white shadow-[0_35px_120px_rgba(255,140,0,0.15)]">
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
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-orange-500 border-2 border-gray-900 rounded-full shadow-sm"></div>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">Praneeth's Assistant</h1>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
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
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white rounded-lg border border-orange-500/30 transition-all shadow-sm hover:shadow-md group"
                  title="Select response language"
                >
                  <LanguageIcon className="w-4 h-4 group-hover:text-orange-500" />
                  <span className="hidden sm:inline">
                    {LANGUAGE_OPTIONS.find(l => l.code === responseLanguage)?.name || 'Language'}
                  </span>
                </button>

                <button 
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white rounded-lg border border-orange-500/30 transition-all shadow-sm hover:shadow-md group"
                  title="Select voice"
                >
                  <VoiceIcon className="w-4 h-4 group-hover:text-orange-500" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black px-4 py-6 sm:px-8 lg:px-10">
              <div className="space-y-5">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl shadow ${
                          isUser ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-800 text-white'
                        }`}
                      >
                        {isUser ? <UserIcon className="h-5 w-5" /> : <RobotIcon className="h-5 w-5" />}
                      </div>
                      <div
                        className={`relative max-w-[80%] rounded-[28px] border p-5 text-sm leading-relaxed shadow-lg sm:max-w-[70%] ${
                          isUser
                            ? 'border-transparent bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                            : 'border-orange-500/20 bg-gray-800 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {!isUser && voiceService.isAvailable() && (
                          <button
                            onClick={() => handleSpeak(msg.id, msg.text)}
                            className={`absolute -bottom-3 right-5 rounded-full border p-2 text-xs shadow transition ${
                              speakingMessageId === msg.id
                                ? 'border-orange-300 bg-orange-500 text-white'
                                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-orange-500 hover:text-orange-500'
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
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="h-10 w-10 rounded-2xl bg-gray-800 text-white shadow flex items-center justify-center">
                      <RobotIcon className="h-5 w-5" />
                    </div>
                    <div className="rounded-[28px] border border-orange-500/20 bg-gray-800 px-4 py-3 shadow">
                      <div className="flex gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                          style={{ animationDelay: '0.12s' }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                          style={{ animationDelay: '0.24s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>

            <footer className="border-t border-orange-500/20 bg-gray-900/90 px-4 py-6 sm:px-8 lg:px-10">
              <form onSubmit={handleSendMessage} className="group relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-500/30 via-orange-600/20 to-orange-500/30 opacity-0 blur-xl transition group-focus-within:opacity-100" />
                <div className="relative flex items-center gap-3 rounded-3xl border border-orange-500/30 bg-gray-800 px-4 py-2.5 shadow-xl">
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={isLoading}
                    className={`flex-shrink-0 rounded-2xl border px-3 py-3 transition ${
                      isRecording
                        ? 'border-red-500/50 bg-red-900/30 text-red-400 animate-pulse'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-orange-500/50'
                    } disabled:opacity-50`}
                    title={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    {isRecording ? <MicOffIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about me"
                    className="w-full border-none bg-transparent text-base text-white placeholder-gray-500 focus:outline-none"
                    disabled={isLoading || isRecording}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || isRecording}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SendIcon className="h-5 w-5" />
                  </button>
                </div>
              </form>
              <p className="mt-3 text-center text-xs text-gray-400">
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
          <p className="text-sm text-gray-300 text-center mb-4">
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
                    : 'bg-gray-800 text-white border-orange-500/30 hover:border-orange-500 hover:bg-gray-700'
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
          <p className="text-sm text-gray-300 text-center mb-4">
            Choose a voice for text-to-speech output
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            <button
              onClick={() => {
                setSelectedVoice('');
                setIsVoiceModalOpen(false);
              }}
              className={`
                w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                ${selectedVoice === ''
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }
              `}
            >
              Auto (Default)
            </button>
            {availableVoices.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Loading voices...
              </p>
            )}
            {availableVoices.map((voice) => (
              <button
                key={voice.name}
                onClick={() => {
                  setSelectedVoice(voice.name);
                  setIsVoiceModalOpen(false);
                }}
                className={`
                  w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                  ${selectedVoice === voice.name
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                    : 'bg-gray-800 text-white border-orange-500/30 hover:border-orange-500 hover:bg-gray-700'
                  }
                `}
              >
                <div className="font-semibold">{voice.name}</div>
                <div className={`text-xs mt-1 ${selectedVoice === voice.name ? 'text-orange-200' : 'text-gray-400'}`}>
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
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                    <LockIcon className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-gray-600 text-center text-sm">Enter the secure password to upload new persona data.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-gray-800 border border-orange-500/30 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500/30 focus:outline-none focus:border-orange-500 shadow-sm"
                placeholder="•••••••"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">
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
                    <h4 className="text-lg font-bold text-gray-900">Upload Complete!</h4>
                    <p className="text-gray-500 text-sm mt-1">Memory has been updated.</p>
                 </div>
            ) : (
                <>
                    <div className="text-center">
                        <h4 className="text-gray-900 font-medium mb-2">Upload Resume or Document</h4>
                        <p className="text-sm text-gray-500 mb-6">
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
                            border-2 border-dashed border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10 
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
                                <FileIcon className="w-12 h-12 text-gray-400 mb-4" />
                                <span className="text-gray-700 font-medium text-base mb-1">Click to upload document</span>
                                <span className="text-gray-500 text-xs">or drag and drop</span>
                                <span className="text-gray-400 text-xs mt-2">All file types supported</span>
                                <span className="text-gray-400 text-xs">Max size: 20MB</span>
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
