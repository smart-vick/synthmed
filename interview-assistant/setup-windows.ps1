# InterviewAI - Windows Setup Script
# Open PowerShell (search "PowerShell" in Start menu), paste this whole script, press Enter

$projectDir = [Environment]::GetFolderPath("Desktop") + "\interview-ai"
New-Item -ItemType Directory -Force -Path "$projectDir\src" | Out-Null
Set-Location $projectDir

Write-Host "Creating InterviewAI project at $projectDir..." -ForegroundColor Green

# ── package.json ──────────────────────────────────────────────────────────────
@'
{
  "name": "interview-ai",
  "version": "1.0.0",
  "description": "Real-time AI interview assistant",
  "main": "main.js",
  "scripts": { "start": "electron ." },
  "dependencies": { "@google/generative-ai": "^0.21.0" },
  "devDependencies": { "electron": "^33.0.0" }
}
'@ | Set-Content "package.json" -Encoding UTF8

# ── preload.js ────────────────────────────────────────────────────────────────
@'
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ai", {
  getConfig:       ()        => ipcRenderer.invoke("get-config"),
  saveConfig:      (cfg)     => ipcRenderer.invoke("save-config", cfg),
  openLink:        (url)     => ipcRenderer.invoke("open-link", url),
  openSettings:    ()        => ipcRenderer.send("open-settings"),
  askClaude:       (q, mode) => ipcRenderer.send("ask-claude", { question: q, mode }),
  onClaudeChunk:   (cb)      => { ipcRenderer.removeAllListeners("claude-chunk"); ipcRenderer.on("claude-chunk", (_, d) => cb(d)); },
  setClickThrough: (e)       => ipcRenderer.send("set-click-through", e),
  onAction:        (cb)      => { ipcRenderer.removeAllListeners("action"); ipcRenderer.on("action", (_, a) => cb(a)); },
});
'@ | Set-Content "preload.js" -Encoding UTF8

# ── main.js ───────────────────────────────────────────────────────────────────
@'
const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } = require("electron");
const path = require("path");
const fs   = require("fs");

const CONFIG_PATH = path.join(app.getPath("userData"), "interview-ai-config.json");
function loadConfig() { try { return JSON.parse(fs.readFileSync(CONFIG_PATH,"utf8")); } catch { return {}; } }
function saveConfig(d) { fs.mkdirSync(path.dirname(CONFIG_PATH),{recursive:true}); fs.writeFileSync(CONFIG_PATH,JSON.stringify(d,null,2)); }
let config = loadConfig();

let overlayWin = null;
let settingsWin = null;

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
    width:520, height:480, x:width-540, y:height-500,
    transparent:true, frame:false, alwaysOnTop:true, resizable:true, hasShadow:false,
    webPreferences:{ preload:path.join(__dirname,"preload.js"), contextIsolation:true, nodeIntegration:false }
  });
  overlayWin.loadFile(path.join(__dirname,"src","overlay.html"));
  overlayWin.setAlwaysOnTop(true,"screen-saver");

  globalShortcut.register("CommandOrControl+Shift+H", () => overlayWin?.isVisible() ? overlayWin.hide() : overlayWin.show());
  globalShortcut.register("CommandOrControl+Shift+C", () => overlayWin?.webContents.send("action","clear"));
  globalShortcut.register("CommandOrControl+Shift+Space", () => overlayWin?.webContents.send("action","trigger"));
}

function createSettings() {
  settingsWin = new BrowserWindow({
    width:480, height:420, resizable:false, center:true,
    webPreferences:{ preload:path.join(__dirname,"preload.js"), contextIsolation:true, nodeIntegration:false }
  });
  settingsWin.loadFile(path.join(__dirname,"src","settings.html"));
}

