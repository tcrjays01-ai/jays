import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js';

env.allowLocalModels = false;
let transcriber = null;

self.onmessage = async (e) => {
    let msg = e.data;
    
    if (msg.type === 'load') {
        try {
            self.postMessage({ status: 'loading' });
            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
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

            // Post-processing to filter repetitive hallucinations (common in tiny/base models)
            if (output.chunks) {
                output.chunks = output.chunks.map(chunk => {
                    let text = chunk.text.trim();
                    // Detect high repetition (e.g. "word word word word...")
                    let words = text.split(/\s+/);
                    if (words.length > 5) {
                        let uniq = [...new Set(words)];
                        // If one or two unique words make up most of a long sentence, it's likely a hallucination
                        if (uniq.length <= 2 && words.length > 8) {
                            chunk.text = ""; 
                            return chunk;
                        }
                    }
                    // Filter common Korean Whisper junk loops
                    if (text.includes("구독") || text.includes("좋아요") || text.includes("알림 설정")) {
                        if (words.length > 10) { chunk.text = ""; return chunk; }
                    }
                    return chunk;
                }).filter(c => c.text.length > 0);
            }

            self.postMessage({ status: 'complete', result: output });
        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    }
};
