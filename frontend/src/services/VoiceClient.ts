export class VoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  
  public onReply?: (text: string, role: string) => void;
  public onAction?: (action: string, target?: string) => void;
  public onError?: (error: string) => void;
  public onPlayStateChange?: (isPlaying: boolean) => void;

  private url: string;
  private lang: 'es' | 'en';

  constructor(url: string, lang: 'es' | 'en' = 'es') {
    this.url = url;
    this.lang = lang;
  }

  public connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log('Voice WebSocket connected');
      this.ws?.send(JSON.stringify({ type: 'init', lang: this.lang }));
      this.initAudio();
    };

    this.ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'reply' && this.onReply) {
          this.onReply(data.text, data.role);
        } else if (data.type === 'action' && this.onAction) {
          this.onAction(data.action, data.target);
        } else if (data.type === 'error' && this.onError) {
          this.onError(data.message);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Raw PCM audio from Piper
        await this.playAudio(event.data);
      }
    };

    this.ws.onclose = () => {
      console.log('Voice WebSocket disconnected');
    };
  }

  public disconnect() {
    this.ws?.close();
    this.audioContext?.close();
  }

  public sendText(text: string, targetType: 'system' | 'agent', targetId: string, userId: string, history: any[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'text',
        text,
        targetType,
        targetId,
        userId,
        history
      }));
    }
  }

  private initAudio() {
    if (!this.audioContext) {
      // Piper outputs 22050Hz, 1 channel (mono), 16-bit PCM by default
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 22050
      });
    }
  }

  private async playAudio(pcmData: ArrayBuffer) {
    if (!this.audioContext) return;
    
    if (this.onPlayStateChange) this.onPlayStateChange(true);

    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0; 
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 22050);
    audioBuffer.getChannelData(0).set(float32Array);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    source.onended = () => {
        if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.1) {
            if (this.onPlayStateChange) this.onPlayStateChange(false);
        }
    };
  }
}