app.commandLine.appendSwitch("enable-speech-dispatcher");
app.whenReady().then(() => { config.GEMINI_API_KEY ? createOverlay() : createSettings(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("will-quit", () => globalShortcut.unregisterAll());

ipcMain.handle("get-config", () => config);
ipcMain.handle("save-config", (_, c) => { config = {...config,...c}; saveConfig(config); settingsWin?.close(); settingsWin=null; if(!overlayWin) createOverlay(); return true; });
ipcMain.handle("open-link", (_, url) => shell.openExternal(url));
ipcMain.on("open-settings", () => { if (!settingsWin) createSettings(); else settingsWin.focus(); });
ipcMain.on("set-click-through", (_, e) => overlayWin?.setIgnoreMouseEvents(e, {forward:true}));

const PROMPTS = {
  technical:  "You are a real-time technical interview assistant. Answer as the CANDIDATE, first person, direct. Format: 1-2 sentence answer, then 2-3 bullets. MAX 120 words. No filler.",
  behavioral: "You are a real-time behavioral interview assistant. Answer as the CANDIDATE using STAR method. MAX 120 words. First person. Natural tone.",
  general:    "You are a real-time interview assistant. Answer as the CANDIDATE, confident and specific. MAX 100 words. No filler.",
};

ipcMain.on("ask-claude", async (_, { question, mode }) => {
  if (!config.GEMINI_API_KEY) { overlayWin?.webContents.send("claude-chunk",{text:"No API key. Press ⚙ to add one.",done:true,error:true}); return; }
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model:"gemini-2.0-flash", systemInstruction:PROMPTS[mode]||PROMPTS.general });
    const result = await model.generateContentStream(question);
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) overlayWin?.webContents.send("claude-chunk",{text:t,done:false});
    }
    overlayWin?.webContents.send("claude-chunk",{text:"",done:true});
  } catch(err) {
    overlayWin?.webContents.send("claude-chunk",{text:`Error: ${err.message}`,done:true,error:true});
  }
});
'@ | Set-Content "main.js" -Encoding UTF8

# ── src/settings.html ─────────────────────────────────────────────────────────
@'
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Setup</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,'Segoe UI',sans-serif;background:#0d0d1a;color:#e0e0e0;height:100vh;display:flex;align-items:center;justify-content:center}.card{width:400px;background:rgba(255,255,255,.04);border:1px solid rgba(0,255,136,.15);border-radius:16px;padding:32px}.logo{text-align:center;margin-bottom:24px}.logo h1{font-size:22px;font-weight:700;color:#00ff88;letter-spacing:2px;text-shadow:0 0 20px rgba(0,255,136,.4)}.logo p{font-size:12px;color:#555;margin-top:4px}.field{margin-bottom:16px}label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#555;margin-bottom:6px}input,select{width:100%;padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e0e0e0;font-size:13px;font-family:'SF Mono',monospace;outline:none}input:focus,select:focus{border-color:rgba(0,255,136,.4)}.hint{font-size:11px;color:#444;margin-top:5px;line-height:1.5}.hint a{color:#00ff88;cursor:pointer}.btn{width:100%;padding:12px;background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.35);border-radius:8px;color:#00ff88;font-size:14px;font-family:inherit;cursor:pointer;margin-top:8px}.btn:hover{background:rgba(0,255,136,.18)}.err{background:rgba(255,68,102,.1);border:1px solid rgba(255,68,102,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ff6688;margin-top:12px;display:none}</style></head>
<body><div class="card"><div class="logo"><h1>InterviewAI</h1><p>Real-time AI assistant for phone interviews</p></div>
<div class="field"><label>Gemini API Key</label><input type="password" id="k" placeholder="AIza..." autocomplete="off"><p class="hint">Free key at <a id="lnk">aistudio.google.com/apikey</a> — no credit card needed</p></div>
<div class="field"><label>Default Mode</label><select id="m"><option value="general">General</option><option value="technical">Technical</option><option value="behavioral">Behavioral</option></select></div>
<button class="btn" id="s">Start →</button><div class="err" id="e"></div></div>
<script>
document.getElementById("lnk").onclick=()=>window.ai.openLink("https://aistudio.google.com/apikey");
document.getElementById("s").onclick=async()=>{
  const k=document.getElementById("k").value.trim();
  if(!k.startsWith("AIza")){document.getElementById("e").style.display="block";document.getElementById("e").textContent="Invalid key — must start with AIza";return;}
  document.getElementById("e").style.display="none";
  document.getElementById("s").textContent="Connecting...";
  document.getElementById("s").disabled=true;
  await window.ai.saveConfig({GEMINI_API_KEY:k,defaultMode:document.getElementById("m").value});
};
document.getElementById("k").onkeydown=e=>{if(e.key==="Enter")document.getElementById("s").click();};
(async()=>{const c=await window.ai.getConfig();if(c.GEMINI_API_KEY)document.getElementById("k").value=c.GEMINI_API_KEY;if(c.defaultMode)document.getElementById("m").value=c.defaultMode;})();
</script></body></html>
'@ | Set-Content "src\settings.html" -Encoding UTF8

