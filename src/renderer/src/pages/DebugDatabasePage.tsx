import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Icon } from '../components/IconRegistry';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

type TableName = 'entries' | 'whiteboard' | 'editor' | 'indexStatus';

export const DebugDatabasePage = () => {
    const [selectedTable, setSelectedTable] = useState<TableName>('entries');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

    // Fetch data for the selected table
    const tableData = useLiveQuery(async () => {
        const table = (db as any)[selectedTable];
        if (!table) return [];
        return await table.toArray();
    }, [selectedTable]) || [];

    // Filtered data based on search
    const filteredData = useMemo(() => {
        if (!searchQuery) return tableData;
        const lowerQuery = searchQuery.toLowerCase();
        return tableData.filter((item: any) => {
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerQuery)
            );
        });
    }, [tableData, searchQuery]);

    // Table Counts
    const counts = useLiveQuery(async () => {
        return {
            entries: await db.entries.count(),
            whiteboard: await db.whiteboard.count(),
            editor: await db.editor.count(),
            indexStatus: await db.indexStatus.count()
        };
    }, []);

    const tableList: { key: TableName; label: string; icon: string }[] = [
        { key: 'entries', label: 'Entries', icon: 'FileText' },
        { key: 'whiteboard', label: 'Whiteboards', icon: 'SquarePen' },
        { key: 'editor', label: 'Editor Snippets', icon: 'Code' },
        { key: 'indexStatus', label: 'Index Status', icon: 'Search' }
    ];

    return (
        <div className="flex h-full bg-background overflow-hidden relative">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-muted/10 flex flex-col">
                <div className="p-4 border-b border-border bg-muted/20">
                    <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Icon name="Database" size={16} className="text-primary" />
                        System DB
                    </h2>
                </div>
                <nav className="flex-1 p-2 space-y-1">
                    {tableList.map(table => (
                        <button
                            key={table.key}
                            onClick={() => {
                                setSelectedTable(table.key);
                                setSelectedRecord(null);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                                selectedTable === table.key
                                    ? "bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Icon name={table.icon} size={14} />
                                {table.label}
                            </div>
                            <span className="text-[10px] font-mono opacity-60">
                                {counts?.[table.key] ?? '...'}
                            </span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-border bg-muted/20 text-[10px] text-muted-foreground uppercase tracking-tighter">
                    Read-Only Debug Mode
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold">
                            {tableList.find(t => t.key === selectedTable)?.label}
                        </h1>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-mono text-muted-foreground">
                            {filteredData.length} records found
                        </span>
                    </div>

                    <div className="flex items-center gap-2 max-w-sm w-full relative">
                        <Icon name="Search" size={14} className="absolute left-3 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6">
                    <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-muted/5">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-muted/80 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">ID / Key</th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">Preview</th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">Updated</th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredData.map((record: any) => (
                                    <tr
                                        key={record.id || record.entryId}
                                        onClick={() => setSelectedRecord(record)}
                                        className={cn(
                                            "group hover:bg-primary/5 cursor-pointer transition-colors",
                                            selectedRecord === record && "bg-primary/10"
                                        )}
                                    >
                                        <td className="px-4 py-3 align-top font-mono text-[10px] text-primary/80">
                                            {record.id || record.entryId}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="text-xs font-semibold truncate max-w-[300px]" title={record.title || record.content}>
                                                {record.title || record.content?.substring(0, 100) || '—'}
                                            </div>
                                            {record.type && (
                                                <div className="text-[10px] text-muted-foreground opacity-60 mt-0.5 uppercase tracking-tighter">
                                                    {record.type}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top text-[10px] text-muted-foreground font-mono">
                                            {record.updatedAt ? format(new Date(record.updatedAt), 'MMM d, HH:mm') : '—'}
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            <button className="p-1 px-2 rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground">
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredData.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                                <Icon name="Inbox" size={32} className="opacity-20 mb-4" />
                                <p className="text-sm italic">No records found for this table.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Record Inspector Drawer */}
            {selectedRecord && (
                <div className="absolute inset-y-0 right-0 w-[500px] bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 z-50 flex flex-col">
                    <header className="px-4 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest">Record Inspector</h3>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[350px]">
                                {selectedRecord.id || selectedRecord.entryId}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedRecord(null)}
                            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Icon name="X" size={18} />
                        </button>
                    </header>
                    <div className="flex-1 overflow-auto p-4 bg-muted/5">
                        <pre className="text-[11px] font-mono leading-relaxed bg-muted/40 p-4 rounded-lg border border-border/50 text-foreground overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(selectedRecord, null, 2)}
                        </pre>
                    </div>
                    <footer className="p-4 border-t border-border bg-muted/20 text-right">
                        <button
                            onClick={() => setSelectedRecord(null)}
                            className="px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
                        >
                            Close Inspector
                        </button>
                    </footer>
                </div>
            )}
        </div>
    );
};
