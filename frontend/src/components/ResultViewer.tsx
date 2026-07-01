import React, { useState, useEffect } from 'react';
import { Table, BarChart2, Cpu, Download, AlertTriangle, Play } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ResultViewerProps {
  results: {
    columns: string[];
    rows: any[][];
    execution_time_ms: number;
    row_count: number;
    execution_plan: string | null;
  } | null;
  error: string | null;
  onAskAiToExplainError: (err: string) => void;
  isExecuting: boolean;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({
  results,
  error,
  onAskAiToExplainError,
  isExecuting
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'plan'>('table');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [yAxisKey, setYAxisKey] = useState<string>('');

  // Automatically select default X and Y axis keys when results change
  useEffect(() => {
    if (results && results.columns.length > 0) {
      setXAxisKey(results.columns[0]);
      // Search for first numeric-like column for Y axis (excluding X axis)
      const numCol = results.columns.find((_, index) => {
        if (index === 0) return false;
        // Check if first row's value is number
        const val = results.rows[0]?.[index];
        return typeof val === 'number';
      });
      setYAxisKey(numCol || results.columns[1] || results.columns[0]);
    }
  }, [results]);

  if (isExecuting) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--accent-purple)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px auto' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Executing SQL query...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1c1015', borderTop: '1px solid rgba(244, 63, 94, 0.2)', padding: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <AlertTriangle style={{ color: 'var(--accent-rose)', flexShrink: 0 }} size={24} />
          <div>
            <h4 style={{ color: 'var(--accent-rose)', fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>Database Execution Error</h4>
            <p style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.1)', whiteSpace: 'pre-wrap' }}>
              {error}
            </p>
          </div>
        </div>
        <button 
          onClick={() => onAskAiToExplainError(error)} 
          className="btn-danger"
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <Play size={14} /> Explain Error with AI Assistant
        </button>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '14px' }}>
        Write a query and press Run to see results here.
      </div>
    );
  }

  const exportCSV = () => {
    if (!results) return;
    const csvContent = [
      results.columns.join(','),
      ...results.rows.map(row => row.map(val => {
        if (val === null) return '';
        const strVal = String(val);
        return strVal.includes(',') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'dialectdb_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (!results) return;
    const formattedData = results.rows.map(row => {
      const obj: Record<string, any> = {};
      results.columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });

    const blob = new Blob([JSON.stringify(formattedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'dialectdb_export.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert tabular format into list of objects for Recharts
  const chartData = results.rows.map(row => {
    const obj: Record<string, any> = {};
    results.columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: '48px 1fr', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', overflow: 'hidden' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border-color)' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('table')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: activeTab === 'table' ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              color: activeTab === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Table size={14} /> Table
          </button>
          <button 
            onClick={() => setActiveTab('chart')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: activeTab === 'chart' ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              color: activeTab === 'chart' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <BarChart2 size={14} /> Chart Builder
          </button>
          {results.execution_plan && (
            <button 
              onClick={() => setActiveTab('plan')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: activeTab === 'plan' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                color: activeTab === 'plan' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Cpu size={14} /> Execution Plan
            </button>
          )}
        </div>

        {/* Metadata and Export controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Rows: <strong>{results.row_count}</strong> | Speed: <strong>{results.execution_time_ms} ms</strong>
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={exportCSV} 
              className="btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '12px', gap: '4px', height: '28px' }}
              title="Export to CSV"
            >
              <Download size={12} /> CSV
            </button>
            <button 
              onClick={exportJSON} 
              className="btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '12px', gap: '4px', height: '28px' }}
              title="Export to JSON"
            >
              <Download size={12} /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div style={{ overflow: 'hidden', height: '100%', position: 'relative' }}>
        {activeTab === 'table' && (
          <div style={{ overflow: 'auto', height: '100%', padding: '0' }}>
            {results.rows.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Query executed successfully, but returned 0 rows.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '600px' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600, width: '50px' }}>#</th>
                    {results.columns.map((col) => (
                      <th key={col} style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.04)', 
                        background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                      }}
                      className="glass-interactive"
                    >
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{rowIndex + 1}</td>
                      {row.map((val, colIndex) => (
                        <td key={colIndex} style={{ padding: '10px 16px', color: val === null ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {val === null ? 'NULL' : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'chart' && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%', overflow: 'hidden' }}>
            {/* Chart controls */}
            <div style={{ padding: '16px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.1)' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Chart Type</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['bar', 'line', 'area'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        padding: '6px',
                        borderRadius: '4px',
                        background: chartType === type ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>X-Axis Column</label>
                <select
                  value={xAxisKey}
                  onChange={(e) => setXAxisKey(e.target.value)}
                  className="input-base"
                  style={{ width: '100%', height: '36px', padding: '6px' }}
                >
                  {results.columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Y-Axis Column</label>
                <select
                  value={yAxisKey}
                  onChange={(e) => setYAxisKey(e.target.value)}
                  className="input-base"
                  style={{ width: '100%', height: '36px', padding: '6px' }}
                >
                  {results.columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chart Area */}
            <div style={{ padding: '20px', height: '100%', width: '100%' }}>
              {results.rows.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  No data to plot.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey={xAxisKey} stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} />
                      <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }} />
                      <Legend />
                      <Bar dataKey={yAxisKey} fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey={xAxisKey} stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} />
                      <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }} />
                      <Legend />
                      <Line type="monotone" dataKey={yAxisKey} stroke="var(--accent-purple)" strokeWidth={2} dot={{ fill: 'var(--accent-purple)' }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey={xAxisKey} stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} />
                      <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }} />
                      <Legend />
                      <Area type="monotone" dataKey={yAxisKey} stroke="var(--accent-purple)" fillOpacity={1} fill="url(#colorArea)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === 'plan' && results.execution_plan && (
          <div style={{ overflow: 'auto', height: '100%', padding: '16px', background: 'var(--bg-primary)' }}>
            <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {results.execution_plan}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
