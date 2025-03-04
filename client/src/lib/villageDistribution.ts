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

    // Calculate minimum angle distance based on member size
    const getMinAngleForMember = (member: VillageMember) => {
      const baseDist = MIN_ANGLE_DISTANCE;
      const sizeFactor = member.contactFrequency === 'XL' ? 2 :
                        member.contactFrequency === 'L' ? 1.5 :
                        member.contactFrequency === 'M' ? 1.25 : 1;
      return baseDist * sizeFactor;
    };

    // Distribute members evenly
    circleMembers.forEach((member, index) => {
      let finalAngle: number;
      const currentAngle = parseFloat(member.positionAngle?.toString() || "0");
      const targetAngle = index * angleStep;

      // Try to keep current angle if possible
      if (isAngleAvailable(currentAngle, positions, baseRadius, member)) {
        finalAngle = currentAngle;
      } else {
        // Find the best available angle near the target
        let bestAngle = targetAngle;
        let minConflict = Infinity;

        // Check angles around target to find best fit
        for (let offset = -Math.PI; offset <= Math.PI; offset += MIN_ANGLE_DISTANCE / 2) {
          const testAngle = targetAngle + offset;
          const conflict = getConflictScore(testAngle, positions, baseRadius, member);
          if (conflict < minConflict) {
            minConflict = conflict;
            bestAngle = testAngle;
          }
        }
        finalAngle = bestAngle;
      }

      positions.set(member.id, {
        x: Math.cos(finalAngle) * baseRadius,
        y: Math.sin(finalAngle) * baseRadius,
        angle: finalAngle
      });
    });
  });

  return positions;
}

function isAngleAvailable(
  angle: number, 
  positions: Map<number, Position>, 
  radius: number,
  member: VillageMember
): boolean {
  const minDist = getMemberSize(member) * 30; // Base size * pixel multiplier

  for (const pos of positions.values()) {
    const dist = Math.hypot(
      radius * Math.cos(angle) - pos.x,
      radius * Math.sin(angle) - pos.y
    );
    if (dist < minDist) {
      return false;
    }
  }
  return true;
}

function getMemberSize(member: VillageMember): number {
  switch (member.contactFrequency) {
    case 'XL': return 1.75;
    case 'L': return 1.25;
    case 'M': return 0.875;
    case 'S': return 0.5;
    default: return 0.5;
  }
}

function getConflictScore(
  angle: number, 
  positions: Map<number, Position>, 
  radius: number,
  member: VillageMember
): number {
  let score = 0;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const minDist = getMemberSize(member) * 30;

  for (const pos of positions.values()) {
    const dist = Math.hypot(x - pos.x, y - pos.y);
    if (dist < minDist) {
      score += (minDist - dist) / minDist;
    }
  }
  return score;
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