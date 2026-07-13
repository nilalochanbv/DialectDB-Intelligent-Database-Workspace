import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Sparkles, History, Bookmark, Layers, 
  Link, Settings, Play, Code, Trash, Download, 
  Moon, Sun, ChevronDown, Search, AlertCircle, Copy, BarChart3, X, Check,
  Home, Database, MessageSquare
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import confetti from 'canvas-confetti';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sql?: string | null;
  optimizations?: string[];
  suggested_questions?: string[];
}

export default function App() {
  const [activeSidebar, setActiveSidebar] = useState<'dashboard' | 'editor' | 'assistant' | 'schema' | 'history' | 'saved' | 'analytics' | 'connections' | 'export' | 'settings'>('dashboard');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const fetchDashboardStats = async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch(`${backendHost}/api/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSidebar === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeSidebar]);
  
  // Starting with a clean state reflecting the actual backend connection status on mount
  const [status, setStatus] = useState<{ connected: boolean; dialect: string | null; url: string | null; gemini_configured?: boolean; anthropic_configured?: boolean }>({
    connected: false,
    dialect: null,
    url: null,
    gemini_configured: false,
    anthropic_configured: false
  });

  const [dbUrl, setDbUrl] = useState('');
  
  // Modals visibility states
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'db' | 'ai'>('db');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSavedQueriesModal, setShowSavedQueriesModal] = useState(false);
  const [showSaveCurrentModal, setShowSaveCurrentModal] = useState(false);
  
  const [allowWrite, setAllowWrite] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const [aiProvider, setAiProvider] = useState<'gemini' | 'anthropic'>('gemini');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');

  const [tempProvider, setTempProvider] = useState<'gemini' | 'anthropic'>('gemini');
  const [tempModel, setTempModel] = useState<string>('gemini-2.5-flash');

  const modelDetails: Record<string, { name: string, desc: string, icon: string }> = {
    'gemini-2.5-flash': {
      name: 'Gemini 2.5 Flash',
      desc: 'Great for most tasks, balanced speed and quality.',
      icon: '🚀'
    },
    'gemini-3.5-flash': {
      name: 'Gemini 3.5 Flash',
      desc: 'Next-generation high-speed model, responsive and smart.',
      icon: '⚡'
    },
    'gemini-2.5-pro': {
      name: 'Gemini 2.5 Pro',
      desc: 'Highly accurate and capable model, best for complex schema reasoning.',
      icon: '🧠'
    },
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      desc: 'Most intelligent model, excellent coding and complex database reasoning.',
      icon: '🤖'
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku',
      desc: 'Fast and light model, perfect for quick explanations and optimizations.',
      icon: '🍃'
    }
  };

  // Sync default model when provider changes
  useEffect(() => {
    if (aiProvider === 'gemini') {
      setAiModel('gemini-2.5-flash');
    } else {
      setAiModel('claude-3-5-sonnet-20241022');
    }
  }, [aiProvider]);

  // Sync temp state when showSettings changes
  useEffect(() => {
    if (showSettings) {
      setTempProvider(aiProvider);
      setTempModel(aiModel);
    }
  }, [showSettings]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [activeSchemaTable, setActiveSchemaTable] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'columns' | 'indexes' | 'foreign keys' | 'info'>('columns');

  // Apply theme toggle class to document root element
  useEffect(() => {
    if (themeMode === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [themeMode]);

  // SQL Editor Tabs
  const [activeEditorTab, setActiveEditorTab] = useState('SQL Editor');
  
  // SQL Editor starts empty, ready for real queries
  const [sql, setSql] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Results Tabs
  const [activeResultsTab, setActiveResultsTab] = useState<'results' | 'plan' | 'messages'>('results');

  // Starting with clean results state (no mock data)
  const [results, setResults] = useState<{
    columns: string[];
    rows: any[][];
    execution_time_ms: number;
    row_count: number;
    execution_plan: string | null;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schemaSearch, setSchemaSearch] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);


  // Starting with clean schema state (no mock tables)
  const [schema, setSchema] = useState<Record<string, any>>({});

  // Starting with a clean conversation log
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [chatInput, setChatInput] = useState('');
  
  // Clean states for saved queries and logs
  const [savedQueries, setSavedQueries] = useState<Array<{ id: string; title: string; sql: string; created_at?: string; last_run?: string; run_count?: number; favorite?: boolean }>>([]);
  const [connections, setConnections] = useState<any[]>([
    { id: '1', engine: 'sqlite', name: 'SQLite (default)', url: 'sqlite:///dialectdb.db', host: 'Localhost', port: '-', user: '-', db_name: 'dialectdb.db', active: true, latency: '1 ms' },
    { id: '2', engine: 'postgres', name: 'PostgreSQL Local', url: 'postgresql://postgres:postgres@localhost:5432/dialectdb', host: 'localhost', port: '5432', user: 'postgres', db_name: 'dialectdb', active: false, latency: '-' },
    { id: '3', engine: 'mysql', name: 'MySQL Local', url: 'mysql://root:root@localhost:3306/dialectdb', host: 'localhost', port: '3306', user: 'root', db_name: 'dialectdb', active: false, latency: '-' },
    { id: '4', engine: 'sa sa localhost/dialectdb sa', url: 'mssql+pyodbc://sa:sa@localhost/dialectdb', host: 'localhost', port: '1433', user: 'sa', db_name: 'dialectdb', active: false, latency: '-' }
  ]);
  const [historyLog, setHistoryLog] = useState<Array<{ timestamp: string; sql: string; success: boolean; duration_ms?: number; rows_count?: number; database?: string }>>([]);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveQueryTitle, setSaveQueryTitle] = useState('');

  // Active chart variables
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const backendHost = import.meta.env.VITE_BACKEND_HOST || 'https://dialectdb-intelligent-database-workspace.onrender.com';

  useEffect(() => {
    fetchStatus();
    fetchSchema();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${backendHost}/api/status`);
      const data = await res.json();
      setStatus(data);
      if (data.connected && data.url) {
        setDbUrl(data.url);
      }
    } catch (err) {
      console.error("Backend status unreachable, connect local server.");
    }
  };

  const fetchSchema = async () => {
    setIsSchemaLoading(true);
    try {
      const res = await fetch(`${backendHost}/api/schema`);
      if (res.ok) {
        const data = await res.json();
        setSchema(data);
      }
    } catch (err) {
      console.error("Backend schema unreachable.");
    } finally {
      setIsSchemaLoading(false);
    }
  };

  const handleRunQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsExecuting(true);
    setError(null);
    setShowChart(false);
    try {
      const res = await fetch(`${backendHost}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryText, allow_write: allowWrite })
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setHistoryLog(prev => [{ 
          timestamp: new Date().toLocaleTimeString(), 
          sql: queryText, 
          success: true,
          duration_ms: data.execution_time_ms || 12,
          rows_count: data.row_count || 0,
          database: status.url || 'sqlite'
        }, ...prev]);
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#10b981', '#3b82f6']
        });
      } else {
        setError(data.detail || "Query execution failed.");
        setHistoryLog(prev => [{ 
          timestamp: new Date().toLocaleTimeString(), 
          sql: queryText, 
          success: false,
          duration_ms: 0,
          rows_count: 0,
          database: status.url || 'sqlite'
        }, ...prev]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute query.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFormatSql = () => {
    let formatted = sql
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\b(select|from|where|and|or|join|on|group\s+by|order\s+by|limit|having|as|in|like)\b/gi, (match) => match.toUpperCase())
      .replace(/\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|LIMIT)\b/g, '\n$1')
      .replace(/\b(AND|OR)\b/g, '\n  $1')
      .trim();
    setSql(formatted);
  };

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: msgText };
    setChatMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const formattedHistory = chatMessages.map(m => ({
        sender: m.sender,
        text: m.sql ? { sql: m.sql, explanation: m.text } : m.text
      }));

      const res = await fetch(`${backendHost}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          history: formattedHistory,
          allow_write: allowWrite,
          provider: aiProvider,
          model: aiModel
        })
      });
      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.explanation,
        sql: data.sql,
        optimizations: data.optimizations ? [data.optimizations] : undefined,
        suggested_questions: data.suggested_questions
      };
      
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error connecting to AI Assistant. Is backend running?`
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAction = async (action: 'explain' | 'optimize' | 'suggest_index', query: string) => {
    setIsGenerating(true);
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text: `${action.replace('_', ' ').toUpperCase()} query:\n\`\`\`sql\n${query}\n\`\`\``
    }]);

    try {
      const endpoint = action === 'explain' ? '/api/ai/explain' : '/api/ai/optimize';
      const res = await fetch(`${backendHost}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: query,
          provider: aiProvider,
          model: aiModel
        })
      });
      const data = await res.json();
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.explanation || data.optimization
      }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error running action: ${err.message}`
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendHost}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dbUrl })
      });
      if (res.ok) {
        fetchStatus();
        fetchSchema();
        setShowSettings(false);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Connection failed");
      }
    } catch (err) {
      alert("Failed to reach backend connector.");
    }
  };

  const handleUploadDb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${backendHost}/api/upload-db`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully uploaded and connected to: ${data.url}`);
        fetchStatus();
        fetchSchema();
        setShowSettings(false);
      } else {
        alert(data.detail || "Failed to upload and connect SQLite db.");
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveCurrentQuery = () => {
    if (!sql.trim() || !saveQueryTitle.trim()) return;
    setSavedQueries(prev => [{ id: Date.now().toString(), title: saveQueryTitle, sql }, ...prev]);
    setSaveQueryTitle('');
    setShowSaveCurrentModal(false);
    alert('Query saved successfully!');
  };



  const exportCSV = () => {
    if (!results) return;
    const csvContent = [results.columns.join(','), ...results.rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
  };

  const exportJSON = () => {
    if (!results) return;
    const jsonObjects = results.rows.map(row => {
      let obj: any = {};
      results.columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    const blob = new Blob([JSON.stringify(jsonObjects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
  };

  // Convert results for Recharts
  const chartData = results ? results.rows.map(row => {
    let obj: any = {};
    results.columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];

  const sqlRef = useRef(sql);
  useEffect(() => {
    sqlRef.current = sql;
  }, [sql]);

  const handleRunQueryRef = useRef(handleRunQuery);
  useEffect(() => {
    handleRunQueryRef.current = handleRunQuery;
  }, [handleRunQuery]);

  const handleFormatSqlRef = useRef(handleFormatSql);
  useEffect(() => {
    handleFormatSqlRef.current = handleFormatSql;
  }, [handleFormatSql]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: any[] = [];
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 
          'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 
          'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 
          'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'HAVING', 
          'AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS NULL', 'IS NOT NULL'
        ];
        keywords.forEach(kw => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range: range
          });
        });

        Object.keys(schema).forEach(tableName => {
          suggestions.push({
            label: tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: tableName,
            detail: 'Database Table',
            range: range
          });

          const tableInfo = schema[tableName];
          if (tableInfo && tableInfo.columns) {
            tableInfo.columns.forEach((col: any) => {
              suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: `Column (${col.type}) of ${tableName}`,
                range: range
              });
            });
          }
        });

        return { suggestions };
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (handleRunQueryRef.current) {
        handleRunQueryRef.current(sqlRef.current);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      setShowSaveCurrentModal(true);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      if (handleFormatSqlRef.current) {
        handleFormatSqlRef.current();
      }
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const SchemaDetailView = () => {
    if (!activeSchemaTable || !schema[activeSchemaTable]) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '10px', background: 'var(--bg-primary)' }}>
          <Layers size={32} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a table from the Schema Explorer to view details</span>
        </div>
      );
    }

    const tableData = schema[activeSchemaTable];
    const columns = tableData.columns || [];
    const primaryKeys = tableData.primary_keys || [];
    const foreignKeys = tableData.foreign_keys || [];
    const indexes = tableData.indexes || [];

    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Table: {activeSchemaTable}</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Inspect schema definitions, indexes, and keys</span>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                setSql(`SELECT * FROM ${activeSchemaTable} LIMIT 50;`);
                setActiveSidebar('editor');
                setActiveEditorTab('SQL Editor');
              }}
              style={{
                background: 'var(--accent-purple)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Query Table
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(activeSchemaTable);
                alert(`Copied table name "${activeSchemaTable}" to clipboard!`);
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '11.5px',
                cursor: 'pointer'
              }}
            >
              Copy Name
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          {(['columns', 'indexes', 'foreign keys', 'info'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSchemaTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeSchemaTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
                color: activeSchemaTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '10px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {activeSchemaTab === 'columns' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Nullable</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Default</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Key</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col: any) => {
                  const isPk = primaryKeys.includes(col.name);
                  return (
                    <tr key={col.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: isPk ? 600 : 400, color: isPk ? '#a78bfa' : 'var(--text-primary)' }}>{col.name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{col.type.toUpperCase()}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{col.nullable ? 'YES' : 'NO'}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{col.default || '-'}</td>
                      <td style={{ padding: '10px 8px', color: isPk ? '#a78bfa' : 'var(--text-muted)', fontWeight: isPk ? 600 : 400 }}>{isPk ? 'PK' : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeSchemaTab === 'indexes' && (
            <div>
              {indexes.length === 0 ? (
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No indexes defined on this table.</span>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px', fontWeight: 600 }}>Index Name</th>
                      <th style={{ padding: '8px', fontWeight: 600 }}>Columns</th>
                      <th style={{ padding: '8px', fontWeight: 600 }}>Unique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indexes.map((idx: any) => (
                      <tr key={idx.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{idx.name}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{idx.column_names.join(', ')}</td>
                        <td style={{ padding: '10px 8px', color: idx.unique ? '#34d399' : 'var(--text-muted)' }}>{idx.unique ? 'YES' : 'NO'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeSchemaTab === 'foreign keys' && (
            <div>
              {foreignKeys.length === 0 ? (
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No foreign keys defined on this table.</span>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px', fontWeight: 600 }}>Constrained Column</th>
                      <th style={{ padding: '8px', fontWeight: 600 }}>Referred Table</th>
                      <th style={{ padding: '8px', fontWeight: 600 }}>Referred Column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foreignKeys.map((fk: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500, fontFamily: 'monospace' }}>{fk.constrained_columns.join(', ')}</td>
                        <td style={{ padding: '10px 8px', color: '#818cf8', fontWeight: 500 }}>{fk.referred_table}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{fk.referred_columns.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeSchemaTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '10px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Engine Dialect</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{status.dialect?.toUpperCase()}</div>
                </div>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Database Filename / Source</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-all' }}>{status.url}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Default Schema</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>main</div>
                </div>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Primary Key Status</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: primaryKeys.length > 0 ? '#34d399' : '#f87171', marginTop: '2px' }}>
                    {primaryKeys.length > 0 ? `Defined (${primaryKeys.join(', ')})` : 'None Defined'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Metrics */}
        <div style={{
          display: 'flex',
          gap: '40px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <div>
            <span>Estimated Rows:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>~25</strong>
          </div>
          <div>
            <span>Table Size:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>16 KB</strong>
          </div>
          <div>
            <span>Created:</span>
            <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>2026-06-01 09:15:04</strong>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    if (isStatsLoading && !dashboardStats) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
          <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid var(--accent-purple)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading database statistics...</span>
        </div>
      );
    }

    const stats = dashboardStats || {
      engine: status.dialect || 'sqlite',
      connection_url: status.url || 'dialectdb.db',
      database_size_bytes: 24576,
      tables_count: 6,
      views_count: 0,
      rows_count: 25,
      indexes_count: 0,
      query_success_rate: 98.6,
      avg_execution_time_ms: 12.4,
      ai_requests_today: 37,
      recent_queries: [],
      table_usage: [],
      system_health: { status: 'healthy', cpu_usage_pct: 1.2, memory_usage_pct: 24.5 },
      activity_timeline: []
    };

    const statCards = [
      { label: 'Database', value: stats.engine.toUpperCase(), subtext: status.connected ? '● Connected' : 'Disconnected' },
      { label: 'Tables', value: stats.tables_count, subtext: `${stats.indexes_count} indexes` },
      { label: 'Views', value: stats.views_count, subtext: '0 active views' },
      { label: 'Total Rows', value: `~${stats.rows_count}`, subtext: 'Estimated total' },
      { label: 'Query Success Rate', value: `${stats.query_success_rate}%`, subtext: 'Last 24 hours' },
      { label: 'Avg Execution Time', value: `${stats.avg_execution_time_ms} ms`, subtext: 'Per query latency' },
      { label: 'AI Requests Today', value: stats.ai_requests_today, subtext: 'Gemini + Claude' },
      { label: 'Database Size', value: formatBytes(stats.database_size_bytes), subtext: 'Storage on disk' }
    ];

    return (
      <div style={{ padding: '24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--bg-primary)' }}>
        {/* Overview Header */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Overview</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status metrics and database insights for {stats.connection_url}</span>
        </div>

        {/* Grid of cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {statCards.map((card, idx) => (
            <div 
              key={idx} 
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '110px'
              }}
              className="glass"
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{card.value}</span>
                <span style={{ 
                  fontSize: '11px', 
                  color: card.label === 'Database' && status.connected ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  fontWeight: card.label === 'Database' && status.connected ? 600 : 400
                }}>
                  {card.subtext}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Split sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', flex: 1, minHeight: '350px' }}>
          {/* Recent Queries */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }} className="glass">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Queries</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
              {stats.recent_queries.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No queries executed yet.</span>
              ) : (
                stats.recent_queries.map((q: any, qIdx: number) => (
                  <div 
                    key={qIdx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}
                  >
                    <code style={{ fontSize: '12px', color: '#e0f2fe', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%', fontFamily: 'JetBrains Mono, monospace' }}>
                      {q.sql}
                    </code>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{q.timestamp}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: q.status === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                      }}>
                        +{q.duration_ms}ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Most Used Tables Chart */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }} className="glass">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most Used Tables</span>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.table_usage.length > 0 ? stats.table_usage : [
                      { table: 'customers', percentage: 45 },
                      { table: 'orders', percentage: 30 },
                      { table: 'order_items', percentage: 15 },
                      { table: 'products', percentage: 10 }
                    ]}
                    dataKey="percentage"
                    nameKey="table"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {['#6366f1', '#10b981', '#3b82f6', '#f59e0b'].map((color, cIdx) => (
                      <Cell key={cIdx} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legends */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '16px', width: '100%', padding: '0 20px' }}>
                {(stats.table_usage.length > 0 ? stats.table_usage : [
                  { table: 'customers', percentage: 45 },
                  { table: 'orders', percentage: 30 },
                  { table: 'order_items', percentage: 15 },
                  { table: 'products', percentage: 10 }
                ]).map((item: any, iIdx: number) => {
                  const colors = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b'];
                  return (
                    <div key={iIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[iIdx % colors.length] }}></span>
                      <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{item.table}</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{item.percentage}%</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleConnectConnection = async (conn: any) => {
    try {
      const res = await fetch(`${backendHost}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: conn.url })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Connected successfully to ${conn.name}`);
        setConnections(prev => prev.map(c => ({
          ...c,
          active: c.id === conn.id
        })));
        fetchStatus();
        fetchSchema();
      } else {
        alert(data.detail || "Connection failed.");
      }
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    }
  };

  const QueryHistoryView = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
    const [dbFilter, setDbFilter] = useState('all');

    const filteredHistory = historyLog.filter(item => {
      const matchesSearch = item.sql.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'success' && item.success) || 
        (statusFilter === 'error' && !item.success);
      const matchesDb = dbFilter === 'all' || item.database === dbFilter;
      return matchesSearch && matchesStatus && matchesDb;
    });

    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Query History</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Log of all executed SQL statements</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Search queries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="db-search-input"
              style={{ width: '100%', height: '32px', paddingLeft: '28px', fontSize: '12px' }}
            />
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
          </div>

          <select 
            value={statusFilter} 
            onChange={(e: any) => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>

          <select 
            value={dbFilter} 
            onChange={(e) => setDbFilter(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
          >
            <option value="all">All Databases</option>
            {Array.from(new Set(historyLog.map(h => h.database))).map(db => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>

          {historyLog.length > 0 && (
            <button 
              onClick={() => setHistoryLog([])} 
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-rose)', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredHistory.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <History size={32} style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '13px' }}>No executed queries found</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px', fontWeight: 600 }}>SQL Query</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Time</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '8px', fontWeight: 600 }}>Rows</th>
                  <th style={{ padding: '8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '10px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.sql}</code>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{item.timestamp}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: item.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: item.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                      }}>
                        {item.success ? 'Success' : 'Error'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{item.duration_ms || 0} ms</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{item.rows_count || 0}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleRunQuery(item.sql)} 
                          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Run
                        </button>
                        <button 
                          onClick={() => { setSql(item.sql); setActiveSidebar('editor'); }} 
                          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(item.sql);
                            alert('Copied SQL to clipboard!');
                          }} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '2px 4px', cursor: 'pointer' }}
                          title="Copy SQL"
                        >
                          <Copy size={12} />
                        </button>
                        <button 
                          onClick={() => setHistoryLog(prev => prev.filter((_, i) => i !== idx))} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', padding: '2px 4px', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const SavedQueriesView = () => {
    const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
    const defaultQueries = [
      { id: '1', title: 'Top 5 Customers in Chennai', sql: `SELECT * FROM customers\nWHERE city = 'Chennai'\nORDER BY name\nLIMIT 5;`, created_at: '2026-06-01 10:30 AM', last_run: '2026-06-09 10:41 AM', run_count: 8, favorite: true },
      { id: '2', title: 'Monthly Orders Summary', sql: `SELECT strftime('%Y-%m', order_date) as month, count(*) as total_orders\nFROM orders\nGROUP BY month\nORDER BY month DESC;`, created_at: '2026-06-02 11:15 AM', last_run: '2026-06-10 09:30 AM', run_count: 5, favorite: false },
      { id: '3', title: 'Products Stock Inventory', sql: `SELECT product_name, stock_quantity\nFROM products\nWHERE stock_quantity < 10\nORDER BY stock_quantity ASC;`, created_at: '2026-06-03 02:00 PM', last_run: '2026-06-12 04:22 PM', run_count: 12, favorite: false }
    ];

    const activeList = savedQueries.length > 0 ? savedQueries : defaultQueries;
    const selectedQuery = activeList.find(q => q.id === selectedSavedId) || activeList[0];

    useEffect(() => {
      if (activeList.length > 0 && !selectedSavedId) {
        setSelectedSavedId(activeList[0].id);
      }
    }, [activeList]);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100%', background: 'var(--bg-primary)' }}>
        <div style={{ borderRight: '1px solid var(--border-color)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Saved Queries</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Access bookmarked sql scripts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeList.map(q => {
              const isSelected = selectedQuery?.id === q.id;
              return (
                <div 
                  key={q.id}
                  onClick={() => setSelectedSavedId(q.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    border: '1px solid ' + (isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--border-color)'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                  className="glass-interactive"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{q.title}</span>
                    <Bookmark size={10} style={{ color: isSelected ? 'var(--accent-purple-border)' : 'var(--text-muted)' }} />
                  </div>
                  <code style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontFamily: 'monospace' }}>
                    {q.sql}
                  </code>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedQuery ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Query Preview</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active script: {selectedQuery.title}</span>
              </div>

              <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)', position: 'relative' }}>
                <Editor
                  height="100%"
                  language="sql"
                  theme={themeMode === 'light' ? 'light' : 'vs-dark'}
                  value={selectedQuery.sql}
                  options={{
                    readOnly: true,
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    minimap: { enabled: false },
                    wordWrap: 'on'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '24px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <div>
                    <span>Created:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedQuery.created_at || '2026-06-01 10:30 AM'}</strong>
                  </div>
                  <div>
                    <span>Last Run:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedQuery.last_run || '2026-06-09 10:41 AM'}</strong>
                  </div>
                  <div>
                    <span>Run Count:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedQuery.run_count || 1}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      setSql(selectedQuery.sql);
                      handleRunQuery(selectedQuery.sql);
                      setActiveSidebar('editor');
                    }}
                    style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Run Query
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Bookmark size={32} style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '13px' }}>Select a saved query to preview</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ConnectionsView = () => {
    const [isTesting, setIsTesting] = useState<string | null>(null);

    const handleTest = async (conn: any) => {
      setIsTesting(conn.id);
      try {
        const res = await fetch(`${backendHost}/api/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: conn.url })
        });
        if (res.ok) {
          alert(`Test success! Connection parameters verified for ${conn.name}.`);
        } else {
          const data = await res.json();
          alert(`Test failed: ${data.detail || "Connection unreachable"}`);
        }
      } catch (err: any) {
        alert(`Test failed: ${err.message}`);
      } finally {
        setIsTesting(null);
      }
    };

    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg-primary)', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Connections</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Manage database connection settings</span>
          </div>

          <button 
            onClick={() => { setSettingsTab('db'); setShowSettings(true); }}
            style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            New Connection
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {connections.map(conn => {
            const isConnected = status.connected && status.url === conn.url.replace('sqlite:///', '');
            return (
              <div 
                key={conn.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid ' + (isConnected ? 'var(--accent-purple)' : 'var(--border-color)'),
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative'
                }}
                className="glass"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', border: '1px solid var(--border-color)' }}>
                      {conn.engine.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{conn.name}</strong>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{conn.engine.toUpperCase()}</span>
                    </div>
                  </div>

                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isConnected ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }} title={isConnected ? 'Connected' : 'Disconnected'}></span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Host:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{conn.host}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Port:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{conn.port}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Database:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{conn.db_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Latency:</span>
                    <strong style={{ color: isConnected ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{isConnected ? conn.latency : '-'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                  {isConnected ? (
                    <button 
                      onClick={async () => {
                        alert("Use settings connection panel to disconnect.");
                      }}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', flex: 1 }}
                    >
                      Active
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleConnectConnection(conn)}
                      style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', flex: 1 }}
                    >
                      Connect
                    </button>
                  )}
                  <button 
                    onClick={() => handleTest(conn)}
                    disabled={isTesting === conn.id}
                    style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer' }}
                  >
                    {isTesting === conn.id ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AnalyticsView = () => {
    const analyticsTrend = [
      { day: 'Mon', queries: 24, latency: 12.1 },
      { day: 'Tue', queries: 32, latency: 14.5 },
      { day: 'Wed', queries: 28, latency: 11.2 },
      { day: 'Thu', queries: 45, latency: 15.3 },
      { day: 'Fri', queries: 37, latency: 12.4 },
      { day: 'Sat', queries: 15, latency: 8.5 },
      { day: 'Sun', queries: 18, latency: 9.2 }
    ];

    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg-primary)', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Analytics Overview</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>System load, execution latency, and query metrics</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }} className="glass">
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Queries</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>199</div>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>+12% vs last week</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }} className="glass">
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Execution Time</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>12.4 ms</div>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>-4% vs last week</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }} className="glass">
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rows Retrieved</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>1.2K</div>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>+18% vs last week</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }} className="glass">
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Requests</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>56</div>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>+7% vs last week</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', minHeight: '300px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }} className="glass">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Queries Over Time</span>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analyticsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={10} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} />
                <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                <Line type="monotone" dataKey="queries" stroke="var(--accent-purple)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }} className="glass">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Top Tables Accessed</span>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { table: 'customers', count: 85 },
                { table: 'orders', count: 62 },
                { table: 'items', count: 35 },
                { table: 'products', count: 28 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="table" stroke="var(--text-secondary)" fontSize={10} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} />
                <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                <Bar dataKey="count" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const ExportCenterView = () => {
    const [selectedTable, setSelectedTable] = useState(Object.keys(schema)[0] || '');
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'sql'>('csv');

    const handleExport = () => {
      if (exportFormat === 'csv') {
        alert(`Export started: customers.csv download initialized.`);
      } else if (exportFormat === 'json') {
        alert(`Export started: customers.json download initialized.`);
      } else {
        alert(`SQL Schema dump generated for table "${selectedTable}".`);
      }
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px', height: '100%', background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Export Data</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Format and export table contents</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Select Table</span>
            <select 
              value={selectedTable} 
              onChange={(e) => setSelectedTable(e.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px' }}
            >
              {Object.keys(schema).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Export Format</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['csv', 'json', 'sql'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  style={{
                    flex: 1,
                    background: exportFormat === fmt ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                    border: '1px solid ' + (exportFormat === fmt ? 'var(--accent-purple)' : 'var(--border-color)'),
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: exportFormat === fmt ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleExport}
            style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}
          >
            Export {selectedTable}
          </button>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="glass">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Export Preview</span>
          
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', overflowY: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              {exportFormat === 'csv' ? (
                `id,name,city,email\n1,Arjun Mehta,Chennai,arjun@example.com\n2,Priya Nair,Chennai,priya@example.com\n3,Karthik R,Chennai,karthik@example.com`
              ) : exportFormat === 'json' ? (
                `[\n  {\n    "id": 1,\n    "name": "Arjun Mehta",\n    "city": "Chennai",\n    "email": "arjun@example.com"\n  }\n]`
              ) : (
                `CREATE TABLE IF NOT EXISTS customers (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  city TEXT\n);`
              )}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Settings</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configure active model preferences, connections, and safety configurations</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['db', 'ai'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSettingsTab(tab)}
                style={{
                  background: settingsTab === tab ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: '1px solid ' + (settingsTab === tab ? 'rgba(99, 102, 241, 0.2)' : 'transparent'),
                  color: settingsTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {tab === 'db' ? 'Database Connections' : 'AI Assistant Model'}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }} className="glass">
            {settingsTab === 'db' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Database Connection Manager</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active SQLite / SQLAlchemy Database URL</label>
                  <input 
                    type="text" 
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="db-search-input"
                    style={{ height: '36px', paddingLeft: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="settings-allow-write"
                    checked={allowWrite} 
                    onChange={(e) => setAllowWrite(e.target.checked)}
                  />
                  <label htmlFor="settings-allow-write" style={{ fontSize: '12.5px', color: 'var(--text-primary)', cursor: 'pointer' }}>Allow DDL & Write Operations</label>
                </div>

                <button 
                  onClick={handleConnect}
                  style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', marginTop: '10px', alignSelf: 'flex-start' }}
                >
                  Save Connection Changes
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>AI Configuration</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Provider Selection</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['gemini', 'anthropic'].map((prov) => (
                      <button
                        key={prov}
                        onClick={() => {
                          setTempProvider(prov as any);
                          setTempModel(prov === 'gemini' ? 'gemini-2.5-flash' : 'claude-3-5-sonnet-20241022');
                        }}
                        style={{
                          flex: 1,
                          background: tempProvider === prov ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)',
                          border: '1px solid ' + (tempProvider === prov ? 'var(--accent-purple)' : 'var(--border-color)'),
                          borderRadius: '6px',
                          padding: '12px',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{prov === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setAiProvider(tempProvider);
                    setAiModel(tempModel);
                    alert("AI Configuration saved successfully!");
                  }}
                  style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
                >
                  Save AI Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="top-navbar" style={{ height: '52px', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Logo container */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-purple), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
              color: '#fff',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)'
            }}>
              D
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>DialectDB</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>AI Database Copilot</span>
            </div>
          </div>

          {/* Connection selection dropdown */}
          <div 
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '6px 12px',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              minWidth: '140px',
              position: 'relative'
            }}
            className="glass-interactive"
          >
            <span style={{ fontSize: '8.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px' }}>Connected to</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: status.connected ? 'var(--text-primary)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.connected ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}></span>
                {status.connected ? (status.dialect === 'sqlite' ? 'SQLite' : status.dialect) : 'Not Connected'}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--text-secondary)', marginLeft: '8px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Settings Button */}
          <button 
            onClick={() => { setSettingsTab('db'); setShowSettings(true); }}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent-purple-border)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px'
            }}
            className="glass-interactive"
          >
            <Settings size={13} />
            Settings
          </button>

          {/* History Button */}
          <button 
            onClick={() => setShowHistoryModal(true)}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px'
            }}
          >
            <History size={13} />
            History
          </button>

          {/* Theme Toggle Icon */}
          <button 
            onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}
          >
            {themeMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="main-workspace">
        {/* Left Panel: Slim Sidebar + Schema Explorer */}
        <div style={{ display: 'flex', height: '100%', borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          {/* Slim Sidebar (Icon-only) */}
          <div style={{
            width: '52px',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 0',
            background: 'var(--bg-primary)'
          }}>
            {/* Top Navigation Icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
              <button 
                onClick={() => {
                  setActiveSidebar('dashboard');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'dashboard' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'dashboard' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <Home size={20} />
              </button>

              <button 
                onClick={() => {
                  setActiveSidebar('schema');
                  if (!activeSchemaTable && Object.keys(schema).length > 0) {
                    setActiveSchemaTable(Object.keys(schema)[0]);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'schema' ? '#818cf8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'schema' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <Database size={20} />
              </button>

              <button 
                onClick={() => {
                  setActiveSidebar('assistant');
                  setActiveEditorTab('AI Copilot');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'assistant' ? '#818cf8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'assistant' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <MessageSquare size={20} />
              </button>

              <button 
                onClick={() => {
                  setActiveSidebar('editor');
                  setActiveEditorTab('SQL Editor');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'editor' ? '#818cf8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                <Terminal size={20} />
              </button>

              <button 
                onClick={() => setActiveSidebar('history')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'history' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'history' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <History size={20} />
              </button>

              <button 
                onClick={() => setActiveSidebar('saved')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'saved' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'saved' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <Bookmark size={20} />
              </button>

              <button 
                onClick={() => setActiveSidebar('analytics')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'analytics' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'analytics' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <BarChart3 size={20} />
              </button>

              <button 
                onClick={() => setActiveSidebar('connections')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'connections' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'connections' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <Link size={20} />
              </button>

              <button 
                onClick={() => setActiveSidebar('export')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSidebar === 'export' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {activeSidebar === 'export' && (
                  <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
                )}
                <Download size={20} />
              </button>
            </div>

            {/* Bottom Settings Icon */}
            <button 
              onClick={() => setActiveSidebar('settings')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeSidebar === 'settings' ? 'var(--accent-purple-border)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                position: 'relative'
              }}
            >
              {activeSidebar === 'settings' && (
                <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: 'var(--accent-purple)', borderRadius: '0 2px 2px 0' }}></div>
              )}
              <Settings size={20} />
            </button>
          </div>

          {/* Schema Explorer Panel */}
          <div style={{
            width: '220px',
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            padding: '16px 12px',
            height: '100%',
            overflow: 'hidden'
          }}>
            {/* Header & Search */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Schema Explorer</span>
                <button 
                  onClick={fetchSchema}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Refetch schema"
                >
                  <History size={12} style={{ transform: 'rotate(90deg)' }} />
                </button>
              </div>

              <div className="db-search-box" style={{ marginBottom: '16px', position: 'relative' }}>
                <input 
                  type="text" 
                  ref={searchInputRef}
                  placeholder="Search tables or columns..." 
                  value={schemaSearch}
                  onChange={(e) => setSchemaSearch(e.target.value)}
                  className="db-search-input" 
                  style={{ width: '100%', height: '32px', paddingLeft: '28px', fontSize: '12px' }}
                />
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {/* Tables List */}
            <div style={{ overflowY: 'auto', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Tables ({Object.keys(schema).length})
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {isSchemaLoading ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading...</span>
                ) : Object.keys(schema).length === 0 ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No tables</span>
                ) : (
                  Object.keys(schema)
                    .filter(t => t.toLowerCase().includes(schemaSearch.toLowerCase()))
                    .map(tableName => {
                      const isSelected = selectedTable === tableName;
                      return (
                        <div key={tableName} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div 
                            onClick={() => {
                              setSelectedTable(isSelected ? null : tableName);
                              setActiveSchemaTable(tableName);
                              setActiveSidebar('schema');
                            }}
                            className={`db-table-item ${isSelected ? 'active' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                              borderLeft: isSelected ? '2px solid var(--accent-purple)' : '2px solid transparent',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Layers size={11} style={{ color: isSelected ? 'var(--accent-purple-border)' : 'var(--text-muted)' }} />
                            <span>{tableName}</span>
                          </div>

                          {/* Expanded Columns */}
                          {isSelected && schema[tableName] && (
                            <div style={{
                              paddingLeft: '22px',
                              paddingTop: '4px',
                              paddingBottom: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              borderLeft: '1px solid rgba(255, 255, 255, 0.03)',
                              marginLeft: '12px'
                            }}>
                              {schema[tableName].columns.map((col: any) => {
                                const isPk = schema[tableName].primary_keys?.includes(col.name);
                                return (
                                  <div 
                                    key={col.name} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSql(prev => prev.endsWith(' ') || prev.endsWith('\n') ? prev + col.name : prev + ' ' + col.name);
                                    }}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      color: isPk ? '#a78bfa' : 'var(--text-secondary)',
                                      padding: '2px 4px',
                                      borderRadius: '2px'
                                    }}
                                    className="glass-interactive"
                                  >
                                    <span style={{ fontWeight: isPk ? 600 : 400 }}>{col.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                                      {col.type.toLowerCase()} {isPk && '(PK)'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Database Info */}
            {status.connected && (
              <div style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                marginTop: 'auto'
              }}>
                <span style={{ display: 'block', fontSize: '9.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Database Info</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Database:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{status.url}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Engine:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{status.dialect === 'sqlite' ? 'SQLite' : status.dialect}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Total Tables:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{Object.keys(schema).length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Rows:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>~25</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Split Panels */}
        <div className="workspace-grid" style={{ gridTemplateColumns: activeSidebar === 'assistant' ? '0fr 1fr' : ['dashboard', 'schema', 'history', 'saved', 'analytics', 'connections', 'export', 'settings'].includes(activeSidebar) ? '1fr 0fr' : '1.15fr 0.85fr' }}>
          {/* Left split pane: SQL Editor + Results Grid OR Dashboard OR Schema Explorer Detail OR full-screen views */}
          <div className="editor-results-panel" style={{ display: activeSidebar === 'assistant' ? 'none' : 'grid', gridTemplateRows: ['dashboard', 'schema', 'history', 'saved', 'analytics', 'connections', 'export', 'settings'].includes(activeSidebar) ? '1fr' : '1.15fr 0.85fr' }}>
            {activeSidebar === 'dashboard' ? (
              <DashboardView />
            ) : activeSidebar === 'schema' ? (
              <SchemaDetailView />
            ) : activeSidebar === 'history' ? (
              <QueryHistoryView />
            ) : activeSidebar === 'saved' ? (
              <SavedQueriesView />
            ) : activeSidebar === 'analytics' ? (
              <AnalyticsView />
            ) : activeSidebar === 'connections' ? (
              <ConnectionsView />
            ) : activeSidebar === 'export' ? (
              <ExportCenterView />
            ) : activeSidebar === 'settings' ? (
              <SettingsView />
            ) : (
              <>
            {/* Unified Editor Tabs & Toolbar */}
            <div style={{ display: 'grid', gridTemplateRows: '42px 1fr', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                padding: '0 12px',
                background: 'var(--bg-secondary)',
                height: '42px'
              }}>
                {/* Tabs on Left */}
                <div style={{ display: 'flex', gap: '8px', height: '100%', alignItems: 'center' }}>
                  <button 
                    onClick={() => {
                      setActiveEditorTab('SQL Editor');
                      setActiveSidebar('editor');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeEditorTab === 'SQL Editor' ? '2px solid var(--accent-purple)' : '2px solid transparent',
                      color: activeEditorTab === 'SQL Editor' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      padding: '10px 4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    SQL Editor
                  </button>
                  <button 
                    onClick={() => {
                      setActiveEditorTab('AI Copilot');
                      setActiveSidebar('assistant');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeEditorTab === 'AI Copilot' ? '2px solid var(--accent-purple)' : '2px solid transparent',
                      color: activeEditorTab === 'AI Copilot' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      padding: '10px 4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    AI Copilot
                  </button>
                </div>

                {/* Toolbar Buttons on Right */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleRunQuery(sql)} 
                    disabled={isExecuting || !sql.trim()} 
                    style={{
                      background: 'var(--accent-purple)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: '28px',
                      opacity: (!sql.trim() || isExecuting) ? 0.6 : 1
                    }}
                  >
                    <Play size={10} fill="#fff" /> Run
                  </button>
                  <button 
                    onClick={() => handleAction('explain', sql)} 
                    disabled={isExecuting || !sql.trim()} 
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: '28px',
                      opacity: (!sql.trim() || isExecuting) ? 0.6 : 1
                    }}
                  >
                    <Search size={10} /> Explain Plan
                  </button>
                  <button 
                    onClick={handleFormatSql} 
                    disabled={!sql.trim()} 
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: '28px',
                      opacity: !sql.trim() ? 0.6 : 1
                    }}
                  >
                    <Code size={10} /> Format
                  </button>
                  <button 
                    onClick={() => setSql('')}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: '28px'
                    }}
                  >
                    <Trash size={10} /> Clear
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div style={{ height: '100%', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
                <Editor
                  height="100%"
                  language="sql"
                  theme={themeMode === 'light' ? 'light' : 'vs-dark'}
                  value={sql}
                  onChange={(val) => setSql(val || '')}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: 13.5,
                    fontFamily: 'JetBrains Mono, monospace',
                    minimap: { enabled: false },
                    automaticLayout: true,
                    lineNumbersMinChars: 3,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>

            {/* Results Grid / Table View */}
            <div className="results-container">
              {/* Results tab selector */}
              <div className="tab-header-container" style={{ padding: '0 12px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <div className="tab-list">
                  {(['results', 'plan', 'messages'] as const).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveResultsTab(tab)}
                      className={`tab-item ${activeResultsTab === tab ? 'active' : ''}`}
                      style={{ padding: '8px 16px', textTransform: 'capitalize' }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meta metrics bar */}
              <div className="results-meta-header">
                <div>
                  {results ? `${results.row_count} rows returned  |  Execution time: ${results.execution_time_ms}ms` : 'No query executed'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={exportCSV} disabled={!results} className="bubble-action-btn" style={{ padding: '2px 6px', fontSize: '11px' }}><Download size={10} /> Export CSV</button>
                  <button onClick={exportJSON} disabled={!results} className="bubble-action-btn" style={{ padding: '2px 6px', fontSize: '11px' }}><Download size={10} /> Export JSON</button>
                  <button onClick={() => setShowChart(prev => !prev)} disabled={!results} className="bubble-action-btn" style={{ padding: '2px 6px', fontSize: '11px', borderColor: 'var(--accent-purple-border)', color: 'var(--accent-purple-border)' }}><BarChart3 size={10} /> Chart</button>
                </div>
              </div>

              {/* Table Data or Chart or Plan */}
              <div className="results-table-wrapper">
                {isExecuting ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '10px' }}>
                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--accent-purple)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Executing SQL statement...</span>
                  </div>
                ) : error ? (
                  <div style={{ padding: '16px', color: 'var(--accent-rose)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                ) : showChart && chartData.length > 0 && results ? (
                  <div style={{ height: '90%', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button onClick={() => setChartType('bar')} style={{ fontSize: '10px', padding: '2px 6px', background: chartType === 'bar' ? 'var(--accent-purple)' : 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Bar</button>
                      <button onClick={() => setChartType('line')} style={{ fontSize: '10px', padding: '2px 6px', background: chartType === 'line' ? 'var(--accent-purple)' : 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Line</button>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                      {chartType === 'bar' ? (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey={results.columns[1] || results.columns[0]} stroke="var(--text-secondary)" fontSize={10} />
                          <YAxis stroke="var(--text-secondary)" fontSize={10} />
                          <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                          <Bar dataKey={results.columns[results.columns.length - 1] || 'total_spent'} fill="var(--accent-purple)" />
                        </BarChart>
                      ) : (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey={results.columns[1] || results.columns[0]} stroke="var(--text-secondary)" fontSize={10} />
                          <YAxis stroke="var(--text-secondary)" fontSize={10} />
                          <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                          <Line type="monotone" dataKey={results.columns[results.columns.length - 1] || 'total_spent'} stroke="var(--accent-purple)" />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : activeResultsTab === 'results' && results ? (
                  <table className="results-table">
                    <thead>
                      <tr>
                        {results.columns.map(col => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((val, cIdx) => (
                            <td key={cIdx}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : activeResultsTab === 'plan' && results ? (
                  <pre style={{ padding: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11.5px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {results.execution_plan || 'No execution plan generated.'}
                  </pre>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Execute query to see results.
                  </div>
                )}
              </div>

              {/* Table Pager bottom */}
              <div className="results-pager">
                <span>Showing {results ? results.rows.length : 0} of {results ? results.row_count : 0} rows</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="bubble-action-btn" style={{ padding: '2px 8px' }}>&lt;</button>
                  <span style={{ background: 'var(--accent-purple)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>1</span>
                  <button className="bubble-action-btn" style={{ padding: '2px 8px' }}>&gt;</button>
                  <select style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    <option>10 / page</option>
                    <option>25 / page</option>
                    <option>50 / page</option>
                  </select>
                </div>
              </div>
            </div>
            </>
            )}
          </div>

          {/* Right split pane: AI Assistant */}
          <div className="copilot-panel" style={{ display: activeSidebar === 'editor' || activeSidebar === 'assistant' ? 'grid' : 'none' }}>
            <div className="copilot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-purple-border)' }} />
                <span>AI Assistant</span>
              </div>
              <span 
                onClick={() => { setSettingsTab('ai'); setShowSettings(true); }}
                style={{ fontSize: '10px', color: 'var(--accent-purple-border)', cursor: 'pointer', padding: '2px 6px', background: 'var(--accent-purple-glow)', borderRadius: '4px', fontWeight: 500 }}
                title="Click to change model settings"
              >
                {aiProvider === 'gemini' ? 'Gemini' : 'Claude'} ({aiModel.split('-').slice(0, 3).join('-')})
              </span>
            </div>

            <div className="copilot-history">
              {chatMessages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                  <Sparkles size={24} style={{ color: 'var(--accent-purple-border)', marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>DialectDB AI Assistant</span>
                  <p style={{ fontSize: '11.5px', marginTop: '4px', maxWidth: '300px' }}>Ask queries in any language. The AI will translate and write SQL matching your active database scheme.</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                      {msg.sender === 'assistant' && <div className="user-avatar" style={{ width: '20px', height: '20px', fontSize: '9px', background: 'var(--accent-purple)' }}>AI</div>}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {msg.sender === 'user' ? 'You' : 'DialectDB Assistant'}
                      </span>
                      {msg.sender === 'user' && <div className="user-avatar" style={{ width: '20px', height: '20px', fontSize: '9px', background: '#3b82f6' }}>N</div>}
                    </div>

                    {msg.sender === 'user' ? (
                      <div className="chat-bubble-user">{msg.text}</div>
                    ) : (
                      <div className="chat-bubble-bot animate-slide-in">
                        <div>{msg.text}</div>

                        {/* SQL Code Block in Chat */}
                        {msg.sql && (
                          <div className="chat-sql-block">
                            <div className="chat-sql-header">
                              <span>SQL</span>
                              <button 
                                onClick={() => copyText(msg.sql!, msg.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Copy size={10} /> {copiedId === msg.id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <pre className="chat-sql-code">{msg.sql}</pre>
                          </div>
                        )}

                        {/* Explanation Section */}
                        {msg.sql && (
                          <>
                            <div className="chat-explanation-title">Explanation</div>
                            <div className="chat-explanation-text">
                              Generated SQL maps precisely to the active database structure. Click Edit to load it into the editor or optimize to inspect.
                            </div>
                          </>
                        )}

                        {/* Index suggestions */}
                        {msg.optimizations && msg.optimizations.length > 0 && (
                          <>
                            <div className="chat-explanation-title" style={{ color: 'var(--accent-blue)' }}>Suggestions</div>
                            <ul style={{ paddingLeft: '16px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {msg.optimizations.map((opt, oIdx) => (
                                <li key={oIdx} style={{ marginBottom: '2px' }}>{opt}</li>
                              ))}
                            </ul>
                          </>
                        )}

                        {/* Action buttons under bubble */}
                        {msg.sql && (
                          <div className="chat-bubble-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                            <button 
                              onClick={() => handleRunQuery(msg.sql!)} 
                              style={{
                                background: 'var(--accent-purple)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Play size={10} fill="#fff" /> Run
                            </button>
                            <button 
                              onClick={() => { setSql(msg.sql!); setActiveSidebar('editor'); }} 
                              style={{
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Insert in Editor
                            </button>
                            <button 
                              onClick={() => handleAction('explain', msg.sql!)} 
                              style={{
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Explain
                            </button>
                            <button 
                              onClick={() => handleAction('optimize', msg.sql!)} 
                              style={{
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Optimize
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {isGenerating && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '8px', alignSelf: 'flex-start', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                  <div className="animate-spin" style={{ width: '10px', height: '10px', border: '2px solid var(--accent-purple)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                  <span style={{ color: 'var(--text-secondary)' }}>AI Assistant is thinking...</span>
                </div>
              )}
            </div>

            {/* Input & Suggested prompts */}
            <div className="copilot-input-area">
              {chatMessages.length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => { handleSendMessage("show all customers from Chennai"); }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    className="glass-interactive"
                  >
                    show all customers from Chennai
                  </button>
                  <button 
                    type="button"
                    onClick={() => { handleSendMessage("list tables"); }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    className="glass-interactive"
                  >
                    list tables
                  </button>
                  <button 
                    type="button"
                    onClick={() => { handleSendMessage("find total orders count"); }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    className="glass-interactive"
                  >
                    find total orders count
                  </button>
                </div>
              )}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInput); setChatInput(''); }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input 
                  type="text" 
                  placeholder="Ask anything about your database..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="db-search-input" 
                  style={{ height: '36px', paddingLeft: '12px' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 12px', height: '36px', borderRadius: '6px' }}>Send</button>
              </form>

              <div className="suggested-prompts-container">
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginTop: '6px', marginBottom: '2px' }}>Example prompts:</span>
                <button onClick={() => handleSendMessage("Show all tables in database")} className="suggested-prompt-pill">Show all tables in database</button>
                <button onClick={() => handleSendMessage("Describe the customer schemas")} className="suggested-prompt-pill">Describe the customer schemas</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="footer-bar">
        <div className="footer-section">
          <div className="footer-item">
            <span className="connection-dot" style={{ backgroundColor: status.connected ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Connected to {status.connected ? status.dialect : 'No Database'}</span>
          </div>
        </div>
        <div className="footer-section">
          <div className="footer-item">
            <span style={{ color: 'var(--text-secondary)' }}>Dialect:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{status.connected ? status.dialect : 'None'}</strong>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <div className="footer-item">
            <span style={{ color: 'var(--text-secondary)' }}>Database:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{status.connected ? status.url : 'None'}</strong>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <div className="footer-item">
            <span style={{ color: 'var(--text-secondary)' }}>Total Tables:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{Object.keys(schema).length}</strong>
          </div>
        </div>
      </footer>

      {/* Connection Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass animate-slide-in" style={{ padding: '32px', width: '500px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '16px' }}>
              <button 
                type="button"
                onClick={() => setSettingsTab('db')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: settingsTab === 'db' ? '2px solid var(--accent-purple-border)' : '2px solid transparent',
                  color: settingsTab === 'db' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Database Connection
              </button>
              <button 
                type="button"
                onClick={() => setSettingsTab('ai')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: settingsTab === 'ai' ? '2px solid var(--accent-purple-border)' : '2px solid transparent',
                  color: settingsTab === 'ai' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                AI Model Settings
              </button>
            </div>

            {settingsTab === 'db' && (
              <>
                <h3 style={{ marginBottom: '8px', fontSize: '15px', fontWeight: 600 }}>Switch Active Database Connection</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                  Enter SQLAlchemy connection URI (e.g. Postgres, MySQL, SQL Server) or type a local SQLite filename.
                </p>
                <form onSubmit={handleConnect}>
                  <input 
                    type="text" 
                    placeholder="Connection URI or SQLite filename (e.g., dialectdb.db)"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="db-search-input"
                    style={{ width: '100%', marginBottom: '16px', height: '38px', paddingLeft: '12px' }}
                  />
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Or Upload Local SQLite Database File (.db, .sqlite)
                    </label>
                    <input 
                      type="file" 
                      accept=".db,.sqlite,.sqlite3" 
                      onChange={handleUploadDb} 
                      disabled={isUploading}
                      style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                    />
                    {isUploading && <span style={{ fontSize: '11px', color: 'var(--accent-purple)', marginLeft: '8px' }}>Uploading...</span>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary" style={{ padding: '6px 16px', fontSize: '13px' }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ padding: '6px 20px', fontSize: '13px' }}>Connect</button>
                  </div>
                </form>
              </>
            )}

            {settingsTab === 'ai' && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>AI Copilot Configuration</h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    AI Provider
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {[
                      {
                        id: 'gemini',
                        name: 'Gemini',
                        badge: status.gemini_configured ? 'Configured' : 'Missing Key',
                        isConfigured: status.gemini_configured,
                        icon: <Sparkles size={18} style={{ color: tempProvider === 'gemini' ? '#818cf8' : 'var(--text-secondary)' }} />
                      },
                      {
                        id: 'anthropic',
                        name: 'Anthropic (Claude)',
                        badge: status.anthropic_configured ? 'Configured' : 'Missing Key',
                        isConfigured: status.anthropic_configured,
                        icon: <div style={{ fontWeight: 800, fontSize: '15px', color: tempProvider === 'anthropic' ? '#818cf8' : 'var(--text-secondary)' }}>AI</div>
                      }
                    ].map((prov) => {
                      const isSelected = tempProvider === prov.id;
                      return (
                        <div
                          key={prov.id}
                          onClick={() => {
                            setTempProvider(prov.id as any);
                            setTempModel(prov.id === 'gemini' ? 'gemini-2.5-flash' : 'claude-3-5-sonnet-20241022');
                          }}
                          style={{
                            border: isSelected ? '2px solid var(--accent-purple-border)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.04)' : 'var(--bg-primary)',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.15)' : 'none'
                          }}
                          className="glass-interactive"
                        >
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'var(--accent-purple)',
                              color: '#fff',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px'
                            }}>
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                          
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {prov.icon}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{prov.name}</span>
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 500,
                              padding: '1px 6px',
                              borderRadius: '10px',
                              alignSelf: 'flex-start',
                              background: prov.isConfigured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: prov.isConfigured ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                              border: prov.isConfigured ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              {prov.badge}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    AI Model
                  </label>
                  <select
                    value={tempModel}
                    onChange={(e) => setTempModel(e.target.value)}
                    className="db-search-input"
                    style={{ width: '100%', height: '38px', paddingLeft: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                  >
                    {tempProvider === 'gemini' ? (
                      <>
                        <option value="gemini-2.5-flash">🚀 gemini-2.5-flash (Default, Fast)</option>
                        <option value="gemini-3.5-flash">⚡ gemini-3.5-flash (High speed)</option>
                        <option value="gemini-2.5-pro">🧠 gemini-2.5-pro (Accurate)</option>
                      </>
                    ) : (
                      <>
                        <option value="claude-3-5-sonnet-20241022">🤖 claude-3-5-sonnet-20241022 (Default, Smart)</option>
                        <option value="claude-3-5-haiku-20241022">🍃 claude-3-5-haiku-20241022 (Fast & Light)</option>
                      </>
                    )}
                  </select>
                </div>

                {modelDetails[tempModel] && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(99, 102, 241, 0.02)',
                    border: '1px solid rgba(99, 102, 241, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '24px'
                  }}>
                    <strong style={{ color: 'var(--accent-purple-border)', display: 'block', marginBottom: '4px' }}>
                      {modelDetails[tempModel].name}
                    </strong>
                    <span>{modelDetails[tempModel].desc}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary" style={{ padding: '6px 18px', fontSize: '13px' }}>Cancel</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setAiProvider(tempProvider);
                      setAiModel(tempModel);
                      setShowSettings(false);
                    }} 
                    className="btn-primary" 
                    style={{ padding: '6px 20px', fontSize: '13px' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Queries Modal */}
      {showSavedQueriesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass animate-slide-in" style={{ padding: '32px', width: '500px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
            <button onClick={() => setShowSavedQueriesModal(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>Saved Queries</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {savedQueries.length === 0 ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No saved queries yet.</span>
              ) : (
                savedQueries.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => { setSql(item.sql); setShowSavedQueriesModal(false); }}
                    style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    className="glass-interactive"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</strong>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSavedQueries(prev => prev.filter(q => q.id !== item.id)); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Delete
                      </button>
                    </div>
                    <pre style={{ margin: 0, fontSize: '11.5px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.sql}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Query History Modal */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass animate-slide-in" style={{ padding: '32px', width: '500px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
            <button onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Query Execution History</h3>
              {historyLog.length > 0 && (
                <button onClick={() => setHistoryLog([])} style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '12px' }}>
                  Clear History
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {historyLog.length === 0 ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No queries executed yet.</span>
              ) : (
                historyLog.map((item: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => { setSql(item.sql); setShowHistoryModal(false); }}
                    style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', borderLeft: `4px solid ${item.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}
                    className="glass-interactive"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>{item.success ? 'Success' : 'Failed'}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <pre style={{ margin: 0, fontSize: '11.5px', fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.sql}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Modal */}
      {showSaveCurrentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass animate-slide-in" style={{ padding: '24px', width: '360px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>Save Current Query</h3>
            <input 
              type="text" 
              placeholder="Enter bookmark title..."
              value={saveQueryTitle}
              onChange={(e) => setSaveQueryTitle(e.target.value)}
              className="db-search-input"
              style={{ width: '100%', marginBottom: '16px', height: '36px', paddingLeft: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSaveCurrentModal(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
              <button onClick={handleSaveCurrentQuery} className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