# ── src/overlay.html ──────────────────────────────────────────────────────────
@'
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>InterviewAI</title>
<style>*{margin:0;padding:0;box-sizing:border-box}:root{--bg:rgba(8,8,16,.92);--border:rgba(0,255,136,.2);--green:#00ff88;--gd:rgba(0,255,136,.6);--text:#e0e0e0;--muted:#555;--red:#ff4466;--yellow:#ffd700;--blue:#4db8ff;--r:12px}html,body{height:100%;background:transparent;font-family:'SF Mono','Fira Code',monospace;font-size:13px;color:var(--text);overflow:hidden;user-select:none}.container{height:100vh;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);display:flex;flex-direction:column;backdrop-filter:blur(24px);box-shadow:0 8px 40px rgba(0,0,0,.6)}.header{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(0,255,136,.1);-webkit-app-region:drag;cursor:move;flex-shrink:0}.sd{width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0;transition:all .3s}.sd.L{background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 2s infinite}.sd.P{background:var(--yellow);box-shadow:0 0 8px var(--yellow)}.sd.E{background:var(--red)}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.st{font-size:11px;color:var(--muted);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.st.L{color:var(--gd)}.st.P{color:var(--yellow)}.modes{display:flex;gap:4px;-webkit-app-region:no-drag}.mb{padding:2px 8px;border-radius:4px;border:1px solid var(--muted);background:transparent;color:var(--muted);font-size:10px;font-family:inherit;cursor:pointer;transition:all .15s}.mb:hover{border-color:var(--gd);color:var(--gd)}.mb.active{border-color:var(--green);color:var(--green);background:rgba(0,255,136,.08)}.ctrl{display:flex;gap:4px;-webkit-app-region:no-drag}.cb{width:24px;height:24px;border-radius:6px;border:1px solid var(--muted);background:transparent;color:var(--muted);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.cb:hover{border-color:var(--text);color:var(--text)}.cb.active{border-color:var(--green);color:var(--green)}.ts{padding:10px 12px 6px;flex-shrink:0;min-height:60px;max-height:100px}.lbl{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:5px}.tt{font-size:12px;color:#777;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;min-height:18px}.tt .i{color:#444;font-style:italic}.tt .h{color:var(--gd)}.div{height:1px;background:linear-gradient(90deg,transparent,rgba(0,255,136,.2),transparent);flex-shrink:0}.as{flex:1;padding:10px 12px;overflow-y:auto;min-height:0}.as::-webkit-scrollbar{width:3px}.as::-webkit-scrollbar-thumb{background:rgba(0,255,136,.2);border-radius:2px}.ap{color:var(--muted);font-size:12px;line-height:1.6;margin-top:8px}.at{color:var(--text);font-size:13px;line-height:1.7;white-space:pre-wrap;font-family:-apple-system,'Segoe UI',sans-serif}.at strong{color:var(--green)}.at em{color:var(--blue);font-style:normal}.cur{display:inline-block;width:2px;height:14px;background:var(--green);margin-left:2px;vertical-align:middle;animation:blink .8s step-end infinite}@keyframes blink{50%{opacity:0}}.footer{padding:6px 12px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}.sc{font-size:9px;color:var(--muted)}.tb{padding:4px 12px;border-radius:6px;border:1px solid rgba(0,255,136,.3);background:rgba(0,255,136,.06);color:var(--gd);font-size:11px;font-family:inherit;cursor:pointer;transition:all .15s}.tb:hover{border-color:var(--green);color:var(--green);box-shadow:0 0 12px rgba(0,255,136,.15)}.nl{position:absolute;inset:0;border-radius:var(--r);background:rgba(8,8,16,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10}.nl.hidden{display:none}.sb{padding:10px 28px;border-radius:8px;border:1px solid var(--green);background:rgba(0,255,136,.1);color:var(--green);font-size:14px;font-family:inherit;cursor:pointer;transition:all .2s;box-shadow:0 0 20px rgba(0,255,136,.15)}.sb:hover{background:rgba(0,255,136,.2)}.sh{font-size:11px;color:var(--muted)}</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="sd" id="sd"></div>
    <span class="st" id="st">Ready</span>
    <div class="modes"><button class="mb active" data-mode="general">GEN</button><button class="mb" data-mode="technical">TECH</button><button class="mb" data-mode="behavioral">BEHAV</button></div>
    <div class="ctrl"><button class="cb" id="ctBtn" title="Click-through">👆</button><button class="cb" id="clrBtn" title="Clear">✕</button><button class="cb" id="setBtn" title="Settings">⚙</button></div>
  </div>
  <div class="ts"><div class="lbl">Live Transcript</div><div class="tt" id="tt"><span>Waiting for speech...</span></div></div>
  <div class="div"></div>
  <div class="as" id="as">
    <div class="lbl">AI Answer</div>
    <div id="ap" class="ap">Ask a question — answer appears here in real time.<br><span style="color:#444">Ctrl+Shift+Space to trigger manually</span></div>
    <div id="at" class="at" style="display:none"></div>
  </div>
  <div class="footer"><span class="sc">Ctrl+Shift+H hide &middot; Ctrl+Shift+C clear &middot; Ctrl+Shift+Space trigger</span><button class="tb" id="trgBtn">&#9654; Ask Now</button></div>
</div>
<div class="nl" id="nl"><button class="sb" id="startBtn">Start Listening</button><span class="sh">Requires microphone permission</span></div>
<script>
let mode="general",listening=false,processing=false,ct=false,buf="",timer=null,rec=null,ans="";
const $=id=>document.getElementById(id);
function setStatus(s,t){$("sd").className="sd "+s;$("st").className="st "+s;$("st").textContent=t;}
function showAns(text,streaming){$("ap").style.display="none";const el=$("at");el.style.display="block";el.innerHTML=text.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/\n/g,"<br>")+(streaming?"<span class='cur'></span>":"");$("as").scrollTop=0;}
function clear(){buf="";clearTimeout(timer);$("tt").innerHTML="<span>Waiting for speech...</span>";$("at").style.display="none";$("at").innerHTML="";$("ap").style.display="block";if(!processing)setStatus(listening?"L":"","Listening...");}
function isQ(t){const s=t.trim().toLowerCase();if(s.endsWith("?"))return true;return["what ","how ","why ","when ","where ","who ","which ","can you ","could you ","tell me ","describe ","explain ","walk me ","talk me ","give me","share an","have you"].some(k=>s.startsWith(k)||s.includes(k));}
function askAI(q){if(!q.trim()||processing)return;processing=true;ans="";setStatus("P","Thinking...");showAns("",true);window.ai.askClaude(q,mode);}
window.ai.onClaudeChunk(({text,done,error})=>{if(error){showAns(text||"Error.");processing=false;setStatus("E","Error");return;}if(!done){ans+=text;showAns(ans,true);}else{showAns(ans,false);processing=false;setStatus("L","Listening...");}});
function startL(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setStatus("E","Speech API unavailable");return;}rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang="en-US";
rec.onstart=()=>{listening=true;$("nl").classList.add("hidden");setStatus("L","Listening...");};
rec.onresult=(ev)=>{let fi="",int="";for(let i=ev.resultIndex;i<ev.results.length;i++){const t=ev.results[i][0].transcript;ev.results[i].isFinal?fi+=t+" ":int+=t;}
if(fi){buf+=fi;if(buf.length>500)buf=buf.slice(-500);clearTimeout(timer);timer=setTimeout(()=>{const q=buf.trim();if(isQ(q)&&!processing){askAI(q);}},1800);}
const disp=(buf.slice(-180)+int).trim().replace(/\?/g,"<span class='h'>?</span>");$("tt").innerHTML="<span>"+disp+"</span>"+(int?"<span class='i'> "+int+"</span>":"");};
rec.onerror=(e)=>{if(e.error==="not-allowed"){setStatus("E","Mic denied");$("nl").classList.remove("hidden");}};
rec.onend=()=>{if(listening)rec.start();};rec.start();}
async function reqMic(){try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());startL();}catch{setStatus("E","Mic denied");}}
document.querySelectorAll(".mb").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".mb").forEach(x=>x.classList.remove("active"));b.classList.add("active");mode=b.dataset.mode;}));
$("trgBtn").addEventListener("click",()=>askAI(buf.trim()||"Tell me about yourself."));
$("clrBtn").addEventListener("click",clear);
$("setBtn").addEventListener("click",()=>window.ai.openSettings());
$("ctBtn").addEventListener("click",()=>{ct=!ct;window.ai.setClickThrough(ct);$("ctBtn").classList.toggle("active",ct);});
$("startBtn").addEventListener("click",reqMic);
window.ai.onAction(a=>{if(a==="clear")clear();if(a==="trigger")askAI(buf.trim()||"Tell me about yourself.");});
(async()=>{const c=await window.ai.getConfig();if(c.GEMINI_API_KEY)reqMic();})();
</script></body></html>
'@ | Set-Content "src\overlay.html" -Encoding UTF8

Write-Host ""
Write-Host "All files created!" -ForegroundColor Green
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host ""
Write-Host "Done! To launch InterviewAI:" -ForegroundColor Green
Write-Host "  cd $projectDir" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "The app will open and ask for your Gemini API key." -ForegroundColor White
Write-Host "Get a free key at: https://aistudio.google.com/apikey" -ForegroundColor Cyan
