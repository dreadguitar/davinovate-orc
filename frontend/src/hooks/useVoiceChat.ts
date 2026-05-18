import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceClient } from '../services/VoiceClient';
import { useStore } from '../store/useStore';

interface UseVoiceChatProps {
    targetType: 'system' | 'agent';
    targetId: string;
    lang?: 'es' | 'en';
    onReply?: (text: string, role: string) => void;
    onAction?: (action: string, target?: string) => void;
    onSpeechResult?: (text: string) => void;
}

export const useVoiceChat = ({ targetType, targetId, lang = 'es', onReply, onAction, onSpeechResult }: UseVoiceChatProps) => {
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const clientRef = useRef<VoiceClient | null>(null);
    const recognitionRef = useRef<any>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const lastAiSpeechEndTime = useRef<number>(0);
    const onSpeechResultRef = useRef(onSpeechResult);
    const userId = useStore(state => state.user?.id) || 'local_user';

    useEffect(() => {
        onSpeechResultRef.current = onSpeechResult;
    }, [onSpeechResult]);

    useEffect(() => {
        let isMounted = true;

        const setupVoice = async () => {
            try {
                // Init hardware
                micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                const apiBase = new URL(import.meta.env.VITE_API_URL || '', window.location.origin);
                const wsProtocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${wsProtocol}//${apiBase.host}`;
                
                clientRef.current = new VoiceClient(wsUrl, lang);
                
                clientRef.current.onReply = (text, role) => {
                    if (onReply && isMounted) onReply(text, role);
                };
                
                clientRef.current.onAction = (action, target) => {
                    if (onAction && isMounted) onAction(action, target);
                };

                clientRef.current.onError = (err) => {
                    console.error('Voice Client Error:', err);
                };

                // Play state changes to mute mic and prevent echo
                clientRef.current.onPlayStateChange = (isPlaying) => {
                    if (!micStreamRef.current) return;
                    const track = micStreamRef.current.getAudioTracks()[0];
                    if (track) {
                        if (isPlaying) {
                            track.enabled = false;
                        } else {
                            lastAiSpeechEndTime.current = Date.now();
                            setTimeout(() => {
                                if (micStreamRef.current) {
                                    micStreamRef.current.getAudioTracks()[0].enabled = true;
                                }
                            }, 800); // Increased from 500ms to 800ms
                        }
                    }
                };

                clientRef.current.connect();

                // Init continuous speech recognition
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    recognitionRef.current = new SpeechRecognition();
                    recognitionRef.current.lang = lang === 'es' ? 'es-MX' : 'en-US';
                    recognitionRef.current.continuous = true;
                    recognitionRef.current.interimResults = false;

                    recognitionRef.current.onstart = () => { if (isMounted) setIsListening(true); };
                    
                    recognitionRef.current.onend = () => { 
                        if (isMounted) setIsListening(false);
                        // Auto-restart if still in voice mode
                        if (clientRef.current && isVoiceMode && isMounted) {
                            try { recognitionRef.current.start(); } catch (e) {}
                        }
                    };
                    
                    recognitionRef.current.onresult = (event: any) => {
                        const now = Date.now();
                        const track = micStreamRef.current?.getAudioTracks()[0];

                        // Echo filter
                        if (!track || !track.enabled || (now - lastAiSpeechEndTime.current < 2000)) { // Increased from 1500ms to 2000ms
                            console.log("Descartando eco fantasma...");
                            return;
                        }

                        const text = event.results[event.results.length - 1][0].transcript;
                        // Call the component to handle UI update and history tracking
                        if (onSpeechResultRef.current) {
                             onSpeechResultRef.current(text);
                        }
                    };

                    recognitionRef.current.start();
                }
            } catch (err) {
                console.error("Hardware init error:", err);
            }
        };

        if (isVoiceMode) {
            setupVoice();
        } else {
            // Cleanup
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
            }
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(t => t.stop());
                micStreamRef.current = null;
            }
            setIsListening(false);
        }

        return () => {
            isMounted = false;
            if (recognitionRef.current) recognitionRef.current.stop();
            if (clientRef.current) clientRef.current.disconnect();
            if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [isVoiceMode, lang, targetType, targetId]);

    const sendText = useCallback((text: string, history: any[]) => {
        if (clientRef.current && isVoiceMode) {
            clientRef.current.sendText(text, targetType, targetId, userId, history);
        }
    }, [isVoiceMode, targetType, targetId]);

    // Manual start listening for the UI button if needed, but it's continuous now
    const startListening = useCallback((_onResult?: (text: string) => void) => {
         // Optionally trigger manual recognition, but continuous is running
         if (!isVoiceMode) {
             setIsVoiceMode(true);
         }
    }, [isVoiceMode]);

    const stopListening = useCallback(() => {
         setIsVoiceMode(false);
    }, []);

    const toggleVoiceMode = () => setIsVoiceMode(prev => !prev);

    return {
        isVoiceMode,
        toggleVoiceMode,
        isListening,
        startListening,
        stopListening,
        sendText
    };
};
