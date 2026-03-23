import { Dialog as Root, DialogPortal as Portal, DialogOverlay as Overlay, DialogTrigger as Trigger, DialogClose as Close, DialogContent as Content, DialogHeader as Header, DialogFooter as Footer, DialogTitle as Title, DialogDescription as Description } from '@citadel-app/ui';
const Dialog = { Root, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description };
import { Icon } from '@citadel-app/ui';

interface SearchHelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SearchHelpDialog = ({ open, onOpenChange }: SearchHelpDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[150] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-4xl max-h-[85vh] bg-card border border-border shadow-2xl rounded-[2rem] overflow-hidden flex flex-col z-[160] animate-in zoom-in-95 fade-in duration-300">
                    <div className="p-8 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                <Icon name="BookOpen" size={24} />
                            </div>
                            <div>
                                <Dialog.Title className="text-2xl font-black tracking-tight italic">Search Handbook</Dialog.Title>
                                <Dialog.Description className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                                    Unified Search Syntax & Pro Tips
                                </Dialog.Description>
                            </div>
                        </div>
                        <Dialog.Close className="p-2 rounded-full hover:bg-muted transition-colors">
                            <Icon name="X" size={20} className="text-muted-foreground" />
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Logic Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-primary">
                                    <Icon name="Cpu" size={16} />
                                    <h3 className="text-sm font-black uppercase tracking-[0.15em]">Boolean Logic</h3>
                                </div>
                                <div className="space-y-4">
                                    <HelpItem
                                        cmd="AND / (space)"
                                        desc="Implicitly combines terms. Returns items matching both."
                                        example="react typescript"
                                    />
                                    <HelpItem
                                        cmd="OR"
                                        desc="Returns items matching either term."
                                        example="easy OR medium"
                                    />
                                    <HelpItem
                                        cmd="NOT / -"
                                        desc="Excludes items matching the following term."
                                        example="leetcode NOT solved"
                                    />
                                    <HelpItem
                                        cmd="( )"
                                        desc="Groups logic to control precedence."
                                        example="react (hooks OR context)"
                                    />
                                </div>
                            </section>

                            {/* Tags Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-blue-500">
                                    <Icon name="Tag" size={16} />
                                    <h3 className="text-sm font-black uppercase tracking-[0.15em]">Smart Tags</h3>
                                </div>
                                <div className="space-y-4">
                                    <HelpItem
                                        cmd="#tag"
                                        desc="Matches a specific tag."
                                        example="#frontend"
                                    />
                                    <HelpItem
                                        cmd='#"Quoted Tag"'
                                        desc="Handles tags with spaces using double quotes."
                                        example='#"Hash Table"'
                                    />
                                    <p className="text-[10px] text-muted-foreground italic bg-muted/30 p-3 rounded-xl border border-border/30">
                                        <strong>Pro Tip:</strong> Click any tag badge in the UI to instantly populate the search bar with its token.
                                    </p>
                                </div>
                            </section>

                            {/* Metadata Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-purple-500">
                                    <Icon name="Database" size={16} />
                                    <h3 className="text-sm font-black uppercase tracking-[0.15em]">Metadata Filters</h3>
                                </div>
                                <div className="space-y-4">
                                    <HelpItem
                                        cmd="key:value"
                                        desc="Matches exact metadata fields."
                                        example="difficulty:Hard"
                                    />
                                    <HelpItem
                                        cmd="key:(a OR b)"
                                        desc="Complex values within metadata fields."
                                        example="company:(Google OR Meta)"
                                    />
                                    <HelpItem
                                        cmd="type:name"
                                        desc="Filter by entry type (e.g., bug, note)."
                                        example="type:bug"
                                    />
                                </div>
                            </section>

                            {/* Real-World Examples */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <Icon name="Zap" size={16} />
                                    <h3 className="text-sm font-black uppercase tracking-[0.15em]">Power User Queries</h3>
                                </div>
                                <div className="space-y-3">
                                    <ExampleLine query='#"Array" difficulty:Easy NOT solved' />
                                    <ExampleLine query='company:Google (Python OR Go) type:problem' />
                                    <ExampleLine query='#security (status:Critical OR status:High)' />
                                </div>
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Intellisense</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Codex provides real-time suggestions for tags, metadata keys, and operators. Use <kbd className="bg-muted px-1 rounded border border-border text-[9px]">Ctrl</kbd> + <kbd className="bg-muted px-1 rounded border border-border text-[9px]">Space</kbd> to force suggestions anywhere.
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-end shrink-0">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 scale-100 active:scale-95"
                        >
                            GOT IT
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const HelpItem = ({ cmd, desc, example }: { cmd: string; desc: string; example: string }) => (
    <div className="group space-y-2">
        <div className="flex items-center justify-between">
            <code className="text-[12px] font-black text-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50 group-hover:border-primary/50 transition-colors">
                {cmd}
            </code>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
            {desc}
        </p>
        <div className="text-[10px] text-primary/60 flex items-center gap-1.5 font-mono">
            <span className="opacity-40">e.g.</span>
            <span className="italic">{example}</span>
        </div>
    </div>
);

const ExampleLine = ({ query }: { query: string }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/20 hover:bg-muted/40 transition-all cursor-default group">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors" />
        <code className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate font-mono">
            {query}
        </code>
    </div>
);
