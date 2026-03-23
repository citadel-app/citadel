export interface TextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Detect if items on a page are laid out in 2 columns.
 * Returns the column split X coordinate, or null if single-column.
 */
export function detectColumnSplit(items: TextItem[], pageW: number): number | null {
    if (items.length < 10) return null;

    const midX = pageW / 2;
    const gap = pageW * 0.05; // 5% gap tolerance around center

    let leftCount = 0;
    let rightCount = 0;

    for (const item of items) {
        const cx = item.x + item.width / 2;
        if (cx < midX - gap) leftCount++;
        else if (cx > midX + gap) rightCount++;
    }

    // If both sides have substantial content, it's likely 2-column
    const total = items.length;
    if (leftCount > total * 0.25 && rightCount > total * 0.25) {
        return midX;
    }
    return null;
}

/**
 * Sort items for reading order, respecting 2-column layouts.
 * For 2-column: read left column top-to-bottom, then right column top-to-bottom.
 * For single-column: top-to-bottom, left-to-right.
 */
export function sortForReadingOrder(items: TextItem[], pageW: number): TextItem[] {
    const split = detectColumnSplit(items, pageW);

    if (split !== null) {
        // 2-column: partition into left and right
        const left: TextItem[] = [];
        const right: TextItem[] = [];
        for (const item of items) {
            const cx = item.x + item.width / 2;
            if (cx < split) left.push(item);
            else right.push(item);
        }

        const sortColumn = (col: TextItem[]) => {
            col.sort((a, b) => {
                const yDiff = Math.abs(a.y - b.y);
                if (yDiff < 5) return a.x - b.x;
                return b.y - a.y; // Descending Y for top-to-bottom
            });
        };

        sortColumn(left);
        sortColumn(right);
        return [...left, ...right];
    }

    // Single column: standard sort
    items.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff < 5) return a.x - b.x;
        return b.y - a.y;
    });
    return items;
}
