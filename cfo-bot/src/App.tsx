import React, { useState, useMemo } from 'react';
import { Calculator, Download, Printer, Save, History, X } from 'lucide-react';
import './App.css';
import { calculateCost } from './utils/calculator';
import { COMPUTE_MODELS } from './utils/calculator';
import type { InputParams, ComputeProvider } from './utils/calculator';

interface SavedSession {
  id: string;
  name: string;
  data: InputParams;
}

function App() {
  const [params, setParams] = useState<InputParams>({
    daily_messages: 126000, 
    monthly_active_users: 6600,
    tokens_in: 300,
    tokens_out: 210,
    avg_exec_ms: 800,
    memory_gb: 0.25,
    ai_model: 'gpt-4o',
    compute_id: 'firebase-spark', 
    storage_id: 'firebase',
    bandwidth_id: 'firebase',
    exchange_rate: 480
  });

  const [primaryCurrency, setPrimaryCurrency] = useState<'USD' | 'KZT'>('KZT');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>(() => {
    try {
      const local = localStorage.getItem('cfo_sessions');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'number' || type === 'range') finalValue = parseFloat(value);
    
    setParams(prev => ({ ...prev, [name]: finalValue }));
  };

  const results = useMemo(() => {
    const computeKeys = Object.keys(COMPUTE_MODELS) as ComputeProvider[];
    const resList = computeKeys.map(cid => {
      const calcParams = { ...params, compute_id: cid };
      try {
        const result = calculateCost(calcParams);
        return {
          id: cid,
          name: getComputeName(cid),
          vendor: getVendorTag(cid),
          result
        };
      } catch (err) {
        return null;
      }
    }).filter(x => x !== null) as { id: ComputeProvider, name: string, vendor: string, result: ReturnType<typeof calculateCost> }[];

    // Sort to find cheapest by USD (base)
    resList.sort((a, b) => a.result.total_usd - b.result.total_usd);
    return resList;
  }, [params]);

  const handleExportCSV = () => {
    let csv = "Provider,Vendor,Total USD,Total KZT,AI Cost USD,Compute Cost USD,Storage Cost USD,Bandwidth Cost USD,Cost Per Message USD\n";
    results.forEach(r => {
      const { total_usd, total_kzt, breakdown, cost_per_message } = r.result;
      csv += `"${r.name}","${r.vendor}",${total_usd.toFixed(2)},${total_kzt.toFixed(2)},${breakdown.ai.toFixed(4)},${breakdown.compute.toFixed(4)},${breakdown.storage.toFixed(4)},${breakdown.bandwidth.toFixed(4)},${cost_per_message.toFixed(6)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "cost-estimations.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveSession = () => {
    const newSession: SavedSession = {
      id: Date.now().toString(),
      name: `${new Date().toLocaleTimeString()}`,
      data: { ...params }
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem('cfo_sessions', JSON.stringify(updated));
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem('cfo_sessions', JSON.stringify(updated));
  };

  const handleLoadSession = (loadedData: InputParams) => {
    setParams(loadedData);
    setShowHistory(false);
  };

  return (
    <div className="container">
      <header>
        <h1><Calculator size={24} color="#39ff14" /> CFO Bot <span style={{fontSize: '0.65rem', color: '#8892b0'}}>Cloud Cost</span></h1>
        
        <div className="header-actions hide-on-print">
           <button className="export-btn" onClick={() => setShowHistory(!showHistory)}><History size={14} /> History</button>
           <button className="export-btn" onClick={handleSaveSession}><Save size={14} /> Save</button>
           <button className="export-btn" onClick={handleExportCSV}><Download size={14} /> CSV</button>
           <button className="export-btn" onClick={handleExportPDF}><Printer size={14} /> PDF</button>
        </div>
      </header>

      {showHistory && (
        <div className="history-modal hide-on-print">
          <div className="history-header">
            <h3>Saved Sessions</h3>
            <button className="close-btn" onClick={() => setShowHistory(false)}><X size={16}/></button>
          </div>
          {sessions.length === 0 ? <div className="no-sessions">No saved sessions yet.</div> : (
            <ul className="sessions-list">
              {sessions.map(s => (
                <li key={s.id} className="session-item">
                  <div className="session-info">
                    <span className="session-name">Session: {s.name}</span>
                    <span className="session-meta">[{s.data.ai_model}] {s.data.daily_messages} msgs</span>
                  </div>
                  <div className="session-actions">
                    <button className="action-btn load" onClick={() => handleLoadSession(s.data)}>Load</button>
                    <button className="action-btn del" onClick={() => handleDeleteSession(s.id)}>Del</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="app-layout">
        {/* Left Sidebar */}
        <div className="sidebar hide-on-print">
          <h2>CURRENCY DISPLAY</h2>
          <div className="form-group">
            <label>Primary Currency</label>
            <select value={primaryCurrency} onChange={(e) => setPrimaryCurrency(e.target.value as 'USD'|'KZT')}>
              <option value="KZT">KZT - Kazakhstani Tenge</option>
              <option value="USD">USD - US Dollar</option>
            </select>
            <div style={{fontSize: '0.55rem', color: '#8892b0', marginTop: '0.5rem'}}>Rate: 1 USD = {params.exchange_rate} KZT</div>
          </div>

          <h2 style={{marginTop: '2rem'}}>AI MODEL</h2>
          <div className="form-group">
            <label>Model</label>
            <select name="ai_model" value={params.ai_model} onChange={handleInputChange}>
              <option value="gpt-4.1o-beta">GPT-4.1o (Beta/Free)</option>
              <option value="gpt-4o">GPT-4o - $2.5 / $10</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="claude-haiku-4.5">Claude Haiku 4.5</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-3-flash">Gemini 3 Flash</option>
              <option value="gemini-3-pro">Gemini 3 Pro</option>
              <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
              <option value="raptor-mini">Raptor Mini 🇰🇿</option>
            </select>
          </div>

          <div className="form-group">
            <label>Avg Input Tokens <span className="val-display">{params.tokens_in}</span></label>
            <input type="range" className="range-slider" name="tokens_in" min="50" max="1000" step="10" value={params.tokens_in} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>Avg Output Tokens <span className="val-display">{params.tokens_out}</span></label>
            <input type="range" className="range-slider" name="tokens_out" min="10" max="1000" step="10" value={params.tokens_out} onChange={handleInputChange} />
          </div>

          <h2 style={{marginTop: '2rem'}}>USAGE ASSUMPTIONS</h2>
          <div className="form-group">
            <label>Daily Messages <span className="val-display">{(params.daily_messages/1000).toFixed(1)}k</span></label>
            <input type="range" className="range-slider" name="daily_messages" min="1000" max="500000" step="1000" value={params.daily_messages} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>Monthly Active Users <span className="val-display">{(params.monthly_active_users/1000).toFixed(1)}k</span></label>
            <input type="range" className="range-slider" name="monthly_active_users" min="100" max="100000" step="100" value={params.monthly_active_users} onChange={handleInputChange} />
          </div>

          <h2 style={{marginTop: '2rem'}}>COMPUTE (SERVERLESS)</h2>
          <div className="form-group">
            <label>Avg Exec Time <span className="val-display">{params.avg_exec_ms}ms</span></label>
            <input type="range" className="range-slider" name="avg_exec_ms" min="100" max="5000" step="100" value={params.avg_exec_ms} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>Memory Allocation</label>
            <select name="memory_gb" value={params.memory_gb} onChange={handleInputChange}>
              <option value={0.125}>0.125 GB</option>
              <option value={0.25}>0.25 GB</option>
              <option value={0.5}>0.5 GB</option>
              <option value={1}>1 GB</option>
              <option value={2}>2 GB</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="cards-grid">
            {results.map((item, idx) => {
              const isCheapest = idx === 0;
              const total = item.result.total_usd;
              const bd = item.result.breakdown;
              
              // Formatting logic based on active currency
              const isKztMain = primaryCurrency === 'KZT';
              const mainValueText = isKztMain 
                ? `${item.result.total_kzt.toLocaleString(undefined, { maximumFractionDigits: 0 })} KZT`
                : `$${total.toFixed(2)}`;
              
              const subValueText = isKztMain
                ? `$${total.toFixed(2)}`
                : `${item.result.total_kzt.toLocaleString(undefined, { maximumFractionDigits: 0 })} KZT`;

              return (
                <div key={item.id} className={`provider-card ${isCheapest ? 'cheapest' : ''}`}>
                  {isCheapest && <div className="cheapest-badge">Cheapest</div>}
                  
                  <div className="card-header">
                    <div className="provider-info">
                      <div className="provider-logo">{item.vendor}</div>
                      <div className="provider-name">{item.name}</div>
                    </div>
                    <div className="cost-display">
                      <div className="cost-main" style={{ color: getPriceColor(total) }}>{mainValueText}</div>
                      <div className="cost-sub">{subValueText}</div>
                    </div>
                  </div>

                  <div className="breakdown-bars">
                    <BarRow label="AI API" cost={bd.ai} total={total} primaryCurrency={primaryCurrency} rate={params.exchange_rate!} />
                    <BarRow label="Compute" cost={bd.compute} total={total} primaryCurrency={primaryCurrency} rate={params.exchange_rate!} />
                    <BarRow label="Storage" cost={bd.storage} total={total} primaryCurrency={primaryCurrency} rate={params.exchange_rate!} />
                    <BarRow label="Bandwidth" cost={bd.bandwidth} total={total} primaryCurrency={primaryCurrency} rate={params.exchange_rate!} />
                  </div>

                  <div className="card-footer">
                    <span>per message</span>
                    <span className="footer-val">
                       {primaryCurrency === 'KZT' 
                         ? `${(item.result.cost_per_message * params.exchange_rate!).toFixed(4)} KZT` 
                         : `$${item.result.cost_per_message.toFixed(6)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, cost, total, primaryCurrency, rate }: { label: string, cost: number, total: number, primaryCurrency: 'USD'|'KZT', rate: number }) {
  const percent = total > 0 ? Math.round((cost / total) * 100) : 0;
  
  const displayCost = primaryCurrency === 'KZT'
    ? `${(cost * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })} KZT`
    : `$${cost.toFixed(4)}`;

  return (
    <div className="breakdown-row">
      <div className="bd-label-row">
        <span>{label}</span>
        <span className="bd-val">{displayCost} ({percent}%)</span>
      </div>
      <div className="bd-bar-bg">
        <div className="bd-bar-fill" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function getVendorTag(id: string) {
  if (id.includes('firebase') || id.includes('gcp')) return 'GCP';
  if (id.includes('aws')) return 'AWS';
  if (id.includes('azure')) return 'Azure';
  if (id.includes('do-')) return 'DO';
  if (id.includes('pscloud') || id.includes('qaztelecom')) return 'KZ';
  return 'Cloud';
}

function getComputeName(id: string) {
  const map: Record<string, string> = {
    'firebase-spark': 'Firebase Spark',
    'firebase-blaze': 'Firebase Blaze',
    'aws-lambda': 'AWS Lambda',
    'gcp-cloud-run': 'Cloud Run',
    'aws-t3-micro': 'EC2 t3.micro',
    'aws-t3-small': 'EC2 t3.small',
    'gcp-e2-micro': 'e2-micro',
    'gcp-e2-small': 'e2-small',
    'azure-b1s': 'Azure B1s',
    'azure-b2s': 'Azure B2s',
    'do-basic-1-1': 'Droplet 1GB',
    'do-basic-1-2': 'Droplet 2GB',
    'pscloud-vps': 'PS Cloud Stand',
    'qaztelecom-lite': 'VPS Lite',
    'qaztelecom-stand': 'VPS Stand'
  };
  return map[id] || id;
}

function getPriceColor(usd: number) {
  if (usd < 50) return '#39ff14'; // Green
  if (usd < 500) return '#f5a623'; // Orange
  return '#ff0000'; // Red
}

export default App;
