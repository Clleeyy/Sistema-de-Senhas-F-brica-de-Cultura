
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Settings, 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  AlertTriangle, 
  Save, 
  Trash2, 
  LayoutDashboard,
  Volume2,
  Tv,
  Monitor,
  RefreshCcw,
  Copy,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

/**
 * TYPES & CONSTANTS
 */
interface TicketConfig {
  welcomeText: string;
  commonMin: number;
  commonMax: number;
  priorityMin: number;
  priorityMax: number;
  logoUrl: string | null;
  selectedSound: number;
}

interface TicketState {
  common: number;
  priority: number;
  lastUpdate: number;
}

const WELCOME_TEMPLATE = `Seja bem-vindo(a) à
Fábrica de Cultura do Capão Redondo!

Por favor, preencha o formulário entregue e aguarde um momento.
Em breve, chamaremos o número da sua senha para realizar sua inscrição.`;

const DEFAULT_CONFIG: TicketConfig = {
  welcomeText: WELCOME_TEMPLATE,
  commonMin: 1,
  commonMax: 999,
  priorityMin: 1,
  priorityMax: 999,
  logoUrl: null,
  selectedSound: 0
};

const DEFAULT_TICKETS: TicketState = {
  common: 1,
  priority: 1,
  lastUpdate: Date.now()
};

const SYNC_CHANNEL = new BroadcastChannel('fabrica-cultura-sync');

/**
 * UI COMPONENTS
 */
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: any) => {
  const base = "px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50";
  const variants: any = {
    primary: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg",
    secondary: "bg-blue-600 hover:bg-blue-700 text-white",
    outline: "border-2 border-white/10 hover:bg-white/10 text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white"
  };
  return (
    <button disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- AUDIO LOGIC ---
const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((soundIndex: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = (freq: number, start: number, duration: number, vol: number, type: OscillatorType = 'triangle') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      switch (soundIndex) {
        case 0: // Alerta 1: Acorde Harmonioso Longo
          oscillator(523.25, 0, 1.2, 0.3, 'sine'); // C5
          oscillator(659.25, 0, 1.2, 0.2, 'sine'); // E5
          oscillator(783.99, 0, 1.2, 0.2, 'sine'); // G5
          break;
        case 1: // Alerta 2: Arpejo Digital Ascendente
          oscillator(440, 0, 0.2, 0.3, 'square');
          oscillator(554.37, 0.1, 0.2, 0.3, 'square');
          oscillator(659.25, 0.2, 0.2, 0.3, 'square');
          oscillator(880, 0.3, 0.4, 0.3, 'square');
          break;
        case 2: // NOVO Alerta 3: Ringing Tone Constante (Tipo Campainha Eletrônica)
          oscillator(1200, 0, 1.0, 0.4, 'triangle');
          oscillator(1200, 0.2, 0.8, 0.3, 'triangle');
          oscillator(1500, 0.4, 0.6, 0.2, 'sine');
          break;
        case 3: // NOVO Alerta 4: Chamada de Atenção Bifásica (Impacto Industrial)
          oscillator(800, 0, 0.4, 0.4, 'sawtooth');
          oscillator(1100, 0.45, 0.8, 0.4, 'square');
          break;
        case 4: // Alerta 5: Sweep Industrial Longo
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(1600, now + 1.0);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
          osc.start(now);
          osc.stop(now + 1.2);
          break;
        default:
          oscillator(800, 0, 0.5, 0.3, 'sine');
      }
    } catch (e) {
      console.error("Audio error", e);
    }
  }, []);

  return { playSound };
};

// --- SCREENS ---

