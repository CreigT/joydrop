import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const firebaseUser = await getCurrentFirebaseUser();
  const page = await prisma.birthdayPage.findUnique({
    where: {
      userId: params.userId
    },
    include: {
      user: true
    }
  });

  if (!firebaseUser || !page || page.user.firebaseUid !== firebaseUser.uid) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");

  if (action === "allow-search") {
    await prisma.birthdayPage.update({
      where: {
        userId: params.userId
      },
      data: {
        isPublic: true,
        soft_delete: false
      }
    });
  }

  if (action === "pause") {
    await prisma.birthdayPage.update({
      where: {
        userId: params.userId
      },
      data: {
        isPublic: false,
        soft_delete: true
      }
    });
  }

  if (action === "delete") {
    await prisma.$transaction([
      prisma.contribution.updateMany({
        where: {
          user_id: params.userId
        },
        data: {
          soft_delete: true
        }
      }),
      prisma.surprise.updateMany({
        where: {
          user_id: params.userId
        },
        data: {
          soft_delete: true
        }
      }),
      prisma.birthdayPage.update({
        where: {
          userId: params.userId
        },
        data: {
          soft_delete: true,
          isPublic: false
        }
      })
    ]);
  }

  redirect(`/birthday/${params.userId}`);
}
