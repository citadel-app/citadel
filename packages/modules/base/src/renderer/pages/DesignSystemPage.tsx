import React, { useState } from 'react';
import { Button } from '@citadel-app/ui';
import { Input } from '@citadel-app/ui';
import { Select } from '@citadel-app/ui';
import { Textarea } from '@citadel-app/ui';
import { CitadelDialog } from '@citadel-app/ui';
import { Icon } from '@citadel-app/ui';
import { Badge } from '@citadel-app/ui';
import { SplitButton } from '@citadel-app/ui';
import { Switch } from '@citadel-app/ui';
import { Checkbox } from '@citadel-app/ui';
import { RadioGroup, RadioGroupItem } from '@citadel-app/ui';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@citadel-app/ui';
import { IconButton } from '@citadel-app/ui';
import { Toggle } from '@citadel-app/ui';
import { SearchInput } from '@citadel-app/ui';
import { IconLabel } from '@citadel-app/ui';
import { UploadButton } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetBody,
    SheetFooter,
} from '@citadel-app/ui';
import { TagPicker } from '@citadel-app/ui';

// --- Permutation Helpers ---

const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
    <div className="space-y-1 mb-8">
        <h2 className="scroll-header text-3xl">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
);

const RowLabel = ({ label }: { label: string }) => (
    <div className="w-24 shrink-0 flex items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 leading-none">{label}</span>
    </div>
);

const MatrixGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-6 p-8 rounded-3xl bg-muted/5 border border-border/50">
        {children}
    </div>
);

const ComponentRow = ({ size, label, children }: { size: string; label?: string; children: React.ReactNode }) => (
    <div className="flex gap-6 items-center">
        <RowLabel label={label || size} />
        <div className="flex flex-wrap items-center gap-4 flex-1">
            {children}
        </div>
    </div>
);

const MatrixSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <section className="space-y-6">
        <SectionHeader title={title} description={description} />
        <MatrixGrid>
            {children}
        </MatrixGrid>
    </section>
);

// --- Main Page ---

