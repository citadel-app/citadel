import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CodexEntry } from '../lib/db';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../context/AppSettingsContext';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';

interface TagNode extends d3.SimulationNodeDatum {
    id: string;
    count: number;
}

interface TagLink extends d3.SimulationLinkDatum<TagNode> {
    value: number;
}

const TagGraphPage = () => {
    const navigate = useNavigate();
    const { settings } = useAppSettings();
    const isZen = settings?.zenMode;
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const entries = useLiveQuery(async () => {
        const arr = await db.entries.toArray();
        return arr.map(e => ({
            id: e.id,
            title: e.title,
            tags: e.tags,
            type: e.type
        }));
    }) || [];

    const { nodes, links } = useMemo(() => {
        if (!entries) return { nodes: [], links: [] };

        const tagCounts: Record<string, number> = {};
        const coOccurrences: Record<string, number> = {};

        entries.forEach(entry => {
            const tags = entry.tags || [];
            tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });

            for (let i = 0; i < tags.length; i++) {
                for (let j = i + 1; j < tags.length; j++) {
                    const [t1, t2] = [tags[i], tags[j]].sort();
                    const pair = `${t1}---${t2}`;
                    coOccurrences[pair] = (coOccurrences[pair] || 0) + 1;
                }
            }
        });

        const nodes: TagNode[] = Object.entries(tagCounts).map(([id, count]) => ({ id, count }));
        const links: TagLink[] = Object.entries(coOccurrences).map(([pair, value]) => {
            const [source, target] = pair.split('---');
            return { source, target, value };
        });

        return { nodes, links };
    }, [entries]);

    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const width = containerRef.current?.clientWidth || 800;
        const height = containerRef.current?.clientHeight || 600;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g');

        const simulation = d3.forceSimulation<TagNode>(nodes)
            .force('link', d3.forceLink<TagNode, TagLink>(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide<TagNode>().radius(d => Math.sqrt(d.count || 1) * 5 + 10));

        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', 'var(--border)')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.sqrt(d.value) * 2);

        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .enter().append('g')
            .call(d3.drag<SVGGElement, TagNode>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('click', (event, d) => {
                navigate(`/?tag=${encodeURIComponent(d.id)}`);
            });

        node.append('circle')
            .attr('r', d => Math.sqrt(d.count) * 5 + 5)
            .attr('fill', 'var(--primary)')
            .attr('stroke', 'var(--background)')
            .attr('stroke-width', 2);

        node.append('text')
            .text(d => d.id)
            .attr('x', 0)
            .attr('y', d => Math.sqrt(d.count) * 5 + 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', 'var(--foreground)')
            .style('pointer-events', 'none');

        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as TagNode).x!)
                .attr('y1', d => (d.source as TagNode).y!)
                .attr('x2', d => (d.target as TagNode).x!)
                .attr('y2', d => (d.target as TagNode).y!);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Zoom/Pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return () => {
            simulation.stop();
        };
    }, [nodes, links, navigate]);

    const filteredNodes = useMemo(() => {
        if (!searchTerm) return nodes;
        return nodes.filter(n => n.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [nodes, searchTerm]);

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden relative" ref={containerRef}>
            {/* Header / Search */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="relative">
                    <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tags..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                    />
                </div>
            </div>

            <svg ref={svgRef} className="w-full h-full cursor-move" />

            {/* Legend / Overlay */}
            <div className="absolute bottom-4 right-4 p-4 bg-muted/30 backdrop-blur-md border border-border rounded-xl text-xs space-y-1">
                <div className="font-semibold mb-2">Tag Connections</div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Tag (size = frequency)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-[1px] bg-border" />
                    <span>Co-occurrence link</span>
                </div>
            </div>
        </div>
    );
};

export default TagGraphPage;
