import { prisma } from "@/lib/prisma";

// Configuration
const INFLUENCE_ROLLING_WINDOW_DAYS = 7;
const MIN_WATCH_DURATION_SECONDS = 60; // Must watch for 60s to count
const ENHANCEMENT_MULTIPLIER = 2.0;

// Types
interface InfluenceScores {
  [tribeId: string]: number;
}

interface TribeLeaderboardEntry {
  tribeId: string;
  tribeName: string;
  tribeColor: string;
  territoryCount: number;
  totalInfluence: number;
}

// ─────────────────────────────────────────
// TERRITORY OWNERSHIP LOGIC
// ─────────────────────────────────────────

/**
 * Calculate tribe influence at a territory based on watch time over rolling window
 */
export async function calculateTerritoryInfluence(territoryId: string): Promise<InfluenceScores> {
  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
    include: {
      watchSessions: {
        where: {
          lastWatched: {
            gte: new Date(Date.now() - INFLUENCE_ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000),
          },
          counted: true,
        },
      },
      stage: {
        include: {
          enhancements: {
            where: { status: "APPROVED" },
          },
        },
      },
    },
  });

  if (!territory) return {};

  const scores: InfluenceScores = {};

  // Group watch sessions by user and tribe
  for (const watch of territory.watchSessions) {
    const member = await prisma.tribeMember.findFirst({
      where: { userId: watch.userId },
      include: { tribe: true },
    });

    if (!member) continue;

    let multiplier = 1.0;
    
    // Check if territory is enhanced by this tribe
    if (territory.isEnhanced && territory.enhancedByTribeId === member.tribeId) {
      multiplier = ENHANCEMENT_MULTIPLIER;
    }
    
    // Check for active enhancement at this location
    for (const enhancement of territory.stage.enhancements) {
      if (enhancement.tribeId === member.tribeId && enhancement.status === "APPROVED") {
        multiplier = enhancement.multiplier;
        break;
      }
    }

    const tribeId = member.tribeId;
    scores[tribeId] = (scores[tribeId] || 0) + watch.watchTimeSeconds * multiplier;
  }

  return scores;
}

/**
 * Update territory ownership based on current influence
 * Returns true if ownership changed
 */
export async function updateTerritoryOwnership(territoryId: string): Promise<boolean> {
  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
  });

  if (!territory) return false;

  const influenceScores = await calculateTerritoryInfluence(territoryId);
  
  // Find tribe with highest influence
  let highestTribeId: string | null = null;
  let highestScore = 0;

  for (const [tribeId, score] of Object.entries(influenceScores)) {
    if (score > highestScore) {
      highestScore = score;
      highestTribeId = tribeId;
    }
  }

  const previousOwnerId = territory.owningTribeId;
  const ownershipChanged = highestTribeId !== previousOwnerId;

  await prisma.territory.update({
    where: { id: territoryId },
    data: {
      owningTribeId: highestTribeId,
      influenceJson: JSON.stringify(influenceScores),
      lastCaptureTime: ownershipChanged ? new Date() : territory.lastCaptureTime,
    },
  });

  return ownershipChanged;
}

/**
 * Process a watch session and update influence if minimum duration met
 */
export async function processWatchSession(
  userId: string,
  territoryId: string,
  additionalSeconds: number
): Promise<{ counted: boolean; ownershipChanged: boolean }> {
  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
  });

  if (!territory) {
    throw new Error("Territory not found");
  }

  // Find or create watch session for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let watchSession = await prisma.locationWatch.findFirst({
    where: {
      userId,
      territoryId,
      sessionStart: { gte: today },
    },
  });

  if (watchSession) {
    // Update existing session
    watchSession = await prisma.locationWatch.update({
      where: { id: watchSession.id },
      data: {
        watchTimeSeconds: watchSession.watchTimeSeconds + additionalSeconds,
        lastWatched: new Date(),
      },
    });
  } else {
    // Create new session
    watchSession = await prisma.locationWatch.create({
      data: {
        userId,
        territoryId,
        stageId: territory.stageId,
        watchTimeSeconds: additionalSeconds,
        sessionStart: new Date(),
      },
    });
  }

  // Check if minimum duration now met
  let counted = watchSession.counted;
  let ownershipChanged = false;

  if (!watchSession.counted && watchSession.watchTimeSeconds >= MIN_WATCH_DURATION_SECONDS) {
    // Mark as counted
    await prisma.locationWatch.update({
      where: { id: watchSession.id },
      data: { counted: true },
    });
    counted = true;

    // Update territory ownership
    ownershipChanged = await updateTerritoryOwnership(territoryId);
  } else if (watchSession.counted) {
    // Recalculate influence for this territory
    ownershipChanged = await updateTerritoryOwnership(territoryId);
  }

  return { counted, ownershipChanged };
}

