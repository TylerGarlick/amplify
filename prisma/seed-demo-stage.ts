import { PrismaClient } from "../src/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding demo stage for AR demo...");

  // Get the demo musician
  const musician = await prisma.musician.findFirst({
    where: { displayName: "Demo Musician" },
  });

  if (!musician) {
    console.log("Demo musician not found. Run seed.ts first.");
    return;
  }

  // Create demo stage at current location (will be overridden by user's GPS in demo mode)
  const stage = await prisma.stage.create({
    data: {
      musicianId: musician.id,
      name: "🎵 Demo Stage",
      description: "Audio-reactive AR visualization demo. Tap to experience!",
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
      radius: 100, // Large radius so it's always "in range" in demo mode
      isActive: true,
      isPublic: true,
    },
  });
  console.log("Demo stage created:", stage.name);

  // Create audio-reactive visualization
  const viz = await prisma.visualization.create({
    data: {
      stageId: stage.id,
      name: "Bass Pulse",
      type: "PARTICLE_SYSTEM",
      configJson: JSON.stringify({
        count: 500,
        color: "#8b5cf6",
        size: 0.08,
        speed: 2.0,
        spread: 3,
        lifetime: 2,
        emitRate: 200,
      }),
      reactToFrequency: "bass",
      reactIntensity: 2.0,
      isVisible: true,
    },
  });
  console.log("Visualization created:", viz.name);

  // Create second visualization for variety
  const viz2 = await prisma.visualization.create({
    data: {
      stageId: stage.id,
      name: "Treble Waves",
      type: "WAVEFORM_RIBBON",
      configJson: JSON.stringify({
        color: "#06b6d4",
        width: 0.5,
        amplitude: 1.5,
        frequency: 0.5,
      }),
      reactToFrequency: "treble",
      reactIntensity: 1.5,
      isVisible: true,
    },
  });
  console.log("Second visualization created:", viz2.name);

  console.log("\n✅ Demo stage ready! Navigate to /ar/demo to experience.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
