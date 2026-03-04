import { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { useGit } from '../../context/GitContext';
import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils'; // Assuming cn utility is available or just use template literals

interface BranchManagerModalProps {
    onClose: () => void;
}

export const BranchManagerModal = ({ onClose }: BranchManagerModalProps) => {
    const { vaultPath } = useConfig();
    const { refreshStatus } = useGit();
    const [branches, setBranches] = useState<{ all: string[], current: string }>({ all: [], current: '' });
    const [filter, setFilter] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadBranches();
    }, [vaultPath]);

    const loadBranches = async () => {
        if (!vaultPath) return; // Should not happen if modal is open
        try {
            setLoading(true);
            const result = await window.api.git.getBranches(vaultPath);
            setBranches(result);
        } catch (err) {
            console.error(err);
            setError("Failed to load branches");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (branch: string) => {
        if (!vaultPath || branch === branches.current) return;
        try {
            setLoading(true);
            await window.api.git.checkout(vaultPath, branch);
            await refreshStatus();
            await loadBranches();
            onClose(); // Auto close on successful checkout
        } catch (err) {
            console.error(err);
            setError(`Failed to checkout ${branch}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBranch = async () => {
        if (!vaultPath || !newBranchName) return;
        try {
            setLoading(true);
            await window.api.git.createBranch(vaultPath, newBranchName);
            await refreshStatus();
            await loadBranches();
            setNewBranchName('');
        } catch (e: any) {
            console.error(e);
            setError("Failed to create branch. It might already exist.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBranch = async (branch: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!vaultPath) return;
        if (!confirm(`Delete branch '${branch}'? This cannot be undone.`)) return;

        try {
            setLoading(true);
            await window.api.git.deleteBranch(vaultPath, branch);
            await loadBranches();
        } catch (e) {
            console.error(e);
            setError("Failed to delete branch. It might be unmerged.");
        } finally {
            setLoading(false);
        }
    };

    const filteredBranches = branches.all.filter(b => b.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md bg-background border border-border rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-3 border-b border-border">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Icon name="GitBranch" size={16} />
                        Manage Branches
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                        <Icon name="X" size={16} />
                    </button>
                </div>

                <div className="p-3 border-b border-border bg-muted/20">
                    <input
                        type="text"
                        placeholder="Filter branches..."
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm mb-3"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        autoFocus
                    />

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New branch name..."
                            className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm"
                            value={newBranchName}
                            onChange={e => setNewBranchName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                        />
                        <button
                            onClick={handleCreateBranch}
                            disabled={!newBranchName || loading}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                    {error && <p className="text-destructive text-xs mt-2">{error}</p>}
                </div>

                <div className="flex-1 overflow-y-auto p-1">
                    {loading && branches.all.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">Loading branches...</div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {filteredBranches.map(branch => (
                                <div
                                    key={branch}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded cursor-pointer group",
                                        branch === branches.current
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted/50 text-foreground"
                                    )}
                                    onClick={() => handleCheckout(branch)}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Icon name={branch === branches.current ? "Check" : "GitBranch"} size={14} className={branch === branches.current ? "opacity-100" : "opacity-40 group-hover:opacity-70"} />
                                        <span className="truncate font-medium text-sm">{branch}</span>
                                        {branch === branches.current && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full">Current</span>}
                                    </div>

                                    {branch !== branches.current && (
                                        <button
                                            onClick={(e) => handleDeleteBranch(branch, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                                            title="Delete Branch"
                                        >
                                            <Icon name="Trash2" size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filteredBranches.length === 0 && !loading && (
                                <div className="p-4 text-center text-muted-foreground text-sm">No branches found.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