// ─────────────────────────────────────────
// TRIBE LEADERBOARD
// ─────────────────────────────────────────

/**
 * Get tribe leaderboard ranked by total territory owned
 */
export async function getTribeLeaderboard(): Promise<TribeLeaderboardEntry[]> {
  const territories = await prisma.territory.findMany({
    where: { owningTribeId: { not: null } },
    include: {
      owningTribe: true,
    },
  });

  // Group by tribe
  const tribeStats: Map<string, { name: string; color: string; count: number; influence: number }> = new Map();

  for (const territory of territories) {
    if (!territory.owningTribeId || !territory.owningTribe) continue;

    const existing = tribeStats.get(territory.owningTribeId) || {
      name: territory.owningTribe.name,
      color: territory.owningTribe.color,
      count: 0,
      influence: 0,
    };

    existing.count += 1;
    
    // Parse influence scores
    const scores = JSON.parse(territory.influenceJson) as InfluenceScores;
    existing.influence += scores[territory.owningTribeId] || 0;

    tribeStats.set(territory.owningTribeId, existing);
  }

  // Convert to array and sort
  const leaderboard: TribeLeaderboardEntry[] = Array.from(tribeStats.entries()).map(
    ([tribeId, data]) => ({
      tribeId,
      tribeName: data.name,
      tribeColor: data.color,
      territoryCount: data.count,
      totalInfluence: Math.round(data.influence),
    })
  );

  return leaderboard.sort((a, b) => b.territoryCount - a.territoryCount);
}

/**
 * Get detailed influence breakdown for a territory
 */
export async function getTerritoryInfluence(territoryId: string) {
  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
    include: {
      owningTribe: true,
      stage: {
        include: {
          musician: true,
          enhancements: {
            where: { status: "APPROVED" },
            include: { tribe: true },
          },
        },
      },
    },
  });

  if (!territory) return null;

  const influenceScores = JSON.parse(territory.influenceJson) as InfluenceScores;
  
  // Get tribe details for each score
  const breakdown = await Promise.all(
    Object.entries(influenceScores).map(async ([tribeId, score]) => {
      const tribe = await prisma.tribe.findUnique({ where: { id: tribeId } });
      return {
        tribeId,
        tribeName: tribe?.name || "Unknown",
        tribeColor: tribe?.color || "#888888",
        influence: Math.round(score),
        isOwner: tribeId === territory.owningTribeId,
      };
    })
  );

  return {
    id: territory.id,
    name: territory.name,
    latitude: territory.latitude,
    longitude: territory.longitude,
    isEnhanced: territory.isEnhanced,
    enhancedByTribe: territory.enhancedByTribeId,
    owningTribe: territory.owningTribe
      ? {
          id: territory.owningTribe.id,
          name: territory.owningTribe.name,
          color: territory.owningTribe.color,
        }
      : null,
    lastCaptureTime: territory.lastCaptureTime,
    stage: {
      id: territory.stage.id,
      name: territory.stage.name,
      musician: territory.stage.musician.displayName,
    },
    enhancements: territory.stage.enhancements.map((e) => ({
      tribeId: e.tribeId,
      tribeName: e.tribe.name,
      multiplier: e.multiplier,
    })),
    breakdown: breakdown.sort((a, b) => b.influence - a.influence),
  };
}

// ─────────────────────────────────────────
// LOCATION ENHANCEMENT
// ─────────────────────────────────────────

/**
 * Apply to enhance a location (musician feature)
 */
