import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

/** Erase (soft-delete) the signed-in user's own account and content. */
async function eraseOwnAccount() {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      firebaseUid: session.uid,
      soft_delete: false
    }
  });

  // Cards this login claimed are removed too (message and file link cleared).
  const cards = await prisma.card.updateMany({
    where: { claimedByUid: session.uid, status: { not: "deleted" } },
    data: { status: "deleted", message: "", mediaUrl: null, mediaType: null }
  });

  // Cards this login sent are taken off its dashboard (the cards themselves stay
  // with the birthday person; the sender can delete them first if they want).
  const sent = await prisma.card.updateMany({
    where: { senderUid: session.uid },
    data: { senderUid: null }
  });

  if (!existingUser) {
    if (cards.count > 0 || sent.count > 0) {
      return Response.json({ erased: true });
    }
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: {
      id: existingUser.id
    },
    data: {
      soft_delete: true,
      contributions: {
        updateMany: {
          where: {},
          data: {
            soft_delete: true
          }
        }
      },
      surprises: {
        updateMany: {
          where: {},
          data: {
            soft_delete: true
          }
        }
      },
      audit_logs: {
        updateMany: {
          where: {},
          data: {
            soft_delete: true
          }
        }
      },
      guestbook: {
        updateMany: {
          where: {},
          data: {
            soft_delete: true
          }
        }
      },
      gifts: {
        updateMany: {
          where: {},
          data: {
            soft_delete: true
          }
        }
      }
    }
  });

  await prisma.birthdayPage.updateMany({
    where: {
      userId: user.id
    },
    data: {
      soft_delete: true
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "user_erased",
      user_id: user.id,
      soft_delete: true
    }
  });

  return Response.json({ erased: true });
}

export async function DELETE() {
  return eraseOwnAccount();
}

/** HTML form fallback for the dashboard "Erase my data" button. */
export async function POST(request: Request) {
  // Sign-in is checked before anything else, so anonymous callers always get 401.
  if (!(await getCurrentFirebaseUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (String(formData?.get("confirm") ?? "") !== "on") {
    return Response.json({ error: "Tick the confirmation box to erase your data." }, { status: 400 });
  }

  const response = await eraseOwnAccount();
  if (response.ok && wantsHtml(request)) {
    return seeOther(request, "/?erased=1");
  }
  return response;
}
