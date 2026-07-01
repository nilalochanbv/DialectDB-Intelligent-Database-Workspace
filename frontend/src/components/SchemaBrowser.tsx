import React, { useState } from 'react';
import { Database, Table as TableIcon, Key, ChevronDown, ChevronRight, Search, RefreshCw, Layers } from 'lucide-react';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface ForeignKey {
  constrained_columns: string[];
  referred_table: string;
  referred_columns: string[];
}

interface TableSchema {
  columns: Column[];
  primary_keys: string[];
  foreign_keys: ForeignKey[];
}

interface SchemaBrowserProps {
  schema: Record<string, TableSchema>;
  onRefresh: () => void;
  status: { connected: boolean; dialect: string | null; url: string | null };
  isLoading: boolean;
  onInsertText: (text: string) => void;
}

export const SchemaBrowser: React.FC<SchemaBrowserProps> = ({
  schema,
  onRefresh,
  status,
  isLoading,
  onInsertText
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const filteredTables = Object.entries(schema).filter(([tableName, details]) => {
    const tableMatch = tableName.toLowerCase().includes(searchTerm.toLowerCase());
    const columnMatch = details.columns.some(col => 
      col.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return tableMatch || columnMatch;
  });

  return (
    <div className="sidebar" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* DB Connection Status */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: status.connected ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>
              {status.connected ? status.dialect?.toUpperCase() : 'Not Connected'}
            </span>
          </div>
          <button 
            onClick={onRefresh} 
            disabled={isLoading}
            className="btn-secondary"
            style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
            title="Refresh Schema"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={status.url || ''}>
          {status.connected ? status.url : 'Configure connection in Settings'}
        </div>
      </div>

      {/* Schema Search */}
      <div style={{ padding: '12px 16px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Search tables or columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-base"
          style={{ width: '100%', paddingLeft: '32px', fontSize: '13px', height: '36px' }}
        />
        <Search size={14} style={{ position: 'absolute', left: '26px', top: '23px', color: 'var(--text-muted)' }} />
      </div>

      {/* Table List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px 8px' }}>
        {filteredTables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No tables found
          </div>
        ) : (
          filteredTables.map(([tableName, details]) => {
            const isExpanded = !!expandedTables[tableName] || searchTerm.length > 0;
            
            return (
              <div key={tableName} style={{ marginBottom: '4px' }}>
                {/* Table row header */}
                <div 
                  onClick={() => toggleTable(tableName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)'
                  }}
                  className="glass-interactive"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <TableIcon size={14} style={{ color: 'var(--accent-purple)' }} />
                    <span 
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onInsertText(tableName);
                      }}
                      title="Double click to insert"
                    >
                      {tableName}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '10px' }}>
                    {details.columns.length}
                  </span>
                </div>

                {/* Columns section */}
                {isExpanded && (
                  <div style={{ paddingLeft: '24px', borderLeft: '1px solid var(--border-color)', marginLeft: '16px', marginTop: '4px', marginBottom: '8px' }}>
                    {details.columns.map((col) => {
                      const isPK = details.primary_keys.includes(col.name);
                      const isFK = details.foreign_keys.some(fk => fk.constrained_columns.includes(col.name));
                      
                      return (
                        <div 
                          key={col.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 6px',
                            fontSize: '12px',
                            color: 'var(--text-secondary)'
                          }}
                          className="glass-interactive"
                          onDoubleClick={() => onInsertText(col.name)}
                          title="Double click to insert column"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isPK && <Key size={10} style={{ color: '#fbbf24' }} />}
                            {isFK && <Layers size={10} style={{ color: 'var(--accent-blue)' }} />}
                            <span>{col.name}</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                            {col.type.toLowerCase()}
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
  );
};
