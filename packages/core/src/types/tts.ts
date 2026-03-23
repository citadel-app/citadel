export interface TtsSentence {
    text: string;
    page: number;
    // Overall bounding box (used for seek/scroll)
    box: { x: number; y: number; width: number; height: number };
    // Per-line rects for accurate multi-line highlighting
    rects: Array<{ x: number; y: number; width: number; height: number }>;
}
