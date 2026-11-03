import { redirect } from "next/navigation";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { birthdayUnlockDate } from "@/lib/dates";
import { isValidBirthdayMmDd, isValidEmail, LIMITS, tooLong } from "@/lib/input";
import { prisma } from "@/lib/prisma";
import { displayNameFromToken, getCurrentFirebaseUser } from "@/lib/session";

export async function POST(request: Request) {
  const firebaseUser = await getCurrentFirebaseUser();

  if (!firebaseUser) {
    redirect("/login?next=/");
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const formData = await request.formData();
  const name = String(formData.get("full_name") ?? "").trim();
  // Use the email from the signed-in account when it has one, so nobody can
  // register a JoyDrop profile under someone else's email address.
  const email = String(firebaseUser.email ?? formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const month = String(formData.get("month") ?? "").trim();
  const day = String(formData.get("day") ?? "").trim();
  const birthday = `${month}-${day}`;
  const consentOne = formData.get("consent_checkbox_1") === "on";
  const consentTwo = formData.get("consent_checkbox_2") === "on";

  if (!name || !email || !birthday || !consentOne || !consentTwo) {
    return Response.json({ error: "Missing required opt-in fields." }, { status: 400 });
  }

  if (tooLong(name, LIMITS.name) || !isValidEmail(email) || !isValidBirthdayMmDd(birthday)) {
    return Response.json({ error: "Check your name, email, and birthday." }, { status: 400 });
  }

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.firebaseUid !== firebaseUser.uid) {
    return Response.json(
      { error: "That email is already linked to a different JoyDrop login." },
      { status: 409 }
    );
  }

  const user = await prisma.user.upsert({
    where: {
      firebaseUid: firebaseUser.uid
    },
    update: {
      name: name || displayNameFromToken(firebaseUser),
      email,
      birthday_mm_dd: birthday,
      paused_bool: false,
      soft_delete: false
    },
    create: {
      firebaseUid: firebaseUser.uid,
      name: name || displayNameFromToken(firebaseUser),
      email,
      birthday_mm_dd: birthday,
      timezone: "America/Los_Angeles",
      birthday_page: {
        create: {
          unlockAt: birthdayUnlockDate(birthday)
        }
      }
    }
  });

  await prisma.birthdayPage.upsert({
    where: {
      userId: user.id
    },
    update: {
      unlockAt: birthdayUnlockDate(birthday),
      soft_delete: false
    },
    create: {
      userId: user.id,
      unlockAt: birthdayUnlockDate(birthday)
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "user_opt_in",
      user_id: user.id,
      meta_json: {
        consent_checkbox_1: consentOne,
        consent_checkbox_2: consentTwo
      }
    }
  });

  redirect(`/thanks?user_id=${user.id}`);
}
