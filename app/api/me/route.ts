import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.toLowerCase();

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: {
      email
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
