import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function DELETE() {
  const session = await getCurrentFirebaseUser();
  const email = session?.email?.toLowerCase();

  if (!session || !email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ firebaseUid: session.uid }, { email }],
      soft_delete: false
    }
  });

  if (!existingUser) {
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
      meta_json: {
        email
      },
      soft_delete: true
    }
  });

  return Response.json({ erased: true });
}
