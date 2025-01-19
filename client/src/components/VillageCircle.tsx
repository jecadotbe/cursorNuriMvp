import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { VillageMember } from "@db/schema";

interface VillageCircleProps {
  members: VillageMember[];
}

export default function VillageCircle({ members }: VillageCircleProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;

    // Clear previous content
    svg.selectAll("*").remove();

    // Draw concentric circles
    const circles = [5, 4, 3, 2, 1];
    circles.forEach((circle) => {
      const radius = (maxRadius * circle) / 5;
      svg
        .append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "hsl(var(--border))")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
    });

    // Place members
    members.forEach((member) => {
      const angle = parseFloat(member.positionAngle?.toString() || "0");
      const radius = (maxRadius * member.circle) / 5;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const group = svg.append("g").attr("transform", `translate(${x},${y})`);

      // Member dot with size based on contact frequency
      const frequencySize = {
        'XL': 8,
        'L': 6,
        'M': 5,
        'S': 4
      };
      const dotSize = frequencySize[member.contactFrequency || 'M'] || 5;

      // Member dot
      group
        .append("circle")
        .attr("r", dotSize)
        .attr("fill", getColorForCategory(member.category));

      // Member label
      group
        .append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("font-size", "12px")
        .text(member.name);
    });

    // Center family icon
    svg
      .append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", 20)
      .attr("fill", "hsl(var(--primary))");

    svg
      .append("text")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text("Family");
  }, [members]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

// Helper function to get colors based on category
function getColorForCategory(category: "informeel" | "formeel" | "inspiratie" | null) {
  switch (category) {
    case "informeel":
      return "#22c55e"; // Green
    case "formeel":
      return "#3b82f6"; // Blue
    case "inspiratie":
      return "#f59e0b"; // Yellow
    default:
      return "#6b7280"; // Gray
  }
}