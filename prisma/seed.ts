import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function tomorrowBirthday() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function unlockDate(mmdd: string) {
  const [month, day] = mmdd.split("-").map(Number);
  return new Date(new Date().getFullYear(), month - 1, day, 0, 0, 0, 0);
}

async function main() {
  const birthday = tomorrowBirthday();
  const user = await prisma.user.upsert({
    where: { email: "test@joydrop.test" },
    update: {
      birthday_mm_dd: birthday,
      paused_bool: false,
      soft_delete: false
    },
    create: {
      name: "Test User",
      email: "test@joydrop.test",
      birthday_mm_dd: birthday,
      timezone: "America/Los_Angeles"
    }
  });

  await prisma.birthdayPage.upsert({
    where: {
      userId: user.id
    },
    update: {
      unlockAt: unlockDate(birthday),
      isLocked: true,
      soft_delete: false
    },
    create: {
      userId: user.id,
      unlockAt: unlockDate(birthday)
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