export const DesignSystemPage = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sheetState, setSheetState] = useState<{
        open: boolean;
        side: "right" | "left" | "top" | "bottom";
        size: any
    }>({
        open: false,
        side: "right",
        size: "md"
    });
    const [togglePressed, setTogglePressed] = useState(false);
    const [radioValue, setRadioValue] = useState('option1');
    const [searchValue, setSearchValue] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>(['Archive', 'Research']);

    const openSheet = (side: any, size: any) => {
        setSheetState({ open: true, side, size });
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-background">
            <div className="p-10 space-y-24 mx-auto pb-80">
                <header className="space-y-4 border-b border-primary/20 pb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                            <Icon name="Library" size={32} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-medieval-decorative text-primary uppercase tracking-tighter">The Citadel Library</h1>
                            <p className="text-muted-foreground italic text-lg font-medieval">Comprehensive matrix of standard architectural components.</p>
                        </div>
                    </div>
                </header>

                {/* Button Permutations */}
                <section className="space-y-12">
                    <div>
                        <SectionHeader title="Button Matrix" description="Systematic view of all semantic variants and scale increments." />
                        <MatrixGrid>
                            {(["xs", "sm", "default"] as const).map((size) => (
                                <ComponentRow key={size} size={size}>
                                    <Button size={size} variant="default">Default</Button>
                                    <Button size={size} variant="secondary">Secondary</Button>
                                    <Button size={size} variant="outline">Outline</Button>
                                    <Button size={size} variant="ghost">Ghost</Button>
                                    <Button size={size} variant="destructive">Destructive</Button>
                                    <Button size={size} variant="link">Link</Button>
                                </ComponentRow>
                            ))}
                        </MatrixGrid>
                    </div>

                    <div>
                        <SectionHeader title="Themed Button Matrix" description="Mixing semantic intent with visual themes (Forged & Premium)." />
                        <MatrixGrid>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <ComponentRow key={size} size={size}>
                                    <Button size={size} variant="default" theme="forged" icon="Shield">Forged Primary</Button>
                                    <Button size={size} variant="secondary" theme="forged" icon="Zap">Forged Secondary</Button>
                                    <Button size={size} variant="outline" theme="forged">Forged Outline</Button>
                                    <Button size={size} variant="ghost" theme="forged">Forged Ghost</Button>
                                    <Button size={size} variant="destructive" theme="forged" icon="Trash">Forged Destructive</Button>
                                    <Button size={size} variant="link" theme="forged">Forged Link</Button>
                                </ComponentRow>
                            ))}
                        </MatrixGrid>
                        <MatrixGrid>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <ComponentRow key={size} size={size}>
                                    <Button size={size} variant="default" theme="premium" icon="Star">Premium Primary</Button>
                                    <Button size={size} variant="secondary" theme="premium" icon="Crown">Premium Second</Button>
                                    <Button size={size} variant="outline" theme="premium">Premium Outline</Button>
                                    <Button size={size} variant="ghost" theme="premium">Premium Ghost</Button>
                                    <Button size={size} variant="destructive" theme="premium">Premium Destructive</Button>
                                    <Button size={size} variant="link" theme="premium">Premium Link</Button>
                                </ComponentRow>
                            ))}
                        </MatrixGrid>
                    </div>
                </section>

                {/* Icon Button Permutations */}
                <section className="space-y-12">
                    <SectionHeader title="Icon Button Matrix" description="Exhaustive view of all purely iconographic permutations." />

                    {/* Standard Icon Buttons */}
                    <MatrixGrid>
                        <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Standard Theme</h3>
                        {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
                            <ComponentRow key={size} size={size}>
                                <IconButton size={size} variant="default" icon="Plus" dropdownContent={
                                    <>
                                        <DropdownMenuItem>New Folder</DropdownMenuItem>
                                        <DropdownMenuItem>New File</DropdownMenuItem>
                                    </>
                                } />
                                <IconButton size={size} variant="secondary" icon="Settings" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Profile</DropdownMenuItem>
                                        <DropdownMenuItem>Security</DropdownMenuItem>
                                    </>
                                } />
                                <IconButton size={size} variant="outline" icon="Search" />
                                <IconButton size={size} variant="ghost" icon="Trash" />
                                <IconButton size={size} variant="destructive" icon="AlertTriangle" />
                                <IconButton size={size} shape="pill" variant="outline" icon="MoreHorizontal" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Copy link</DropdownMenuItem>
                                        <DropdownMenuItem>Share</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                    </>
                                } />
                            </ComponentRow>
                        ))}
                    </MatrixGrid>

                    {/* Forged Icon Buttons */}
                    <MatrixGrid>
                        <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Forged Theme</h3>
                        {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
                            <ComponentRow key={size} size={size}>
                                <IconButton size={size} theme="forged" variant="default" icon="Zap" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Fireball</DropdownMenuItem>
                                        <DropdownMenuItem>Ice Spike</DropdownMenuItem>
                                    </>
                                } />
                                <IconButton size={size} theme="forged" variant="secondary" icon="Shield" />
                                <IconButton size={size} theme="forged" variant="outline" icon="Key" />
                                <IconButton size={size} theme="forged" variant="ghost" icon="Ghost" />
                                <IconButton size={size} theme="forged" variant="destructive" icon="X" />
                            </ComponentRow>
                        ))}
                    </MatrixGrid>

                    {/* Premium Icon Buttons */}
                    <MatrixGrid>
                        <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Premium Theme</h3>
                        {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
                            <ComponentRow key={size} size={size}>
                                <IconButton size={size} theme="premium" variant="default" icon="Star" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Favorite</DropdownMenuItem>
                                        <DropdownMenuItem>Rate</DropdownMenuItem>
                                    </>
                                } />
                                <IconButton size={size} theme="premium" variant="secondary" icon="Award" />
                                <IconButton size={size} theme="premium" variant="outline" icon="Command" />
                                <IconButton size={size} theme="premium" variant="ghost" icon="Layers" />
                                <IconButton size={size} theme="premium" variant="destructive" icon="Flame" />
                            </ComponentRow>
                        ))}
                    </MatrixGrid>
                </section>

                {/* Dialog Matrix */}
                <section className="space-y-12">
                    <SectionHeader title="Dialog Matrix" description="Thematic variants for modal overlays and system prompts." />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Standard Dialog */}
                        <div className="space-y-4 p-6 border border-border/50 rounded-xl bg-card/30">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Standard</h3>
                            <p className="text-xs text-muted-foreground italic mb-4">Clean, minimalist system defaults.</p>
                            <DialogPreview theme="standard" title="Standard Protocol" description="Basic interface for system-level interactions." />
                        </div>

                        {/* Forged Dialog */}
                        <div className="space-y-4 p-6 border border-primary/20 rounded-xl bg-primary/5">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Forged</h3>
                            <p className="text-xs text-muted-foreground italic mb-4">Hexagonal sharded silhouette for high-fantasy themes.</p>
                            <DialogPreview theme="forged" title="Crystal Sanctum" description="Ancient resonance detected within the sharded walls." />
                        </div>

                        {/* Premium Dialog */}
                        <div className="space-y-4 p-6 border border-primary/40 rounded-xl bg-primary/10">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Premium</h3>
                            <p className="text-xs text-muted-foreground italic mb-4">Glassmorphism and atmospheric deep-glow aesthetics.</p>
                            <DialogPreview theme="premium" title="Ethereal Archive" description="Refined knowledge extraction in a premium environment." />
                        </div>

                        {/* Outline Dialog */}
                        <div className="space-y-4 p-6 border border-border/50 rounded-xl bg-card">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Outline</h3>
                            <p className="text-xs text-muted-foreground italic mb-4">A structured, professional look with a distinct header.</p>
                            <DialogPreview theme="outline" title="The Ledger of Truth" description="A formal interface for high-density information management." />
                        </div>

                        {/* Large Content Dialog */}
                        <div className="space-y-4 p-6 border border-border/50 rounded-xl bg-muted/20">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Scalability</h3>
                            <p className="text-xs text-muted-foreground italic mb-4">Handling large amounts of information with internal scrolling.</p>
                            <LargeContentDialogPreview />
                        </div>

                        {/* Width Modes Dialog */}
                        <div className="space-y-4 p-6 border border-border/50 rounded-xl bg-accent/10 col-span-1 md:col-span-2">
                            <h3 className="text-sm font-bold text-primary/60 uppercase tracking-widest">Width Modes</h3>
                            <p className="text-xs text-muted-foreground italic mb-4">Choose between fixed filling or flexible content-based sizing.</p>
                            <div className="flex flex-wrap gap-4">
                                <DialogPreview
                                    theme="premium"
                                    title="Fixed Width (Default)"
                                    description="Fills the entire max-width limit even if content is small."
                                    width="fixed"
                                />
                                <DialogPreview
                                    theme="premium"
                                    title="Flexible Width"
                                    description="Shrinks to fit the content size up to the max-width limit."
                                    width="flexible"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Split Button Permutations */}
                <section className="space-y-12">
                    <SectionHeader title="Split Button Matrix" description="Complex action components with integrated dropdown triggers." />

                    <MatrixGrid>
                        <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Standard & Premium</h3>
                        {(["sm", "default", "lg"] as const).map((size) => (
                            <React.Fragment key={size}>
                                <ComponentRow size={size} label={`${size}-std`}>
                                    <SplitButton size={size} variant="default" dropdownContent={
                                        <>
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem>Save as...</DropdownMenuItem>
                                            <DropdownMenuItem>Export</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                        </>
                                    }>Save</SplitButton>
                                    <SplitButton size={size} variant="secondary" dropdownContent={
                                        <>
                                            <DropdownMenuItem>Mark as read</DropdownMenuItem>
                                            <DropdownMenuItem>Archive</DropdownMenuItem>
                                        </>
                                    }>Draft</SplitButton>
                                    <SplitButton size={size} variant="outline" dropdownContent={
                                        <>
                                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                            <DropdownMenuItem>Move</DropdownMenuItem>
                                        </>
                                    }>Options</SplitButton>
                                </ComponentRow>
                                <ComponentRow size={size} label={`${size}-prem`}>
                                    <SplitButton size={size} theme="premium" variant="default" dropdownContent={
                                        <>
                                            <DropdownMenuItem>Publish to Web</DropdownMenuItem>
                                            <DropdownMenuItem>Share link</DropdownMenuItem>
                                        </>
                                    }>Publish</SplitButton>
                                </ComponentRow>
                            </React.Fragment>
                        ))}
                    </MatrixGrid>

                    <MatrixGrid>
                        <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Forged Theme (Hexagonal Shards)</h3>
                        {(["sm", "default", "lg"] as const).map((size) => (
                            <ComponentRow key={size} size={size}>
                                <SplitButton size={size} theme="forged" variant="default" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Level 1</DropdownMenuItem>
                                        <DropdownMenuItem>Level 2</DropdownMenuItem>
                                        <DropdownMenuItem>Level 3</DropdownMenuItem>
                                    </>
                                }>Cast Spell</SplitButton>
                                <SplitButton size={size} theme="forged" variant="secondary" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Brew Potion</DropdownMenuItem>
                                        <DropdownMenuItem>Transmute</DropdownMenuItem>
                                    </>
                                }>Alchemy</SplitButton>
                                <SplitButton size={size} theme="forged" variant="outline" dropdownContent={
                                    <>
                                        <DropdownMenuItem>Read Records</DropdownMenuItem>
                                        <DropdownMenuItem>Write Entry</DropdownMenuItem>
                                    </>
                                }>Journal</SplitButton>
                            </ComponentRow>
                        ))}
                    </MatrixGrid>
                </section>

                {/* Form Field Permutations */}
                <section className="space-y-12">
                    <div>
                        <SectionHeader title="Form Field Matrix" description="All inputs and selects standardized to match button heights." />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2">
                            <div className="h-px bg-primary/20 flex-1" />
                            Input & Search
                            <div className="h-px bg-primary/20 flex-1" />
                        </h3>
                        <MatrixGrid>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <ComponentRow key={size} size={size}>
                                    <Input size={size} variant="default" placeholder="Default..." className="w-40" />
                                    <Input size={size} variant="ghost" placeholder="Ghost..." className="w-40" />
                                    <Input size={size} variant="pill" placeholder="Pill..." className="w-40" />
                                    <SearchInput size={size} placeholder="Search..." className="flex-1 max-w-sm" />
                                </ComponentRow>
                            ))}
                        </MatrixGrid>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2">
                            <div className="h-px bg-primary/20 flex-1" />
                            Select & Textarea
                            <div className="h-px bg-primary/20 flex-1" />
                        </h3>
                        <MatrixGrid>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <ComponentRow key={size} size={size}>
                                    <Select size={size} variant="default" className="w-48">
                                        <option>Standard Select</option>
                                    </Select>
                                    <Select size={size} variant="ghost" className="w-48">
                                        <option>Ghost Select</option>
                                    </Select>
                                    <Textarea size={size} placeholder="Transcription text..." className="h-auto min-h-0 flex-1" />
                                </ComponentRow>
                            ))}
                        </MatrixGrid>
                    </div>
                </section>

                {/* Toggle & Badge Matrix */}
                <section className="space-y-12">
                    <div>
                        <SectionHeader title="Toggle Matrix" description="Standardized binary interaction states across all themes and variants." />

                        <MatrixGrid>
                            <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Standard Theme</h3>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <React.Fragment key={size}>
                                    <ComponentRow size={size} label={`${size}-std`}>
                                        <Toggle size={size} pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Zap" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Default
                                        </Toggle>
                                        <Toggle size={size} variant="outline" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Shield" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Outline
                                        </Toggle>
                                        <Toggle size={size} variant="ghost" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Ghost" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Ghost
                                        </Toggle>
                                    </ComponentRow>
                                </React.Fragment>
                            ))}
                        </MatrixGrid>

                        <MatrixGrid>
                            <h3 className="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-2">Forged & Premium</h3>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <React.Fragment key={size}>
                                    <ComponentRow size={size} label={`${size}-forge`}>
                                        <Toggle size={size} theme="forged" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Zap" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Default
                                        </Toggle>
                                        <Toggle size={size} theme="forged" variant="outline" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Shield" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Outline
                                        </Toggle>
                                    </ComponentRow>
                                    <ComponentRow size={size} label={`${size}-prem`}>
                                        <Toggle size={size} theme="premium" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Star" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Premium
                                        </Toggle>
                                        <Toggle size={size} theme="premium" variant="outline" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                            <Icon name="Crown" size={size === 'sm' ? 12 : 14} className="mr-2" />
                                            Outline
                                        </Toggle>
                                    </ComponentRow>
                                </React.Fragment>
                            ))}
                        </MatrixGrid>
                    </div>

                    <div>
                        <SectionHeader title="Badge Matrix" description="Visual status and categorization tokens across all stylistic variants." />
                        <MatrixGrid>
                            {(["sm", "default", "lg"] as const).map((size) => (
                                <ComponentRow key={size} size={size}>
                                    <Badge size={size} variant="default">Default</Badge>
                                    <Badge size={size} variant="secondary">Secondary</Badge>
                                    <Badge size={size} variant="outline">Outline</Badge>
                                    <Badge size={size} variant="destructive">Destructive</Badge>
                                    <Badge size={size} variant="tag" icon="Tag">Research</Badge>
                                    <Badge size={size} variant="metadata" icon="Database">v1.2.0</Badge>
                                    <Badge size={size} variant="premium" icon="Zap">Premium</Badge>
                                </ComponentRow>
                            ))}
                        </MatrixGrid>
                    </div>
                </section>

                {/* Control Matrix */}
                <section>
                    <SectionHeader title="Control Matrix" description="Binary and selection logic scaled for varied layout densities." />
                    <MatrixGrid>
                        {(["sm", "default", "lg"] as const).map((size) => (
                            <ComponentRow key={size} size={size}>
                                <div className="flex items-center gap-8 flex-1">
                                    <Switch size={size} label="Zen Mode" defaultChecked />
                                    <Checkbox size={size} label="Auto-Sync" defaultChecked />
                                    <RadioGroup size={size} value={radioValue} onValueChange={setRadioValue} className="flex flex-row gap-6">
                                        <RadioGroupItem value="option1" label="Standard" />
                                        <RadioGroupItem value="option2" label="Guarded" />
                                    </RadioGroup>
                                </div>
                            </ComponentRow>
                        ))}
                    </MatrixGrid>
                </section>

                {/* Overlays & Portals */}
                <section>
                    <SectionHeader title="Panels & Overlays" description="Global portal components that respect the Keep's safe areas." />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Interactive Demo Control */}
                        <div className="p-10 rounded-3xl bg-muted/5 border border-border/50 space-y-8">
                            <div className="space-y-4 text-center">
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">The Oracle Portal</p>
                                <Button theme="forged" size="xl" onClick={() => setIsDialogOpen(true)} icon="Maximize" className="w-full">
                                    Summon Modal
                                </Button>
                            </div>
                            <div className="h-px bg-border/50" />
                            <div className="space-y-4">
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">The Archive Side-Arch</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="secondary" onClick={() => openSheet("left", "md")} icon="ArrowLeft">Left Arch</Button>
                                    <Button variant="secondary" onClick={() => openSheet("right", "md")} icon="ArrowRight">Right Arch</Button>
                                    <Button variant="secondary" icon="ArrowUp" onClick={() => openSheet("top", "sm")}>Top Arch</Button>
                                    <Button variant="secondary" icon="ArrowDown" onClick={() => openSheet("bottom", "sm")}>Bottom Arch</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button size="xs" variant="outline" onClick={() => openSheet("right", "sm")}>Sm Panel</Button>
                                    <Button size="xs" variant="outline" onClick={() => openSheet("right", "lg")}>Lg Panel</Button>
                                    <Button size="xs" variant="outline" onClick={() => openSheet("right", "content")}>Fit Content</Button>
                                    <Button size="xs" variant="outline" onClick={() => openSheet("right", "full")}>Full Keep</Button>
                                </div>
                            </div>
                        </div>

                        {/* Aesthetic Helper Labels */}
                        <div className="p-10 rounded-3xl bg-muted/10 border border-border/50 flex flex-col justify-center items-center gap-12 text-center">
                            <div className="space-y-6">
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground leading-none">Contextual IconLabels</p>
                                <div className="flex justify-center gap-10">
                                    <IconLabel icon="Shield" label="Protected" iconClassName="text-green-500" />
                                    <IconLabel icon="AlertTriangle" label="Vital" iconClassName="text-yellow-500" />
                                    <IconLabel icon="History" label="Archived" vertical iconClassName="text-blue-500" />
                                </div>
                            </div>
                            <div className="h-px bg-border/50 w-full" />
                            <div className="space-y-6">
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground leading-none">The Scribe's Picker</p>
                                <TagPicker selectedTags={selectedTags} onAdd={(tag) => setSelectedTags([...selectedTags, tag])} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Inlined Alignment (Final Stress Test) */}
                <section>
                    <SectionHeader title="Alignment Stress-Test" description="Ensuring pixel-perfect vertical consistency across mixed inlined component types." />
                    <div className="space-y-4 p-8 rounded-3xl border border-primary/20 bg-primary/5">
                        {(["sm", "default", "lg"] as const).map((size) => (
                            <div key={size} className="flex items-center gap-2">
                                <RowLabel label={size} />
                                <SearchInput size={size} placeholder="Search archives..." className="max-w-xs" />
                                <Select size={size} className="w-40">
                                    <option>Category</option>
                                </Select>
                                <Button size={size}>Action</Button>
                                <Toggle size={size} variant="outline" pressed={togglePressed} onPressedChange={setTogglePressed}>
                                    <Icon name="Filter" size={size === 'sm' ? 12 : 14} />
                                </Toggle>
                                <Checkbox size={size} />
                                <Switch size={size} />
                                <Button size={size} variant="ghost" icon="MoreVertical" />
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Global Overlay Instances */}
            <Sheet open={sheetState.open} onOpenChange={(open) => setSheetState(prev => ({ ...prev, open }))}>
                <SheetContent side={sheetState.side} size={sheetState.size} className="bg-background/95 backdrop-blur-xl">
                    <SheetHeader>
                        <SheetTitle className="font-medieval text-2xl text-primary flex items-center gap-3">
                            <Icon name="Scroll" size={24} />
                            Portal Side-Arch
                        </SheetTitle>
                        <SheetDescription>
                            Mode: <span className="text-primary font-bold">{sheetState.side}</span> | Size: <span className="text-primary font-bold">{sheetState.size}</span>
                        </SheetDescription>
                    </SheetHeader>
                    <SheetBody>
                        <div className="py-6 space-y-6">
                            <p className="text-sm leading-relaxed text-muted-foreground italic">
                                This panel demonstrates responsive scaling and atmospheric blurring.
                            </p>
                            <div className="p-6 rounded-2xl bg-muted/30 border border-border space-y-4">
                                <IconLabel icon="Book" label="Archived Records" />
                                <div className="h-32 bg-background/50 rounded-xl flex items-center justify-center border border-dashed border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                                    Vault Content
                                </div>
                            </div>
                        </div>
                    </SheetBody>
                    <SheetFooter>
                        <Button variant="ghost" onClick={() => setSheetState(prev => ({ ...prev, open: false }))}>Seal</Button>
                        <Button icon="Check">Confirm</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <CitadelDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                title="The Oracle's Decree"
                description="The knowledge you seek is bound to your vault."
            >
                <div className="space-y-8 py-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Behold, a standardized modal interface with optimized scaling and transitions.
                        Safe areas are respected even when global overlays are active.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Dismiss</Button>
                        <Button theme="forged" onClick={() => setIsDialogOpen(false)}>Acknowledge</Button>
                    </div>
                </div>
            </CitadelDialog>
        </div>
    );
};

