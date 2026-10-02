// Downsample browser microphone to Gemini's mono PCM16 / 16 kHz.
class PCMInput extends AudioWorkletProcessor {
  constructor(){super();this.acc=0;this.count=0;this.phase=0;this.chunk=[];}
  process(inputs){const samples=inputs[0]?.[0];if(!samples)return true;const ratio=sampleRate/16000;for(const value of samples){this.acc+=value;this.count++;this.phase++;if(this.phase>=ratio){const v=Math.max(-1,Math.min(1,this.acc/this.count));this.chunk.push(v<0?v*32768:v*32767);this.acc=0;this.count=0;this.phase-=ratio;if(this.chunk.length>=1024){const pcm=new Int16Array(this.chunk);this.port.postMessage(pcm.buffer,[pcm.buffer]);this.chunk=[];}}}return true;}
}
registerProcessor("agl-pcm-input",PCMInput);
