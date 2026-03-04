import { useRef, useEffect, useState } from 'react';
import { Icon } from '../IconRegistry';

interface WebviewModuleProps {
    entry: any; // Type as needed
    highlights?: any[];
    onHighlightAdd?: (highlight: any) => void;
    onHighlightDelete?: (id: string) => void;
    config?: { map?: Record<string, string> };
}

export const WebviewModule = ({ entry, highlights, onHighlightAdd, config }: WebviewModuleProps) => {
    const webviewRef = useRef<Electron.WebviewTag>(null);

    // Resolve initial URL
    let initialUrl = '';
    const urlField = config?.map?.['url'];
    if (urlField) {
        initialUrl = entry[urlField] || entry.frontmatter?.[urlField];
    }
    if (!initialUrl) {
        initialUrl = entry.sourceUrl || entry.frontmatter?.sourceUrl;
    }

    // States
    const [currentUrl, setCurrentUrl] = useState(initialUrl);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [showFind, setShowFind] = useState(false);
    const [findText, setFindText] = useState('');
    const [findResult, setFindResult] = useState<{ active?: number; matches?: number }>({});

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const updateNavigationState = () => {
            if (webview) {
                try {
                    setCurrentUrl(webview.getURL());
                    setCanGoBack(webview.canGoBack());
                    setCanGoForward(webview.canGoForward());
                } catch (e) {
                    // getURL might fail if webview is not ready
                }
            }
        };

        const handleDomReady = () => {
            updateNavigationState();
            // Inject highlighter script
            webview.executeJavaScript(`
                function highlightRange(range, id) {
                    const newNode = document.createElement("span");
                    newNode.style.cssText = "background-color: #facc15 !important; color: black !important; display: inline !important; border-bottom: 2px solid #eab308 !important;";
                    newNode.className = "codex-highlight";
                    if (id) newNode.setAttribute('data-highlight-id', id);
                    try { 
                        range.surroundContents(newNode); 
                    } catch (e) {
                        const content = range.extractContents();
                        newNode.appendChild(content);
                        range.insertNode(newNode);
                    }
                }

                function getXPath(node) {
                    if (!node) return '';
                    if (node.id) return 'id("' + node.id + '")';
                    if (node === document.body) return node.tagName;
                    var ix = 0;
                    var siblings = node.parentNode ? node.parentNode.childNodes : [];
                    for (var i = 0; i < siblings.length; i++) {
                        var sibling = siblings[i];
                        if (sibling === node) return getXPath(node.parentNode) + '/' + node.tagName + '[' + (ix + 1) + ']';
                        if (sibling.nodeType === 1 && sibling.tagName === node.tagName) ix++;
                    }
                }

                function getContext(range, length = 30) {
                    const startContainer = range.startContainer;
                    const endContainer = range.endContainer;
                    let prefix = '', suffix = '';
                    if (startContainer.nodeType === 3) prefix = startContainer.textContent.substring(Math.max(0, range.startOffset - length), range.startOffset);
                    if (endContainer.nodeType === 3) suffix = endContainer.textContent.substring(range.endOffset, Math.min(endContainer.textContent.length, range.endOffset + length));
                    return { prefix, suffix };
                }

                function restoreHighlight(h) {
                    let range = null;
                    if (h.position?.xpath) {
                         try {
                             const startNode = document.evaluate(h.position.xpath.start, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                             const endNode = document.evaluate(h.position.xpath.end, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                             if (startNode && endNode) {
                                  const r = document.createRange();
                                  r.setStart(startNode.firstChild || startNode, h.position.startOffset);
                                  r.setEnd(endNode.firstChild || endNode, h.position.endOffset);
                                  range = r;
                             }
                         } catch (e) {}
                    }
                    if (range) highlightRange(range, h.id);
                }

                document.addEventListener('mouseup', (e) => {
                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
                         const existingBtn = document.getElementById('codex-highlight-btn');
                         if (existingBtn) existingBtn.remove();
                         return;
                    }
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const existingBtn = document.getElementById('codex-highlight-btn');
                    if (existingBtn) existingBtn.remove();

                    const btn = document.createElement('button');
                    btn.id = 'codex-highlight-btn';
                    btn.textContent = 'Highlight';
                    btn.style.cssText = "position: fixed; top: " + (rect.top - 40) + "px; left: " + rect.left + "px; z-index: 2147483647; padding: 6px 12px; background: #facc15; color: black; border: 1px solid #eab308; border-radius: 4px; cursor: pointer; font-weight: bold;";
                    btn.onclick = (e) => {
                        const id = 'hl-' + Date.now();
                        const { prefix, suffix } = getContext(range);
                        highlightRange(range, id);
                        console.log(JSON.stringify({
                            type: 'text-highlighted',
                            id: id,
                            text: selection.toString(),
                            xpath: { start: getXPath(range.startContainer.parentElement), end: getXPath(range.endContainer.parentElement) },
                            startOffset: range.startOffset, endOffset: range.endOffset, context: { prefix, suffix }
                        }));
                        window.getSelection().removeAllRanges();
                        btn.remove();
                    };
                    document.body.appendChild(btn);
                });
            `);

            webview.addEventListener('console-message', (e) => {
                try {
                    const msg = JSON.parse(e.message);
                    if (msg.type === 'text-highlighted' && onHighlightAdd) {
                        onHighlightAdd({
                            id: msg.id, type: 'text',
                            content: { text: msg.text, context: msg.context },
                            position: { xpath: msg.xpath, startOffset: msg.startOffset, endOffset: msg.endOffset }
                        });
                    }
                } catch (err) { }
            });

            if (highlights) {
                webview.executeJavaScript(`const hls = ${JSON.stringify(highlights)}; hls.forEach(h => restoreHighlight(h));`);
            }
        };

        const handleNavigate = () => {
            updateNavigationState();
        };

        const handleFoundInPage = (e: any) => {
            const { activeMatchOrdinal, matches } = e.result;
            setFindResult({ active: activeMatchOrdinal, matches });
        };

        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('did-navigate', handleNavigate);
        webview.addEventListener('did-navigate-in-page', handleNavigate);
        webview.addEventListener('found-in-page', handleFoundInPage);

        return () => {
            webview.removeEventListener('dom-ready', handleDomReady);
            webview.removeEventListener('did-navigate', handleNavigate);
            webview.removeEventListener('did-navigate-in-page', handleNavigate);
            webview.removeEventListener('found-in-page', handleFoundInPage);
        };
    }, [initialUrl, onHighlightAdd, highlights]);

    const handleFind = (forward = true) => {
        if (!findText) {
            webviewRef.current?.stopFindInPage('clearSelection');
            setFindResult({});
            return;
        }
        webviewRef.current?.findInPage(findText, { forward, findNext: true });
    };

    if (!initialUrl) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                <Icon name="Link" size={48} className="mb-4 opacity-50" />
                <p>No Source URL provided for this entry.</p>
                <p className="text-xs mt-2">Edit metadata to add a URL.</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-background flex flex-col">
            {/* Header / Navigation Bar */}
            <div className="p-2 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => webviewRef.current?.goBack()}
                        disabled={!canGoBack}
                        className="p-1.5 hover:bg-muted disabled:opacity-30 rounded-md text-muted-foreground transition-colors"
                        title="Back"
                    >
                        <Icon name="ChevronLeft" size={16} />
                    </button>
                    <button
                        onClick={() => webviewRef.current?.goForward()}
                        disabled={!canGoForward}
                        className="p-1.5 hover:bg-muted disabled:opacity-30 rounded-md text-muted-foreground transition-colors"
                        title="Forward"
                    >
                        <Icon name="ChevronRight" size={16} />
                    </button>
                    <button
                        onClick={() => webviewRef.current?.reload()}
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                        title="Reload"
                    >
                        <Icon name="RefreshCw" size={16} />
                    </button>
                    <div className="w-px h-4 bg-border/50 mx-1" />
                    <button
                        onClick={() => {
                            if (webviewRef.current) {
                                webviewRef.current.src = initialUrl;
                                setCurrentUrl(initialUrl);
                            }
                        }}
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                        title="Reset to Original URL"
                    >
                        <Icon name="Home" size={16} />
                    </button>
                    <button
                        onClick={() => {
                            setShowFind(!showFind);
                            if (showFind) {
                                webviewRef.current?.stopFindInPage('clearSelection');
                                setFindResult({});
                            }
                        }}
                        className={`p-1.5 rounded-md transition-colors ${showFind ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                        title="Find in Page"
                    >
                        <Icon name="Search" size={16} />
                    </button>
                </div>

                <div className="flex-1 mx-4 overflow-hidden bg-background/50 border border-border/50 px-2 py-1 rounded text-[10px] text-muted-foreground truncate font-mono">
                    {currentUrl}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => window.open(currentUrl, '_blank')}
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                        title="Open Current Page in Browser"
                    >
                        <Icon name="ExternalLink" size={16} />
                    </button>
                </div>
            </div>

            {/* Find in Page Bar */}
            {showFind && (
                <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="relative flex-1 max-w-sm">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Find in page..."
                            className="w-full bg-background border border-border rounded px-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={findText}
                            onChange={(e) => setFindText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFind(!e.shiftKey);
                                if (e.key === 'Escape') {
                                    setShowFind(false);
                                    webviewRef.current?.stopFindInPage('clearSelection');
                                }
                            }}
                        />
                        <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                    </div>

                    {findResult.matches !== undefined && findResult.matches > 0 && (
                        <span className="text-[10px] text-muted-foreground font-medium px-2">
                            {findResult.active} / {findResult.matches}
                        </span>
                    )}

                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => handleFind(false)}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                            title="Previous match"
                        >
                            <Icon name="ChevronUp" size={14} />
                        </button>
                        <button
                            onClick={() => handleFind(true)}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                            title="Next match"
                        >
                            <Icon name="ChevronDown" size={14} />
                        </button>
                        <button
                            onClick={() => {
                                setShowFind(false);
                                webviewRef.current?.stopFindInPage('clearSelection');
                                setFindResult({});
                            }}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground ml-1"
                            title="Close"
                        >
                            <Icon name="X" size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 relative">
                <webview
                    ref={webviewRef}
                    src={initialUrl}
                    className="h-full w-full"
                    // @ts-ignore
                    allowpopups="true"
                />
            </div>
        </div>
    );
};
