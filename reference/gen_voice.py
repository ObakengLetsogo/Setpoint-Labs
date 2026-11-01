"""Voice and cue generator. Usage: python3 gen_voice.py narr2.json
Writes <scene>.wav, dur.json (scene length in seconds) and cues.json (start time of every sentence).
Models: set KOKORO_DIR to the folder holding kokoro-v1.0.onnx and voices-v1.0.bin"""
import json,os,sys,numpy as np,soundfile as sf
from kokoro_onnx import Kokoro
D=os.environ.get('KOKORO_DIR','/root/kokoro')
k=Kokoro(f'{D}/kokoro-v1.0.onnx',f'{D}/voices-v1.0.bin')
VOICE,SPEED,GAP,TAIL='af_heart',0.95,0.5,0.9   # the approved teaching voice and pace
n=json.load(open(sys.argv[1]));d={};cues={}
# spoken form is written into the narration (for example Skayda for SCADA, P L C for PLC).
# on screen captions use the written form, so map back here.
CAPFIX=[('P L C','PLC'),('H M I','HMI'),('I O','I/O'),('Skayda','SCADA'),('twelve hundred','1200')]
def cap(s):
    for a,b in CAPFIX: s=s.replace(a,b)
    return s
for key,ss in n.items():
    parts=[];t=0.3;cues[key]=[]
    for s in ss:
        a,sr=k.create(s,voice=VOICE,speed=SPEED,lang='en-us')
        cues[key].append([round(t,2),cap(s)])
        parts+=[a,np.zeros(int(GAP*sr))];t+=len(a)/sr+GAP
    sf.write(f'{key}.wav',np.concatenate(parts),24000);d[key]=round(t+TAIL,2)
json.dump(d,open('dur.json','w'));json.dump(cues,open('cues.json','w'));print(d,sum(d.values()))