const DialogPreview = ({ theme, title, description, width = "fixed" }: { theme: "standard" | "forged" | "premium" | "outline", title: string, description: string, width?: "fixed" | "flexible" }) => {
    const [open, setOpen] = React.useState(false);
    const buttonTheme = theme === "outline" ? "standard" : theme;

    return (
        <>
            <Button theme={buttonTheme} variant="outline" onClick={() => setOpen(true)}>
                {width === "flexible" ? "Open Flexible" : `Open ${theme}`}
            </Button>
            <CitadelDialog
                theme={theme}
                width={width}
                open={open}
                onOpenChange={setOpen}
                title={title}
                description={description}
            >
                <div className="space-y-4 py-4">
                    <p className="text-sm leading-relaxed opacity-80">
                        This is a demonstration of the <strong>{theme}</strong> dialog theme.
                        Note how the border, background, and typography adapt to the chosen aesthetic.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" theme={buttonTheme} onClick={() => setOpen(false)}>Dismiss</Button>
                        <Button variant="default" theme={buttonTheme} onClick={() => setOpen(false)}>Acknowledge</Button>
                    </div>
                </div>
            </CitadelDialog>
        </>
    );
};

const LargeContentDialogPreview = () => {
    const [open, setOpen] = React.useState(false);
    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>Open Large Content Dialog</Button>
            <CitadelDialog
                theme="premium"
                open={open}
                onOpenChange={setOpen}
                title="The Great Archives"
                description="Scroll through the vast knowledge of the Citadel."
            >
                <div className="space-y-6">
                    <section className="space-y-2">
                        <h4 className="font-bold text-primary">Volume I: Foundations</h4>
                        <p className="text-sm opacity-80 leading-relaxed">
                            The Citadel was built upon the ruins of an ancient civilization, carved from the very obsidian that forms the foundation of our world. Its walls are inscribed with the history of a thousand generations, each layer of stone telling a different story of triumph and tragedy.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h4 className="font-bold text-primary">Volume II: The Arcanum</h4>
                        <p className="text-sm opacity-80 leading-relaxed">
                            Deep within the Scriptorium, the scholars of the Citadel labor day and night to translate the forgotten languages of the old world. They seek the secrets of the stars and the hidden patterns of the earth, hoping to unlock the power that once fueled the great engines of creation.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h4 className="font-bold text-primary">Volume III: The Shadowed Depths</h4>
                        <p className="text-sm opacity-80 leading-relaxed">
                            Beneath the polished marble of the upper tiers lies a network of tunnels and chambers known as the Bastion. Here, the guardians of the Citadel Keep watch over the artifacts that are too dangerous to be seen by the public. It is a place of silence and shadow, where only the brave or the foolish dare to tread.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h4 className="font-bold text-primary">Volume IV: The Silent Keep</h4>
                        <p className="text-sm opacity-80 leading-relaxed">
                            High above the clouds, the Oracle dwells in the Silent Keep, a spire of ivory and crystal that reflects the light of the moon. It is said that from this vantage point, one can see the past, the present, and the future all at once, if they have the wisdom to look.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h4 className="font-bold text-primary">Volume V: The Eternal Flame</h4>
                        <p className="text-sm opacity-80 leading-relaxed">
                            In the heart of the Forge, the Eternal Flame burns with an unearthly intensity, powered by the collective memory of the Citadel itself. It is here that the great weapons and tools of our age are crafted, imbued with the essence of knowledge and the strength of the mountains.
                        </p>
                    </section>
                    <div className="pt-8 flex justify-end">
                        <Button onClick={() => setOpen(false)}>Close Archives</Button>
                    </div>
                </div>
            </CitadelDialog>
        </>
    );
};
