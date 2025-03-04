import type { VillageMember } from "@db/schema";

interface Position {
  x: number;
  y: number;
  angle: number;
}

const MIN_ANGLE_DISTANCE = (2 * Math.PI) / 36; // Minimum 10 degrees between members

export function distributeMembers(members: VillageMember[]): Map<number, Position> {
  const positions = new Map<number, Position>();
  const membersByCircle = new Map<number, VillageMember[]>();

  // Group members by circle
  members.forEach(member => {
    const circle = member.circle;
    if (!membersByCircle.has(circle)) {
      membersByCircle.set(circle, []);
    }
    membersByCircle.get(circle)?.push(member);
  });

  // Calculate positions for each circle
  membersByCircle.forEach((circleMembers, circle) => {
    const baseRadius = 80 * circle;
    const count = circleMembers.length;
    const angleStep = (2 * Math.PI) / Math.max(count, 1);

    // Sort members by their current angle to minimize movement
    circleMembers.sort((a, b) => {
      const angleA = parseFloat(a.positionAngle?.toString() || "0");
      const angleB = parseFloat(b.positionAngle?.toString() || "0");
      return angleA - angleB;
    });

    // Distribute members evenly
    circleMembers.forEach((member, index) => {
      const currentAngle = parseFloat(member.positionAngle?.toString() || "0");
      const targetAngle = index * angleStep;
      
      // Use the current angle if it's not too close to others, otherwise use target
      const finalAngle = isAngleAvailable(currentAngle, positions, baseRadius) 
        ? currentAngle 
        : targetAngle;

      positions.set(member.id, {
        x: Math.cos(finalAngle) * baseRadius,
        y: Math.sin(finalAngle) * baseRadius,
        angle: finalAngle
      });
    });
  });

  return positions;
}

function isAngleAvailable(angle: number, positions: Map<number, Position>, radius: number): boolean {
  for (const pos of positions.values()) {
    if (Math.abs(pos.angle - angle) < MIN_ANGLE_DISTANCE && Math.abs(radius - Math.hypot(pos.x, pos.y)) < 40) {
      return false;
    }
  }
  return true;
}

export function findOptimalPosition(
  circle: number,
  existingPositions: Position[]
): Position {
  const baseRadius = 80 * circle;
  let bestAngle = 0;
  let maxMinDistance = 0;

  // Check 36 possible positions (every 10 degrees)
  for (let i = 0; i < 36; i++) {
    const angle = (i * Math.PI * 2) / 36;
    const pos = {
      x: Math.cos(angle) * baseRadius,
      y: Math.sin(angle) * baseRadius,
      angle
    };

    let minDistance = Infinity;
    for (const existing of existingPositions) {
      const distance = Math.hypot(pos.x - existing.x, pos.y - existing.y);
      minDistance = Math.min(minDistance, distance);
    }

    if (minDistance > maxMinDistance) {
      maxMinDistance = minDistance;
      bestAngle = angle;
    }
  }

  return {
    x: Math.cos(bestAngle) * baseRadius,
    y: Math.sin(bestAngle) * baseRadius,
    angle: bestAngle
  };
}
