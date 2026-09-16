import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Activity, Search, Cpu, ShieldAlert, Wifi, Server, Terminal, 
  Download, AlertTriangle, CheckCircle, RefreshCw, Sliders, Zap,
  Map, BarChart3, Settings, Users, Radio, AlertOctagon, Layers
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

const INITIAL_WORKERS = [
  { id: "WK_1094", name: "David Chen", zone: "Chemical Yard", x: 120, y: 180, hr: 76, gsr: 1250, accel: 1.02, state: "NOMINAL" },
  { id: "WK_0842", name: "Alex Mercer", zone: "Scaffold Area B", x: 340, y: 120, hr: 124, gsr: 1920, accel: 3.85, state: "CRITICAL_CRISIS" },
  { id: "WK_2201", name: "Elena Rostova", zone: "Chamber 1", x: 220, y: 290, hr: 68, gsr: 1100, accel: 0.98, state: "NOMINAL" },
  { id: "WK_0093", name: "Robert Taylor", zone: "Turbine Hall", x: 450, y: 220, hr: 92, gsr: 1480, accel: 1.15, state: "WARNING" },
  { id: "WK_0421", name: "Marcus Vance", zone: "Excavation Pit", x: 180, y: 380, hr: 72, gsr: 1180, accel: 1.01, state: "NOMINAL" },
];