const ConfigScreen = ({ config, setConfig, resetTickets }: any) => {
  const [localConfig, setLocalConfig] = useState(config);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playSound } = useAudio();

  const save = () => {
    setConfig(localConfig);
    alert("Configurações salvas com sucesso!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLocalConfig({ ...localConfig, logoUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const previewSound = (idx: number) => {
    playSound(idx);
    setLocalConfig({ ...localConfig, selectedSound: idx });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="w-10 h-10 text-purple-500" />
            Configurações
          </h1>
          <p className="text-white/50 mt-1">Gerencie a identidade e limites do seu guichê.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" onClick={resetTickets}>
            <Trash2 className="w-4 h-4" /> Resetar Senhas
          </Button>
          <Button variant="success" onClick={save}>
            <Save className="w-4 h-4" /> Salvar Tudo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-[#1a1a24] border border-white/5 p-8 rounded-3xl shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-500" /> Conteúdo Principal
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Logo da Unidade</label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
                    {localConfig.logoUrl ? (
                      <img src={localConfig.logoUrl} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-white/10 flex flex-col items-center gap-1">
                        <Monitor className="w-8 h-8" />
                        <span className="text-[10px] font-bold">SEM LOGO</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Escolher Imagem</Button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Selecione o Alerta (Sons de Atenção Constante)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => previewSound(idx)}
                      className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                        localConfig.selectedSound === idx 
                        ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      Alerta {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Texto de Boas-vindas</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white h-48 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-none leading-normal"
                  value={localConfig.welcomeText}
                  onChange={e => setLocalConfig({...localConfig, welcomeText: e.target.value})}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-[#1a1a24] border border-white/5 p-8 rounded-3xl shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Limites Numéricos
            </h2>
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Senhas Comuns</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" value={localConfig.commonMin} onChange={e => setLocalConfig({...localConfig, commonMin: parseInt(e.target.value) || 1})} />
                  <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" value={localConfig.commonMax} onChange={e => setLocalConfig({...localConfig, commonMax: parseInt(e.target.value) || 999})} />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-black text-orange-500 uppercase tracking-[0.2em]">Senhas Preferenciais</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" value={localConfig.priorityMin} onChange={e => setLocalConfig({...localConfig, priorityMin: parseInt(e.target.value) || 1})} />
                  <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" value={localConfig.priorityMax} onChange={e => setLocalConfig({...localConfig, priorityMax: parseInt(e.target.value) || 999})} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const CommandScreen = ({ tickets, updateTickets, config }: any) => {
  const adjust = (type: 'common' | 'priority', dir: 1 | -1) => {
    const min = type === 'common' ? config.commonMin : config.priorityMin;
    const max = type === 'common' ? config.commonMax : config.priorityMax;
    const current = tickets[type];
    const newVal = Math.min(max, Math.max(min, current + dir));
    
    if (newVal !== current) {
      updateTickets({ ...tickets, [type]: newVal, lastUpdate: Date.now() });
    }
  };

  const resetToMin = (type: 'common' | 'priority') => {
    const min = type === 'common' ? config.commonMin : config.priorityMin;
    updateTickets({ ...tickets, [type]: min, lastUpdate: Date.now() });
  };

  const copyTransmitLink = () => {
    const url = window.location.origin + window.location.pathname + '#/transmit';
    navigator.clipboard.writeText(url).then(() => {
      alert("Link da tela de transmissão copiado!");
    });
  };

  return (
    <div className="h-screen flex flex-col p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Play className="w-8 h-8 text-emerald-500" /> Painel de Controle
          </h1>
          <p className="text-white/40 text-sm mt-1">Gerencie a chamada das senhas em tempo real.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={copyTransmitLink} className="text-xs">
            <Copy className="w-4 h-4" /> Copiar Link da Tela
          </Button>
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 text-xs font-black tracking-widest animate-pulse">
            AO VIVO
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-10">
        {/* Senha Comum Block - Fixed Square 450x450 */}
        <div className="w-[450px] h-[450px] aspect-square flex-shrink-0 bg-[#1a1a24] rounded-[40px] border border-white/5 p-12 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
          
          <button 
            onClick={() => resetToMin('common')}
            className="absolute top-4 left-6 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg text-white/30 hover:text-blue-400 transition-all flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase z-20"
          >
            <RotateCcw className="w-3 h-3" /> reset
          </button>

          <div className="text-center z-10 pt-4">
            <h2 className="text-blue-500 font-black text-sm tracking-[0.4em] uppercase mb-4">Senha Comum</h2>
            <div className="text-[120px] font-bold text-white tabular-nums leading-none font-fredoka">
              {String(tickets.common).padStart(3, '0')}
            </div>
          </div>
          <div className="flex gap-6 w-full z-10">
            <button onClick={() => adjust('common', -1)} className="flex-1 bg-white/5 hover:bg-white/10 h-28 rounded-3xl flex items-center justify-center transition-all active:scale-90 text-white/40">
              <ChevronLeft className="w-16 h-16" />
            </button>
            <button onClick={() => adjust('common', 1)} className="flex-1 bg-blue-600 hover:bg-blue-700 h-28 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/30 transition-all active:scale-95 text-white">
              <ChevronRight className="w-16 h-16" />
            </button>
          </div>
        </div>

        {/* Senha Preferencial Block - Fixed Square 450x450 */}
        <div className="w-[450px] h-[450px] aspect-square flex-shrink-0 bg-[#1a1a24] rounded-[40px] border border-white/5 p-12 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />

          <button 
            onClick={() => resetToMin('priority')}
            className="absolute top-4 left-6 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg text-white/30 hover:text-orange-400 transition-all flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase z-20"
          >
            <RotateCcw className="w-3 h-3" /> reset
          </button>

          <div className="text-center z-10 pt-4">
            <h2 className="text-orange-500 font-black text-sm tracking-[0.4em] uppercase mb-4">Senha Preferencial</h2>
            <div className="text-[120px] font-bold text-white tabular-nums leading-none font-fredoka">
              {String(tickets.priority).padStart(3, '0')}
            </div>
          </div>
          <div className="flex gap-6 w-full z-10">
            <button onClick={() => adjust('priority', -1)} className="flex-1 bg-white/5 hover:bg-white/10 h-28 rounded-3xl flex items-center justify-center transition-all active:scale-90 text-white/40">
              <ChevronLeft className="w-16 h-16" />
            </button>
            <button onClick={() => adjust('priority', 1)} className="flex-1 bg-orange-600 hover:bg-orange-700 h-28 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-600/30 transition-all active:scale-95 text-white">
              <ChevronRight className="w-16 h-16" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransmitScreen = ({ tickets, config }: any) => {
  const { playSound } = useAudio();
  const lastUpdateRef = useRef(tickets.lastUpdate);
  const [highlight, setHighlight] = useState<'common' | 'priority' | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tickets.lastUpdate > lastUpdateRef.current) {
      playSound(config.selectedSound);
      
      const changedField = tickets.common !== (window as any).__lastCommonTransmit ? 'common' : 'priority';
      (window as any).__lastCommonTransmit = tickets.common;
      (window as any).__lastPriorityTransmit = tickets.priority;
      
      setHighlight(changedField as any);
      const timer = setTimeout(() => setHighlight(null), 4000);
      lastUpdateRef.current = tickets.lastUpdate;
      return () => clearTimeout(timer);
    }
  }, [tickets.lastUpdate, playSound, config.selectedSound]);

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-[#1e3a8a] via-[#312e81] to-[#1e1b4b] text-white font-inter relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-blue-400/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] bg-purple-500/10 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <aside className="w-[32%] h-full flex flex-col justify-center items-center p-8 relative z-10 bg-black/10 backdrop-blur-xl border-r border-white/5">
        <div className="flex flex-col items-center text-center w-full">
          <div className="w-72 h-72 flex items-center justify-center mb-16">
            {config.logoUrl ? (
              <img src={config.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
            ) : (
              <div className="text-white/10 font-black text-6xl font-fredoka">FC</div>
            )}
          </div>
          <div className="w-full">
            <p className="text-[1.6rem] text-white/70 font-medium leading-relaxed max-w-[95%] mx-auto whitespace-pre-line text-center">
              {config.welcomeText}
            </p>
          </div>
          <div className="flex flex-col items-center w-full pt-16">
            <span className="text-6xl font-extralight tabular-nums text-white/80 mb-20">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex items-center gap-4 py-4 px-10 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner mt-4">
              <Volume2 className="w-6 h-6 text-purple-400 animate-pulse" />
              <span className="text-sm font-black tracking-[0.2em] uppercase text-white/40">Aguarde o aviso sonoro</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10">
        <section className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 ${highlight === 'common' ? 'bg-blue-400/10' : ''}`}>
          <div className="text-center">
            <h2 className="text-blue-400 font-extrabold text-6xl tracking-tight uppercase mb-4">Senha Comum</h2>
            <div className={`text-[13vw] font-bold leading-none tabular-nums font-fredoka transition-transform duration-700 ${highlight === 'common' ? 'scale-105 text-white' : 'text-white/95'}`}>
              {String(tickets.common).padStart(3, '0')}
            </div>
          </div>
        </section>
        <div className="h-px w-[85%] mx-auto bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
        <section className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 ${highlight === 'priority' ? 'bg-orange-400/10' : ''}`}>
          <div className="text-center">
            <h2 className="text-orange-400 font-extrabold text-6xl tracking-tight uppercase mb-4">Senha Preferencial</h2>
            <div className={`text-[13vw] font-bold leading-none tabular-nums font-fredoka transition-transform duration-700 ${highlight === 'priority' ? 'scale-105 text-white' : 'text-white/95'}`}>
              {String(tickets.priority).padStart(3, '0')}
            </div>
          </div>
        </section>
      </main>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />
    </div>
  );
};

const App = () => {
  const [view, setView] = useState('config');
  const [config, setConfigState] = useState<TicketConfig>(() => {
    const saved = localStorage.getItem('fabrica-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [tickets, setTicketsState] = useState<TicketState>(() => {
    const saved = localStorage.getItem('fabrica-tickets');
    return saved ? JSON.parse(saved) : DEFAULT_TICKETS;
  });

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.replace('#/', '');
      if (['config', 'command', 'transmit'].includes(h)) setView(h);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const updateConfig = (c: TicketConfig) => {
    setConfigState(c);
    localStorage.setItem('fabrica-config', JSON.stringify(c));
    SYNC_CHANNEL.postMessage({ type: 'CONFIG_UPDATE', payload: c });
  };

  const updateTickets = (t: TicketState) => {
    setTicketsState(t);
    localStorage.setItem('fabrica-tickets', JSON.stringify(t));
    SYNC_CHANNEL.postMessage({ type: 'TICKET_UPDATE', payload: t });
  };

  const resetTickets = () => {
    if (confirm("Deseja realmente reiniciar todas as senhas para o valor inicial?")) {
      updateTickets(DEFAULT_TICKETS);
    }
  };

  useEffect(() => {
    const handleSync = (e: MessageEvent) => {
      if (e.data.type === 'TICKET_UPDATE') setTicketsState(e.data.payload);
      if (e.data.type === 'CONFIG_UPDATE') setConfigState(e.data.payload);
    };
    SYNC_CHANNEL.addEventListener('message', handleSync);
    return () => SYNC_CHANNEL.removeEventListener('message', handleSync);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {view === 'config' && <ConfigScreen config={config} setConfig={updateConfig} resetTickets={resetTickets} />}
      {view === 'command' && <CommandScreen tickets={tickets} updateTickets={updateTickets} config={config} />}
      {view === 'transmit' && <TransmitScreen tickets={tickets} config={config} />}
      
      {view !== 'transmit' && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-8 shadow-2xl z-50">
          <button onClick={() => window.location.hash = '#/config'} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${view === 'config' ? 'text-purple-400' : 'text-white/30 hover:text-white'}`}>
            <Settings className="w-4 h-4" /> Config
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={() => window.location.hash = '#/command'} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${view === 'command' ? 'text-emerald-400' : 'text-white/30 hover:text-white'}`}>
            <LayoutDashboard className="w-4 h-4" /> Operador
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={() => window.location.hash = '#/transmit'} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${view === 'transmit' ? 'text-blue-400' : 'text-white/30 hover:text-white'}`}>
            <Tv className="w-4 h-4" /> Transmissão
          </button>
        </nav>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
