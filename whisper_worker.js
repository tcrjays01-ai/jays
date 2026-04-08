import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js';

env.allowLocalModels = false;
let transcriber = null;

self.onmessage = async (e) => {
    let msg = e.data;
    
    if (msg.type === 'load') {
        try {
            self.postMessage({ status: 'loading' });
            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                progress_callback: (prog) => {
                    self.postMessage({ status: 'progress', progress: prog });
                }
            });
            self.postMessage({ status: 'ready' });
        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    } 
    else if (msg.type === 'transcribe') {
        if (!transcriber) return;
        self.postMessage({ status: 'transcribing' });
        try {
            // output usually has { text, chunks: [{timestamp: [start, end], text}] }
            let output = await transcriber(msg.audio, {
                return_timestamps: true,
                language: 'korean',  
                chunk_length_s: 30, 
                stride_length_s: 5
            });
            self.postMessage({ status: 'complete', result: output });
        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    }
};
