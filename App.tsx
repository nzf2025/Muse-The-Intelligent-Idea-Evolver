
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Session, Message, InputMode, ArtifactType } from './types';
import { gemini } from './services/geminiService';
import { CaptureButtons } from './components/CaptureButtons';
import { IdeaCard } from './components/IdeaCard';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const Home: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('mindsparks_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isRecording, setIsRecording] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<any>(null);
  const audioChunks = useRef<Blob[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      alert("请在浏览器菜单中选择“添加到主屏幕”或“安装应用”。\n\n提示：如果图标显示为 AI Studio，请先点击管理中的“获取独立链接”并用 Chrome 打开。");
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const copyLiveLink = () => {
    const currentUrl = window.location.href.split('#')[0];
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert("独立访问链接已复制！\n\n请在 Chrome 浏览器中粘贴此链接并访问，然后点击浏览器菜单中的“安装应用”，这样图标就会正确显示为“缪斯”。");
    });
  };

  const startNewSession = async (mode: InputMode, initialContent: string, mediaUrl?: string) => {
    const newSession: Session = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      initialSpark: initialContent,
      type: mode,
      status: 'interviewing',
      messages: [{ role: 'user', text: initialContent, mediaUrl }],
      mediaUrl: mediaUrl
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem('mindsparks_sessions', JSON.stringify(updated));
    navigate(`/interview/${newSession.id}`);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(sessions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `muse_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const merged = [...imported, ...sessions].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          setSessions(merged);
          localStorage.setItem('mindsparks_sessions', JSON.stringify(merged));
          alert("导入成功！");
          setShowManage(false);
        }
      } catch (err) { alert("导入失败"); }
    };
    reader.readAsText(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      let transcript = '';
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.lang = 'zh-CN';
        recognition.current.continuous = true;
        recognition.current.onresult = (e: any) => {
          transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
        };
        recognition.current.start();
      }
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        startNewSession('voice', transcript || "语音备忘", URL.createObjectURL(audioBlob));
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("请在手机设置中允许浏览器访问麦克风"); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    recognition.current?.stop();
    setIsRecording(false);
  };

  const handleCapture = (mode: InputMode) => {
    if (mode === 'text') {
       setShowTextInput(true);
    } else if (mode === 'photo') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) startNewSession('photo', "视觉快照", URL.createObjectURL(file));
      };
      input.click();
    } else if (mode === 'voice') {
      if (isRecording) stopRecording();
      else startRecording();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:py-16 min-h-screen flex flex-col no-select">
      <header className="mb-8 border-b border-slate-800 pb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-white mb-1 italic">缪斯灵感</h1>
          <p className="text-slate-500 font-serif italic text-[10px] md:text-sm">让每一个念头，进化为深刻的洞察。</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleInstall}
            className={`p-3 rounded-full ${installPrompt ? 'bg-indigo-600 animate-bounce' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}
          >
            <i className="fa-solid fa-mobile-screen-button"></i>
          </button>
          <button 
            onClick={() => setShowManage(!showManage)}
            className={`p-3 rounded-full transition-all ${showManage ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
          >
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </header>

      {showManage && (
        <div className="mb-8 p-6 glass-morphism rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">馆藏管理</h2>
            <button onClick={copyLiveLink} className="text-[10px] text-indigo-400 hover:underline">获取独立安装链接 <i className="fa-solid fa-link ml-1"></i></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={exportData} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
              <i className="fa-solid fa-file-export"></i> 备份馆藏内容
            </button>
            <label className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <i className="fa-solid fa-file-import"></i> 导入备份文件
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
            <button onClick={() => { if(confirm("确定永久清空所有灵感记录吗？")) { localStorage.clear(); window.location.reload(); } }} className="sm:col-span-2 px-5 py-3 bg-red-900/10 text-red-500 border border-red-900/20 rounded-xl text-xs font-bold hover:bg-red-900/20 transition-all">
              <i className="fa-solid fa-trash-can mr-2"></i> 销毁当前全部馆藏
            </button>
          </div>
          <p className="mt-4 text-[10px] text-slate-500 text-center italic">
            提示：若桌面图标显示为“AI Studio”，请复制链接并在 Chrome 独立访问。
          </p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-40">
           <div className="w-16 h-16 border border-slate-800 rounded-full flex items-center justify-center mb-6">
             <i className="fa-solid fa-feather text-slate-600"></i>
           </div>
           <p className="text-slate-500 font-serif italic text-sm">灵感尚未降临...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {sessions.map(s => (
            <IdeaCard 
              key={s.id} 
              session={s} 
              onClick={(id) => navigate(s.status === 'completed' ? `/artifact/${id}` : `/interview/${id}`)} 
            />
          ))}
        </div>
      )}

      <CaptureButtons onModeSelect={handleCapture} isRecording={isRecording} />

      {/* 文字输入弹窗 */}
      {showTextInput && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">捕捉此刻火花</h3>
            <textarea
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-lg focus:outline-none focus:border-indigo-500 transition-all min-h-[120px] mb-4"
              placeholder="请输入您的想法或灵感..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (textInput.trim()) {
                    startNewSession('text', textInput.trim());
                    setShowTextInput(false);
                    setTextInput('');
                  }
                }
              }}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowTextInput(false); setTextInput(''); }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-sm font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (textInput.trim()) {
                    startNewSession('text', textInput.trim());
                    setShowTextInput(false);
                    setTextInput('');
                  }
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                开启对谈
              </button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="mt-auto pt-16 pb-8 text-center text-slate-700 text-[9px] uppercase tracking-[0.3em]">
        Muse • Obsidian Style • v1.1.0
      </footer>
    </div>
  );
};

const InterviewStudio: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<any>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mindsparks_sessions');
    if (saved) {
      const data: Session[] = JSON.parse(saved);
      const found = data.find(s => s.id === id);
      if (found) {
        setSession(found);
        if (!chatRef.current) {
          chatRef.current = gemini.createInterviewChat(found.messages.filter(m => m.role === 'model' || found.messages.indexOf(m) < found.messages.length - 1));
          if (found.messages.length === 1 && found.messages[0].role === 'user') {
            sendToAI(found.initialSpark);
          } else if (found.status === 'interviewing' && found.messages[found.messages.length - 1].role === 'user') {
            sendToAI(found.messages[found.messages.length - 1].text);
          }
        }
      }
    }
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, isTyping]);

  const sendToAI = async (text: string) => {
    if (!chatRef.current) return;
    setIsTyping(true);
    
    // 初始化 AI 消息占位
    setSession(prev => {
      if (!prev) return null;
      return { ...prev, messages: [...prev.messages, { role: 'model', text: '' }] };
    });

    try {
      const result = await chatRef.current.sendMessageStream({ message: text });
      let currentFullText = '';
      
      for await (const chunk of result) {
        const chunkText = chunk.text;
        currentFullText += chunkText;
        
        setSession(prev => {
          if (!prev) return null;
          const newMessages = [...prev.messages];
          newMessages[newMessages.length - 1] = { 
            ...newMessages[newMessages.length - 1], 
            text: currentFullText 
          };
          return { ...prev, messages: newMessages };
        });
      }

      setSession(prev => {
        if (prev) updateStorage(prev);
        return prev;
      });
    } catch (e) { 
      console.error(e);
      setSession(prev => {
        if (!prev) return null;
        const newMessages = [...prev.messages];
        newMessages[newMessages.length - 1] = { 
          role: 'model', 
          text: "缪斯遇到了一点思绪阻塞，请重试或检查网络..." 
        };
        return { ...prev, messages: newMessages };
      });
    } finally { 
      setIsTyping(false); 
    }
  };

  const handleSend = (text: string, mediaUrl?: string) => {
    if (!text.trim() || !session) return;
    const userMsg: Message = { role: 'user', text, mediaUrl };
    const updatedMessages = [...session.messages, userMsg];
    setSession({ ...session, messages: updatedMessages });
    setInputText('');
    sendToAI(text);
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      let transcript = '';
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.lang = 'zh-CN';
        recognition.current.continuous = true;
        recognition.current.onresult = (e: any) => {
          transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
          setInputText(transcript);
        };
        recognition.current.start();
      }
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        if (transcript) handleSend(transcript, URL.createObjectURL(audioBlob));
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("麦克风启动失败，请检查手机权限。"); }
  };

  const stopVoiceInput = () => {
    mediaRecorder.current?.stop();
    recognition.current?.stop();
    setIsRecording(false);
  };

  const updateStorage = (updated: Session) => {
    const saved = localStorage.getItem('mindsparks_sessions');
    if (saved) {
      const data: Session[] = JSON.parse(saved);
      const idx = data.findIndex(s => s.id === updated.id);
      if (idx > -1) {
        data[idx] = updated;
        localStorage.setItem('mindsparks_sessions', JSON.stringify(data));
      }
    }
  };

  const finishInterview = async (type: ArtifactType) => {
    if (!session) return;
    setSession({ ...session, status: 'synthesizing' });
    try {
      const artifact = await gemini.synthesizeArtifact(session.messages, type);
      const updated: Session = { ...session, status: 'completed', finalArtifact: { ...artifact, type } };
      setSession(updated);
      updateStorage(updated);
      navigate(`/artifact/${session.id}`);
    } catch (e) {
      alert("深度合成失败，请尝试重新提问。");
      setSession({ ...session, status: 'interviewing' });
    }
  };

  const [synthMessageIdx, setSynthMessageIdx] = useState(0);
  const synthMessages = [
    "正在打磨深度备忘成果...",
    "缪斯正在组织语言...",
    "正在挖掘灵感的深层关联...",
    "正在构建逻辑严密的行动方案...",
    "即将完成最终进化..."
  ];

  useEffect(() => {
    let interval: any;
    if (session?.status === 'synthesizing') {
      interval = setInterval(() => {
        setSynthMessageIdx(prev => (prev + 1) % synthMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [session?.status]);

  if (!session) return null;

  const typeLabels: Record<ArtifactType, string> = {
    'Article': '深度文章',
    'Interview': '精彩访谈',
    'Action Plan': '执行方案'
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden flex-col md:flex-row no-select">
      {/* 顶部导航 */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-10">
        <button onClick={() => navigate('/')} className="text-slate-400 p-2">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">正在与缪斯对谈</span>
        <div className="w-10"></div>
      </div>

      {/* 侧边栏 */}
      <div className="w-full md:w-1/4 border-r border-slate-800 p-4 md:p-8 flex flex-col overflow-y-auto max-h-[25vh] md:max-h-full bg-slate-950">
        <button onClick={() => navigate('/')} className="hidden md:flex mb-12 text-slate-500 hover:text-white items-center gap-2 transition-colors text-sm">
           <i className="fa-solid fa-arrow-left"></i> 返回馆藏
        </button>
        <div className="flex-1">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">灵感内核</h2>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 italic text-slate-400 text-xs mb-6 leading-relaxed">
            "{session.initialSpark}"
          </div>
          
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">转化方向</h2>
          <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
            {(['Article', 'Interview', 'Action Plan'] as ArtifactType[]).map(type => (
              <button 
                key={type}
                onClick={() => finishInterview(type)}
                disabled={session.status === 'synthesizing'}
                className="text-center md:text-left px-2 py-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-500 transition-all text-[10px] md:text-sm font-medium disabled:opacity-50"
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 聊天主区域 */}
      <div className="flex-1 flex flex-col relative bg-slate-950">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-44">
          {session.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[88%] p-4 md:p-6 rounded-2xl md:rounded-3xl ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-500/10' : 'bg-slate-900 border border-slate-800 rounded-tl-none font-serif text-[15px] md:text-lg leading-relaxed tracking-wide text-slate-200'}`}>
                {m.text}
                {m.mediaUrl && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <audio src={m.mediaUrl} controls className="h-8 w-full brightness-0 invert opacity-40 hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-900/50 p-3 rounded-xl flex items-center gap-3">
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                 </div>
                 <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">缪斯构思中</span>
              </div>
            </div>
          )}
        </div>

        {/* 悬浮输入 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-3xl mx-auto flex gap-3 items-center">
            <button 
              onClick={isRecording ? stopVoiceInput : startVoiceInput}
              className={`p-4 md:p-5 rounded-full shadow-2xl transition-all active:scale-90 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`}
            >
              <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'} text-white`}></i>
            </button>
            <div className="flex-1 relative">
              <input 
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(inputText)}
                placeholder={isRecording ? "听取灵感中..." : "继续深入交谈..."}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-full px-6 py-4 md:py-5 pr-14 focus:outline-none focus:border-indigo-500 transition-all text-sm md:text-lg shadow-2xl"
              />
              <button 
                onClick={() => handleSend(inputText)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 md:p-3 bg-indigo-600 rounded-full active:scale-95 transition-transform"
              >
                <i className="fa-solid fa-arrow-up text-white text-xs md:text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {session.status === 'synthesizing' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
           <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
           <h2 className="text-xl md:text-2xl font-serif italic text-white mb-2">{synthMessages[synthMessageIdx]}</h2>
           <p className="text-slate-500 text-xs">缪斯正在通过极致算力，为您捕捉灵感的火花。</p>
        </div>
      )}
    </div>
  );
};

const ArtifactView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mindsparks_sessions');
    if (saved) {
      const data: Session[] = JSON.parse(saved);
      const found = data.find(s => s.id === id);
      if (found) setSession(found);
    }
  }, [id]);

  if (!session || !session.finalArtifact) return null;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111] pb-36 font-serif overflow-x-hidden selection:bg-indigo-100">
      <div className="max-w-3xl mx-auto px-6">
        <header className="py-8 mb-8 flex justify-between items-center border-b border-slate-200">
          <button onClick={() => navigate('/')} className="text-slate-400 font-medium text-xs flex items-center gap-1 hover:text-indigo-600 transition-colors">
            <i className="fa-solid fa-chevron-left"></i> 返回馆藏
          </button>
          <div className="text-right">
            <span className="px-3 py-1 bg-black text-white rounded-full text-[8px] font-bold uppercase tracking-widest">
              {session.finalArtifact.type}
            </span>
          </div>
        </header>

        <article className="prose prose-slate max-w-none">
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-8 text-black tracking-tight">
            {session.finalArtifact.title}
          </h1>
          
          <div className="bg-slate-100 p-6 md:p-8 rounded-2xl border border-slate-200 mb-10 shadow-sm">
            <h2 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-0">备忘核心摘要 / CORE</h2>
            <p className="m-0 italic leading-relaxed text-slate-700 text-[15px] md:text-lg">
              {session.finalArtifact.summary}
            </p>
          </div>

          <div className="text-base md:text-lg leading-[1.9] text-slate-900 whitespace-pre-wrap px-1">
            {session.finalArtifact.content}
          </div>
        </article>
      </div>
      
      {/* 底部浮动按钮 */}
      <div className="fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 flex gap-3 p-2 bg-white/95 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full border border-slate-200 max-w-xl mx-auto">
         <button 
           onClick={() => navigate(`/interview/${id}`)} 
           className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-full font-bold text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
         >
           <i className="fa-solid fa-brain"></i> 继续深度迭代
         </button>
         <button 
           onClick={() => window.print()} 
           className="flex-1 bg-black text-white px-6 py-4 rounded-full font-bold text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
         >
           <i className="fa-solid fa-share-nodes"></i> 导出成果备忘
         </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interview/:id" element={<InterviewStudio />} />
        <Route path="/artifact/:id" element={<ArtifactView />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
