import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Sparkles, BookOpen, Star, History, Code, Trash } from 'lucide-react';

interface SqlEditorProps {
  sql: string;
  setSql: (val: string) => void;
  onRun: (query: string) => void;
  onExplain: (query: string) => void;
  onOptimize: (query: string) => void;
  isExecuting: boolean;
  schema: Record<string, any>;
  savedQueries: Array<{ id: string; title: string; sql: string }>;
  setSavedQueries: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string; sql: string }>>>;
  history: Array<{ timestamp: string; sql: string; success: boolean }>;
  setHistory: React.Dispatch<React.SetStateAction<Array<{ timestamp: string; sql: string; success: boolean }>>>;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  sql,
  setSql,
  onRun,
  onExplain,
  onOptimize,
  isExecuting,
  schema,
  savedQueries,
  setSavedQueries,
  history,
  setHistory
}) => {
  const [editorTheme] = useState('vs-dark');
  const [saveTitle, setSaveTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'history' | 'saved'>('history');

  // Monaco autocomplete provider based on schema
  const handleEditorWillMount = (monaco: any) => {
    // Register completion provider
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

        // Add standard SQL keywords
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 
          'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'AS', 'HAVING', 'IN', 'LIKE', 'BETWEEN'
        ];
        keywords.forEach(kw => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range
          });
        });

        // Add tables and columns from schema dynamically
        Object.entries(schema).forEach(([tableName, details]: [string, any]) => {
          // Table suggestion
          suggestions.push({
            label: tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: tableName,
            detail: 'Database Table',
            range
          });

          // Column suggestions
          if (details && details.columns) {
            details.columns.forEach((col: any) => {
              suggestions.push({
                label: `${tableName}.${col.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: `Column (${col.type}) from ${tableName}`,
                range
              });
              // standalone column suggestion
              suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: `Column (${col.type})`,
                range
              });
            });
          }
        });

        return { suggestions };
      }
    });
  };

  const handleFormatSql = () => {
    // Simple regex SQL formatter
    let formatted = sql
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\b(select|from|where|and|or|join|on|group\s+by|order\s+by|limit|having|as|in|like)\b/gi, (match) => match.toUpperCase())
      .replace(/\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|LIMIT)\b/g, '\n$1')
      .replace(/\b(AND|OR)\b/g, '\n  $1')
      .trim();
    
    setSql(formatted);
  };

  const handleSaveQuery = () => {
    if (!sql.trim()) return;
    if (!saveTitle.trim()) {
      alert("Please enter a title for the saved query.");
      return;
    }
    const newSaved = {
      id: Date.now().toString(),
      title: saveTitle,
      sql: sql
    };
    setSavedQueries(prev => [newSaved, ...prev]);
    setSaveTitle('');
    setShowSaveModal(false);
  };

  const deleteSavedQuery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Left Area: Editor and Controls */}
      <div style={{ display: 'grid', gridTemplateRows: '48px 1fr', overflow: 'hidden', borderRight: '1px solid var(--border-color)' }}>
        {/* Editor Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => onRun(sql)} 
              disabled={isExecuting || !sql.trim()}
              className="btn-primary" 
              style={{ padding: '6px 14px', fontSize: '13px', height: '32px' }}
            >
              <Play size={14} fill="#fff" /> Run Query
            </button>
            <button 
              onClick={handleFormatSql}
              disabled={!sql.trim()}
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', height: '32px' }}
            >
              <Code size={14} /> Format
            </button>
            <button 
              onClick={() => setShowSaveModal(true)}
              disabled={!sql.trim()}
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', height: '32px' }}
            >
              <Star size={14} /> Save Query
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => onExplain(sql)}
              disabled={isExecuting || !sql.trim()}
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', height: '32px', borderColor: 'var(--accent-purple)' }}
            >
              <BookOpen size={14} style={{ color: 'var(--accent-purple)' }} /> AI Explain
            </button>
            <button 
              onClick={() => onOptimize(sql)}
              disabled={isExecuting || !sql.trim()}
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', height: '32px', borderColor: 'var(--accent-purple)' }}
            >
              <Sparkles size={14} style={{ color: 'var(--accent-purple)' }} /> AI Optimize
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme={editorTheme}
            value={sql}
            onChange={(val) => setSql(val || '')}
            beforeMount={handleEditorWillMount}
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 3,
              wordWrap: 'on'
            }}
          />
        </div>
      </div>

      {/* Right Area: History and Saved Queries Sidebar */}
      <div style={{ display: 'grid', gridTemplateRows: '40px 1fr', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        {/* Tab selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setSidebarTab('history')}
            style={{
              flex: 1,
              background: sidebarTab === 'history' ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none',
              color: sidebarTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <History size={12} /> History
          </button>
          <button
            onClick={() => setSidebarTab('saved')}
            style={{
              flex: 1,
              background: sidebarTab === 'saved' ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none',
              color: sidebarTab === 'saved' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Star size={12} /> Saved Queries
          </button>
        </div>

        {/* Tab contents */}
        <div style={{ overflowY: 'auto', padding: '12px' }}>
          {sidebarTab === 'history' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recent Executions</span>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash size={10} /> Clear
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
                  No query history yet.
                </div>
              ) : (
                history.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSql(item.sql)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      background: 'var(--bg-tertiary)',
                      borderLeft: `3px solid ${item.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`
                    }}
                    className="glass-interactive"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>
                      <span>{item.success ? 'Success' : 'Error'}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <pre style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                      {item.sql}
                    </pre>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Saved Queries</span>
              {savedQueries.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
                  No saved queries. Click Save Query to bookmark.
                </div>
              ) : (
                savedQueries.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSql(item.sql)}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      background: 'var(--bg-tertiary)',
                      position: 'relative'
                    }}
                    className="glass-interactive"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{item.title}</strong>
                      <button 
                        onClick={(e) => deleteSavedQuery(item.id, e)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Delete"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                    <pre style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                      {item.sql}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save query modal overlay */}
      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass animate-slide-in" style={{ padding: '24px', width: '360px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>Save SQL Query</h3>
            <input
              type="text"
              placeholder="Query Title (e.g. Chennai Customers)"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              className="input-base"
              style={{ width: '100%', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSaveModal(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={handleSaveQuery} className="btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
