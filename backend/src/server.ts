import app from './app';
import { initializeWebSocket } from './websocket';
import { initializeVoiceModels } from './services/voiceService';

// Ensure all unexpected crashes are printed directly to stderr (unbuffered)
process.on('uncaughtException', (err) => {
  process.stderr.write(`CRITICAL UNCAUGHT EXCEPTION: ${err.stack || err}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  process.stderr.write(`CRITICAL UNHANDLED REJECTION: ${reason?.stack || reason}\n`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

// Defer large downloads until 5 seconds after the server has fully started to pass Hostinger/Passenger startup timeouts
setTimeout(() => {
  initializeVoiceModels().catch(err => {
      console.error('Failed to initialize voice models:', err);
  });
}, 5000);

const server = app.listen(PORT, () => {
  console.log(`🚀 Davinovate Orchestrator running on http://localhost:${PORT}`);
});

initializeWebSocket(server);
