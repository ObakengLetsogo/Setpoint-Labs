const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');
const dur=JSON.parse(fs.readFileSync('dur.json'));
const cues=JSON.parse(fs.readFileSync('cues.json'));const caps={};
for(const k in cues){caps[k]=[];const c=cues[k];c.forEach(([st,txt],i)=>{const en=(c[i+1]?c[i+1][0]:dur[k]-0.9)-0.5;const ch=[];let cur='';for(const w of txt.split(' ')){if((cur+' '+w).trim().length>88&&cur&&/[,.]$/.test(cur)||(cur+' '+w).length>100){ch.push(cur.trim());cur=w}else cur=(cur+' '+w).trim()}if(cur)ch.push(cur);const tot=ch.join('').length;let acc=0;for(const x of ch){caps[k].push([st+acc/tot*(en-st),x]);acc+=x.length}})}
const order=Object.keys(cues);
(async()=>{const mode=process.argv[2];const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file://'+__dirname+'/index.html');await p.evaluate(([c,q])=>setCaps(c,q),[caps,cues]);await p.waitForTimeout(500);
if(mode==='stills'){for(const [k,t] of JSON.parse(process.argv[3])){await p.evaluate(([k,t,d])=>render(k,t,d),[k,t,dur[k]]);await p.screenshot({path:`still_${k}_${t}.jpg`,type:'jpeg',quality:85});}}
else{const only=process.argv[3]?process.argv[3].split(','):order;
for(const k of only){const D=dur[k],n=Math.round(D*30);const tmp=`scene_${k}.tmp.mp4`;
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-i','-','-i',`${k}.wav`,'-af','adelay=300|300,apad','-t',String(n/30),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-ac','2',tmp]);
for(let i=0;i<n;i++){await p.evaluate(([k,t,d])=>render(k,t,d),[k,i/30,D]);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
ff.stdin.end();await new Promise((r,j)=>ff.on('close',c=>c===0?r():j(k)));fs.renameSync(tmp,`scene_${k}.mp4`);console.log('done',k);}}
await b.close()})();
