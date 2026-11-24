import React, { useState } from 'react';
import { Terminal, Play, CheckCircle2, ShieldCheck, Code2, Database, HelpCircle } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface ToolDef {
  name: string;
  type: 'read' | 'write' | 'write, gated';
  description: string;
  defaultParams: Record<string, any>;
  endpoint: string;
  method: 'GET' | 'POST';
}

const MCP_TOOLS: ToolDef[] = [
  {
    name: 'find_plot',
    type: 'read',
    description: "Returns farmer's saved plot: id, polygon, area (acres), DIGIPIN, survey number.",
    defaultParams: { farmer_id: 'FMR-A3DAEDB2' },
    endpoint: '/api/plots/FMR-A3DAEDB2',
    method: 'GET'
  },
  {
    name: 'get_satellite_change',
    type: 'read',
    description: 'Compares Sentinel-2 NDVI before vs after disaster date with percentage drop.',
    defaultParams: {
      plot_id: 'PLT-DEMO-DEVANAHALLI',
      before_date: '2026-09-30',
      after_date: '2026-10-22',
      disaster_type: 'flood'
    },
    endpoint: '/api/evidence/satellite',
    method: 'POST'
  },
  {
    name: 'get_rainfall',
    type: 'read',
    description: 'Queries Open-Meteo precipitation archive, returns daily series, max spike, and anomaly flag.',
    defaultParams: {
      plot_id: 'PLT-DEMO-DEVANAHALLI',
      start_date: '2026-10-01',
      end_date: '2026-10-20',
      disaster_type: 'flood'
    },
    endpoint: '/api/evidence/rainfall',
    method: 'POST'
  },
  {
    name: 'check_photo_location',
    type: 'read',
    description: 'Calculates distance in meters from plot boundary and checks 400m perimeter buffer.',
    defaultParams: {
      plot_id: 'PLT-DEMO-DEVANAHALLI',
      lat: 13.2458,
      lon: 77.7125
    },
    endpoint: '/api/evidence/calculate',
    method: 'POST'
  },
  {
    name: 'draft_claim',
    type: 'write',
    description: 'Saves claim draft and generates 30-minute confirmation token. Does not submit.',
    defaultParams: {
      plot_id: 'PLT-DEMO-DEVANAHALLI',
      crop: 'Ragi (Finger Millet)',
      disaster_type: 'flood',
      disaster_date: '2026-10-15',
      loss_percent_declared: 65.0,
      evidence: { ndvi_drop_percent: 47.1, rainfall_spike_mm: 68.5 }
    },
    endpoint: '/api/claims/draft',
    method: 'POST'
  },
  {
    name: 'submit_claim',
    type: 'write, gated',
    description: 'Security Gate: Validates confirmation token, files claim, runs 0-100 score, consumes token.',
    defaultParams: {
      draft_id: 'CLM-DEMO-DEV-001',
      token: 'TOK-INVALID-DEMO-TEST'
    },
    endpoint: '/api/claims/submit',
    method: 'POST'
  },
  {
    name: 'get_claim_status',
    type: 'read',
    description: 'Returns current adjudication status, insurer review notes, and verification score.',
    defaultParams: { claim_id: 'CLM-DEMO-DEV-001' },
    endpoint: '/api/claims/CLM-DEMO-DEV-001',
    method: 'GET'
  },
  {
    name: 'generate_report',
    type: 'write',
    description: 'Generates comprehensive ReportLab PDF dossier with QR code and returns file path.',
    defaultParams: { claim_id: 'CLM-DEMO-DEV-001' },
    endpoint: '/api/claims/CLM-DEMO-DEV-001/pdf',
    method: 'GET'
  }
];

export const MCPToolsInspector: React.FC<{ lang: Language }> = () => {
  const [selectedTool, setSelectedTool] = useState<ToolDef>(MCP_TOOLS[0]);
  const [paramsJson, setParamsJson] = useState<string>(
    JSON.stringify(MCP_TOOLS[0].defaultParams, null, 2)
  );
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const handleSelectTool = (tool: ToolDef) => {
    setSelectedTool(tool);
    setParamsJson(JSON.stringify(tool.defaultParams, null, 2));
    setExecutionResult(null);
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecutionResult(null);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(paramsJson);
      } catch (e) {
        setExecutionResult({ error: 'Invalid JSON in params input' });
        setExecuting(false);
        return;
      }

      let res;
      if (selectedTool.method === 'GET') {
        res = await fetch(selectedTool.endpoint);
      } else {
        res = await fetch(selectedTool.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedParams)
        });
      }
      const data = await res.json();
      setExecutionResult({ status: res.status, ok: res.ok, data });
    } catch (err: any) {
      setExecutionResult({ error: err.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 pb-20">
      {/* Header */}
      <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-lg border border-stone-800 space-y-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl md:text-2xl font-black">
            🛠️ FastMCP Server Tools Inspector
          </h2>
        </div>
        <p className="text-xs md:text-sm text-stone-300">
          Explore and live-execute all 8 tools exposed over <code>stdio</code> by{' '}
          <code className="text-amber-400 font-mono">mcp_server/server.py</code> using the official Python MCP SDK.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tool List */}
        <div className="lg:col-span-5 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1">
            Registered MCP Tools (8)
          </h3>
          <div className="space-y-2">
            {MCP_TOOLS.map((tool) => {
              const isSelected = selectedTool.name === tool.name;
              return (
                <button
                  key={tool.name}
                  onClick={() => handleSelectTool(tool)}
                  className={`w-full p-3.5 rounded-2xl text-left border transition-all flex items-start justify-between ${
                    isSelected
                      ? 'bg-emerald-50 border-[#2E7D32] shadow-sm'
                      : 'bg-white hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {tool.name}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          tool.type.includes('gated')
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : tool.type === 'write'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {tool.type}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {tool.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Execution Console */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-mono font-bold text-lg text-emerald-900">
                  {selectedTool.name}
                </h4>
                <span className="text-xs text-stone-500 font-mono">
                  {selectedTool.method} {selectedTool.endpoint}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                {selectedTool.description}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Arguments Payload (JSON):
              </label>
              <textarea
                value={paramsJson}
                onChange={(e) => setParamsJson(e.target.value)}
                rows={6}
                className="w-full font-mono text-xs p-3 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={handleExecute}
              disabled={executing}
              className="w-full py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black text-sm rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{executing ? 'Executing over MCP stdio...' : 'Execute Tool Call'}</span>
            </button>
          </div>

          {/* Results Box */}
          {executionResult && (
            <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 text-stone-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold">Execution Response</span>
                <span className={executionResult.ok ? 'text-emerald-400' : 'text-red-400'}>
                  HTTP {executionResult.status}
                </span>
              </div>
              <pre className="p-3 bg-black/50 rounded-xl text-xs font-mono overflow-x-auto text-emerald-300 max-h-72">
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
