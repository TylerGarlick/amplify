import { PrismaClient } from "../src/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@amplify.app" },
    update: {},
    create: {
      email: "admin@amplify.app",
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user:", admin.email);

  const musicianPassword = await bcrypt.hash("musician123", 12);
  const musicianUser = await prisma.user.upsert({
    where: { email: "demo@amplify.app" },
    update: {},
    create: {
      email: "demo@amplify.app",
      name: "Demo Musician",
      password: musicianPassword,
      role: "MUSICIAN",
    },
  });
  console.log("Musician user:", musicianUser.email);

  const musician = await prisma.musician.upsert({
    where: { userId: musicianUser.id },
    update: {},
    create: {
      userId: musicianUser.id,
      displayName: "Demo Musician",
      bio: "AR music pioneer and electronic artist.",
      status: "APPROVED",
    },
  });
  console.log("Musician profile:", musician.displayName);

  const stage = await prisma.stage.create({
    data: {
      musicianId: musician.id,
      name: "Demo Stage",
      description: "A sample AR stage in San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
      radius: 50,
      isActive: true,
      isPublic: true,
    },
  });
  console.log("Stage created:", stage.name);

  const viz = await prisma.visualization.create({
    data: {
      stageId: stage.id,
      name: "Particle Burst",
      type: "PARTICLE_SYSTEM",
      configJson: JSON.stringify({ count: 1000, color: "#ff6b6b", size: 0.05, speed: 1.5, spread: 2, lifetime: 3, emitRate: 100 }),
      reactToFrequency: "bass",
      reactIntensity: 1.5,
      isVisible: true,
    },
  });
  console.log("Visualization created:", viz.name);
  console.log("Seeding complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