export async function applyForEnhancement(stageId: string, tribeId: string) {
  // Check if there's already a pending application
  const existing = await prisma.locationEnhancement.findFirst({
    where: {
      stageId,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new Error("Already has pending enhancement application");
  }

  return prisma.locationEnhancement.create({
    data: {
      stageId,
      tribeId,
      status: "PENDING",
    },
  });
}

/**
 * Approve a location enhancement
 */
export async function approveEnhancement(enhancementId: string) {
  const enhancement = await prisma.locationEnhancement.findUnique({
    where: { id: enhancementId },
  });

  if (!enhancement) {
    throw new Error("Enhancement not found");
  }

  // Update enhancement status
  await prisma.locationEnhancement.update({
    where: { id: enhancementId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
    },
  });

  // Update territory
  await prisma.territory.updateMany({
    where: { stageId: enhancement.stageId },
    data: {
      isEnhanced: true,
      enhancedByTribeId: enhancement.tribeId,
    },
  });

  // Recalculate ownership
  const territory = await prisma.territory.findFirst({
    where: { stageId: enhancement.stageId },
  });

  if (territory) {
    await updateTerritoryOwnership(territory.id);
  }
}

// ─────────────────────────────────────────
// TRIBE MANAGEMENT
// ─────────────────────────────────────────

/**
 * Create a new tribe (fan-created)
 */
export async function createTribe(
  name: string,
  genre: string,
  color: string,
  description?: string,
  userId?: string
) {
  const tribe = await prisma.tribe.create({
    data: {
      name,
      genre,
      color,
      description,
      isOfficial: false,
    },
  });

  // If user provided, make them a leader
  if (userId) {
    await prisma.tribeMember.create({
      data: {
        userId,
        tribeId: tribe.id,
        role: "LEADER",
      },
    });
  }

  return tribe;
}

/**
 * Join a tribe
 */
export async function joinTribe(userId: string, tribeId: string) {
  // Check if user already in a tribe
  const existingMember = await prisma.tribeMember.findFirst({
    where: { userId },
  });

  if (existingMember) {
    // Switch tribes
    await prisma.tribeMember.update({
      where: { id: existingMember.id },
      data: { tribeId },
    });
  } else {
    await prisma.tribeMember.create({
      data: {
        userId,
        tribeId,
        role: "MEMBER",
      },
    });
  }
}

/**
 * Get user's current tribe
 */
export async function getUserTribe(userId: string) {
  const membership = await prisma.tribeMember.findFirst({
    where: { userId },
    include: { tribe: true },
  });

  return membership?.tribe || null;
}

/**
 * Get all available tribes
 */
export async function getAllTribes() {
  return prisma.tribe.findMany({
    orderBy: [{ isOfficial: "desc" }, { name: "asc" }],
  });
}

/**
 * Initialize default official tribes
 */
export async function seedDefaultTribes() {
  const defaultTribes = [
    { name: "Electronic", genre: "Electronic", color: "#00FFFF", description: "Electronic music enthusiasts" },
    { name: "Rock", genre: "Rock", color: "#FF4444", description: "Rock music fans" },
    { name: "Hip-Hop", genre: "Hip-Hop", color: "#FF9900", description: "Hip-hop community" },
    { name: "Jazz", genre: "Jazz", color: "#9966FF", description: "Jazz lovers" },
    { name: "Classical", genre: "Classical", color: "#FFD700", description: "Classical music purists" },
    { name: "Pop", genre: "Pop", color: "#FF69B4", description: "Pop music fans" },
    { name: "Indie", genre: "Indie", color: "#32CD32", description: "Indie music scene" },
    { name: "Metal", genre: "Metal", color: "#8B0000", description: "Metal community" },
    { name: "R&B", genre: "R&B", color: "#8B4513", description: "R&B soulful sounds" },
    { name: "Ambient", genre: "Ambient", color: "#4169E1", description: "Ambient & experimental" },
  ];

  for (const tribe of defaultTribes) {
    await prisma.tribe.upsert({
      where: { name: tribe.name },
      update: {},
      create: {
        ...tribe,
        isOfficial: true,
      },
    });
  }
}