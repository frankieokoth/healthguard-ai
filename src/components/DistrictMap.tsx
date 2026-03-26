import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface MapPoint {
  id: string;
  x: number;
  y: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  label: string;
}

export default function DistrictMap({ points }: { points: MapPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;

    // Draw a stylized district boundary (abstract)
    const districtPath = "M100,100 C150,50 250,50 300,100 C350,150 350,250 300,300 C250,350 150,350 100,300 C50,250 50,150 100,100 Z";
    
    svg.append("path")
      .attr("d", districtPath)
      .attr("fill", "#f1f5f9")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2)
      .attr("transform", "scale(1.5) translate(50, 20)");

    // Add grid lines
    for (let i = 0; i <= width; i += 50) {
      svg.append("line")
        .attr("x1", i).attr("y1", 0).attr("x2", i).attr("y2", height)
        .attr("stroke", "#f1f5f9").attr("stroke-width", 1);
    }
    for (let i = 0; i <= height; i += 50) {
      svg.append("line")
        .attr("x1", 0).attr("y1", i).attr("x2", width).attr("y2", i)
        .attr("stroke", "#f1f5f9").attr("stroke-width", 1);
    }

    // Add points
    const nodes = svg.selectAll(".node")
      .data(points)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x}, ${d.y})`);

    nodes.append("circle")
      .attr("r", d => d.severity === 'critical' ? 12 : 8)
      .attr("fill", d => {
        if (d.severity === 'critical') return "#ef4444";
        if (d.severity === 'high') return "#f97316";
        return "#3b82f6";
      })
      .attr("class", d => d.severity === 'critical' ? "animate-pulse" : "");

    nodes.append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#64748b")
      .text(d => d.label);

  }, [points]);

  return (
    <div className="w-full h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative data-grid">
      <svg ref={svgRef} viewBox="0 0 600 400" className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">District Hotspots</p>
      </div>
    </div>
  );
}