const HISTORICAL_ANALYTICS = [
  { time: "08:00", stressIndex: 12, anomalyCount: 0, avgHR: 72 },
  { time: "09:00", stressIndex: 18, anomalyCount: 1, avgHR: 75 },
  { time: "10:00", stressIndex: 45, anomalyCount: 3, avgHR: 88 },
  { time: "11:00", stressIndex: 82, anomalyCount: 6, avgHR: 104 },
  { time: "12:00", stressIndex: 30, anomalyCount: 2, avgHR: 78 },
  { time: "13:00", stressIndex: 25, anomalyCount: 0, avgHR: 74 },
  { time: "14:00", stressIndex: 65, anomalyCount: 4, avgHR: 95 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("fleet"); // 'fleet' | 'map' | 'rules' | 'analytics' | 'hardware'
  const [workers, setWorkers] = useState(INITIAL_WORKERS);
  const [selectedWorkerId, setSelectedWorkerId] = useState("WK_1094");
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("hr");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [streamSpeed, setStreamSpeed] = useState(1000);
  const [isPaused, setIsPaused] = useState(false);
  const [seizureSimulated, setSeizureSimulated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeIncidents, setActiveIncidents] = useState([
    { id: "INC-8902", workerId: "WK_0842", workerName: "Alex Mercer", type: "Seizure Pattern Triggered", level: "CRISIS", time: new Date().toLocaleTimeString(), acknowledged: false }
  ]);

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), msg: "ESP32 Ankle-Band Array active over I2C Fast Mode", level: "SYS" },
    { id: 2, time: new Date().toLocaleTimeString(), msg: "InfluxDB 'industrial_vitals' bucket stream listening", level: "SYS" }
  ]);

  const canvasRef = useRef(null);
  const activeWorker = workers.find(w => w.id === selectedWorkerId) || workers[0];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();

      setWorkers(prevWorkers => 
        prevWorkers.map(w => {
          let updatedHR = w.hr;
          let updatedGSR = w.gsr;
          let updatedAccel = w.accel;
          let currentState = w.state;

          let updatedX = Math.max(50, Math.min(550, w.x + (Math.floor(Math.random() * 7) - 3)));
          let updatedY = Math.max(50, Math.min(420, w.y + (Math.floor(Math.random() * 7) - 3)));

          if (w.id === selectedWorkerId && seizureSimulated) {
            updatedHR = 135 + Math.floor(Math.random() * 8);
            updatedGSR = 1980 + Math.floor(Math.random() * 50);
            updatedAccel = parseFloat((4.10 + (Math.random() * 0.3)).toFixed(2));
            currentState = "CRITICAL_CRISIS";
          } else if (w.state !== "CRITICAL_CRISIS") {
            updatedHR = Math.max(55, Math.min(160, w.hr + (Math.floor(Math.random() * 5) - 2)));
            updatedGSR = Math.max(800, Math.min(2500, w.gsr + (Math.floor(Math.random() * 20) - 10)));
            updatedAccel = parseFloat((1.0 + (Math.random() * 0.1 - 0.05)).toFixed(2));
            
            if (updatedAccel > 3.2 || updatedGSR > 1750 || updatedHR > 120) {
              currentState = "WARNING";
            } else {
              currentState = "NOMINAL";
            }
          }

          return { ...w, x: updatedX, y: updatedY, hr: updatedHR, gsr: updatedGSR, accel: updatedAccel, state: currentState };
        })
      );

      setTelemetryHistory(prev => [
        ...prev.slice(-29),
        { time: now, hr: activeWorker.hr, gsr: activeWorker.gsr, accel: activeWorker.accel }
      ]);

    }, streamSpeed);

    return () => clearInterval(interval);
  }, [selectedWorkerId, seizureSimulated, activeWorker, streamSpeed, isPaused]);

  useEffect(() => {
    if (activeTab !== 'map' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, 240, 180);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter';
    ctx.fillText('Chemical Yard (Hazard Zone)', 50, 60);

    ctx.strokeRect(320, 40, 240, 180);
    ctx.fillText('Scaffold B & High Altitude', 330, 60);

    ctx.strokeRect(40, 250, 520, 180);
    ctx.fillText('Main Turbine & Chamber Floor', 50, 270);

    workers.forEach(w => {
      const isSelected = w.id === selectedWorkerId;

      ctx.beginPath();
      ctx.arc(w.x, w.y, isSelected ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = w.state === 'CRITICAL_CRISIS' ? '#f43f5e' : w.state === 'WARNING' ? '#f59e0b' : '#14b8a6';
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px Inter';
      ctx.fillText(w.name, w.x + 12, w.y + 4);
    });
  }, [workers, activeTab, selectedWorkerId]);

  const toggleSeizureSimulation = () => {
    const nextState = !seizureSimulated;
    setSeizureSimulated(nextState);

    if (nextState) {
      const newInc = {
        id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
        workerId: activeWorker.id,
        workerName: activeWorker.name,
        type: "Multiple Threshold Spike (Kinetic + GSR)",
        level: "CRISIS",
        time: new Date().toLocaleTimeString(),
        acknowledged: false
      };
      setActiveIncidents(prev => [newInc, ...prev]);
    }

    const logMsg = nextState 
      ? `DEMO TRIGGER: Seizure event force-injected on ${activeWorker.id} (${activeWorker.name}).` 
      : `DEMO RESET: Normalizing telemetry stream for ${activeWorker.id}.`;

    setAuditLogs(prev => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), msg: logMsg, level: nextState ? "CRISIS" : "SYS" },
      ...prev.slice(0, 15)
    ]);
  };

  const acknowledgeIncident = (incId) => {
    setActiveIncidents(prev => prev.map(inc => inc.id === incId ? { ...inc, acknowledged: true } : inc));
    setAuditLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: `ACKNOWLEDGED: Incident ${incId} flagged by dispatcher.`, level: "SYS" }, ...prev]);
  };

  const clearIncident = (incId) => {
    setActiveIncidents(prev => prev.filter(inc => inc.id !== incId));
  };

  const exportCSV = () => {
    const headers = "ID,Name,Zone,HeartRate_BPM,GSR_uS,Accel_g,State\n";
    const rows = workers.map(w => `${w.id},${w.name},${w.zone},${w.hr},${w.gsr},${w.accel},${w.state}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_export_${Date.now()}.csv`;
    a.click();
  };

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === "ALL" || w.state === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getMetricColor = () => {
    switch(selectedMetric) {
      case 'gsr': return '#f59e0b';
      case 'accel': return '#f43f5e';
      default: return '#818cf8';
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 font-sans flex">
      
      {/* Global Sidebar - Completely Borderless Layout */}
      <aside className="w-64 border-r border-slate-800/80 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold tracking-wide">
            <Shield className="w-5 h-5" />
            <span className="text-white text-base">SentryPulse OS</span>
          </div>

          <nav className="space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                activeTab === 'fleet' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" /> Live Fleet Ops
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                activeTab === 'map' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-4 h-4" /> Spatial Digital Twin
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                activeTab === 'rules' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4" /> AI Triage & Rules
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                activeTab === 'analytics' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Historical Analytics
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                activeTab === 'hardware' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" /> Edge Hardware Config
            </button>
          </nav>
        </div>

        <div className="space-y-2 pt-6 border-t border-slate-800 text-xs text-slate-500 font-mono">
          <div className="flex justify-between">
            <span>MQTT Stream</span>
            <span className="text-teal-400">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span>Latency</span>
            <span className="text-slate-300">14ms</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="px-8 py-6 border-b border-slate-800/80 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-white">
              {activeTab === 'fleet' && 'Live Personnel Operations & Dispatch'}
              {activeTab === 'map' && 'Spatial Digital Twin (Floorplan Tracking)'}
              {activeTab === 'rules' && 'Automated Sensor Rule Execution Engine'}
              {activeTab === 'analytics' && 'Historical Strain & Anomaly Intelligence'}
              {activeTab === 'hardware' && 'Ankle-Band ESP32 Hardware & I/O Topology'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time edge IoT ingestion via WebSockets & MQTT</p>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <button 
              onClick={() => setIsPaused(!isPaused)} 
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${!isPaused ? 'animate-spin' : ''}`} />
              {isPaused ? 'Paused' : 'Live Ingestion'}
            </button>
            <button 
              onClick={exportCSV} 
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Data
            </button>
          </div>
        </header>

        {/* Dynamic Pages Workspace */}
        <main className="p-8 flex-1 overflow-y-auto">
          
          {/* TAB 1: LIVE FLEET OPS */}
          {activeTab === 'fleet' && (
            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-5 space-y-6">
                <div className="flex justify-between items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-0 top-2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter personnel..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-b border-slate-700 text-xs pl-6 pr-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    {['ALL', 'NOMINAL', 'CRITICAL_CRISIS'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`cursor-pointer transition-colors ${statusFilter === status ? 'text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {status === 'CRITICAL_CRISIS' ? 'CRISIS' : status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
                  {filteredWorkers.map(w => (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      className={`py-3 cursor-pointer transition-colors flex items-center justify-between ${
                        w.id === selectedWorkerId ? 'text-white font-medium' : 'hover:text-slate-200 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs">{w.name} <span className="text-[10px] text-slate-500 font-mono ml-1">{w.id}</span></div>
                        <div className="text-[11px] text-slate-500">{w.zone}</div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span>{w.hr} BPM</span>
                        <span>{w.accel}g</span>
                        <span className={`w-2 h-2 rounded-full ${w.state === 'CRITICAL_CRISIS' ? 'bg-rose-500 animate-pulse' : 'bg-teal-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Active Incident Queue
                  </span>
                  {activeIncidents.map(inc => (
                    <div key={inc.id} className="py-2 text-xs space-y-1 border-b border-slate-800/60">
                      <div className="flex justify-between text-rose-400 font-medium">
                        <span>{inc.workerName}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{inc.time}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{inc.type}</p>
                      <div className="flex gap-3 pt-1">
                        {!inc.acknowledged ? (
                          <button onClick={() => acknowledgeIncident(inc.id)} className="text-indigo-400 hover:text-indigo-300 text-[10px] cursor-pointer">
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-[10px] text-teal-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Dispatched</span>
                        )}
                        <button onClick={() => clearIncident(inc.id)} className="text-slate-500 text-[10px] cursor-pointer">Clear</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-7 space-y-6 flex flex-col justify-between">
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Live Focus Node</span>
                    <h2 className="text-xl font-semibold text-slate-100 mt-0.5">{activeWorker.name}</h2>
                    <p className="text-xs text-slate-500 font-mono">{activeWorker.id} • {activeWorker.zone}</p>
                  </div>
                  <button
                    onClick={toggleSeizureSimulation}
                    className={`px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      seizureSimulated ? 'text-rose-400 border border-rose-500/40 bg-rose-500/10' : 'text-indigo-300 border border-indigo-500/30 bg-indigo-500/10'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {seizureSimulated ? 'Stop Seizure Injector' : 'Simulate Seizure Telemetry'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold uppercase text-slate-500">Live Waveform Stream</span>
                    <div className="flex gap-3 text-[11px]">
                      <button onClick={() => setSelectedMetric('hr')} className={`cursor-pointer ${selectedMetric === 'hr' ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>HR</button>
                      <button onClick={() => setSelectedMetric('gsr')} className={`cursor-pointer ${selectedMetric === 'gsr' ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>GSR</button>
                      <button onClick={() => setSelectedMetric('accel')} className={`cursor-pointer ${selectedMetric === 'accel' ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>ACCEL</button>
                    </div>
                  </div>

                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={telemetryHistory}>
                        <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', color: '#f8fafc' }} />
                        <Line type="monotone" dataKey={selectedMetric} stroke={getMetricColor()} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 text-xs space-y-1 font-mono text-slate-400">
                  <div className="text-slate-500 font-sans font-semibold uppercase text-[11px]">Live MQTT Log</div>
                  {auditLogs.slice(0, 3).map(log => (
                    <div key={log.id} className="flex gap-4">
                      <span className="text-slate-600">{log.time}</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL DIGITAL TWIN (CARDLESS) */}
          {activeTab === 'map' && (
            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-8 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">Facility Coordinates Canvas</span>
                  <span className="text-teal-400 font-mono">Live Positioning Engine</span>
                </div>
                <canvas ref={canvasRef} width={600} height={460} className="w-full bg-[#0F172A]" />
              </div>

              <div className="col-span-4 space-y-4">
                <span className="text-xs font-semibold uppercase text-slate-500">Zone Distribution</span>
                <div className="space-y-3 divide-y divide-slate-800/60">
                  {workers.map(w => (
                    <div key={w.id} className="pt-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-medium text-slate-200">{w.name}</div>
                        <div className="text-slate-500 text-[11px]">{w.zone}</div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="text-slate-400">X: {w.x} | Y: {w.y}</div>
                        <div className={w.state === 'CRITICAL_CRISIS' ? 'text-rose-400' : 'text-teal-400'}>{w.state}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI TRIAGE & RULES (CARDLESS) */}
          {activeTab === 'rules' && (
            <div className="space-y-8">
              <p className="text-xs text-slate-400">Automatic multi-threshold state evaluation triggers SMS alerts instantly via Twilio.</p>
              <div className="grid grid-cols-3 gap-12">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-rose-400 uppercase">Seizure / Anomaly Triage</span>
                  <p className="text-xs text-slate-400 leading-relaxed">Fires if Acceleration &gt; 3.5g AND Galvanic Skin Conductivity &gt; 1800uS AND Heart Rate &gt; 115 BPM simultaneously.</p>
                  <div className="text-[11px] font-mono text-slate-500 pt-1">Action: Force SMS + Flash Dispatch Queue</div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase">Heat Strain Caution</span>
                  <p className="text-xs text-slate-400 leading-relaxed">Fires if GSR Conductivity &gt; 1700uS for over 30 continuous seconds without kinetic activity.</p>
                  <div className="text-[11px] font-mono text-slate-500 pt-1">Action: Dispatch Hydration Warning</div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-indigo-400 uppercase">Hard Fall Detection</span>
                  <p className="text-xs text-slate-400 leading-relaxed">Fires if Acceleration spikes above 4.5g followed by zero motion ($g \approx 1.0$) for 5 continuous seconds.</p>
                  <div className="text-[11px] font-mono text-slate-500 pt-1">Action: Trigger Critical Stretcher Alert</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORICAL ANALYTICS (CARDLESS) */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Shift Stress Index Trend</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={HISTORICAL_ANALYTICS}>
                      <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', color: '#f8fafc' }} />
                      <Area type="monotone" dataKey="stressIndex" stroke="#818cf8" fill="#818cf815" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Hourly Anomaly Occurrences</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={HISTORICAL_ANALYTICS}>
                      <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '11px', color: '#f8fafc' }} />
                      <Bar dataKey="anomalyCount" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HARDWARE CONFIG (CARDLESS) */}
          {activeTab === 'hardware' && (
            <div className="space-y-6 text-xs text-slate-300">
              <span className="font-semibold text-slate-500 uppercase tracking-wider block">ESP32 Ankle Wearable Pinout Topology</span>
              <div className="grid grid-cols-2 gap-8 divide-x divide-slate-800">
                <div className="space-y-4">
                  <div>
                    <span className="text-slate-400 block font-medium">Pulse Sensor (MAX30102)</span>
                    <span className="font-mono text-indigo-300">SDA: GPIO 14 / SCL: GPIO 15 (I2C)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">6-Axis Gyro/Accel (MPU6050)</span>
                    <span className="font-mono text-indigo-300">SDA: GPIO 14 / SCL: GPIO 15 (I2C)</span>
                  </div>
                </div>
                <div className="pl-8 space-y-4">
                  <div>
                    <span className="text-slate-400 block font-medium">Skin Conductance (Grove GSR)</span>
                    <span className="font-mono text-amber-300">ADC2: GPIO 12 (Analog In)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Haptic Vibration Motor</span>
                    <span className="font-mono text-teal-300">PWM: GPIO 13 (Digital Out)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}