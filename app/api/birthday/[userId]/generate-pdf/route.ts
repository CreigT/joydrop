import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer
} from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

async function buildPdf(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      soft_delete: false
    },
    include: {
      contributions: {
        where: {
          isApproved: true,
          soft_delete: false
        }
      },
      surprises: {
        where: {
          soft_delete: false
        },
        orderBy: {
          scheduled_for: "desc"
        },
        take: 1
      },
      guestbook: {
        where: {
          soft_delete: false
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: { padding: 36, fontSize: 12 } },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: { fontSize: 28, marginBottom: 18 } }, "JoyDrop Memory Book"),
          React.createElement(Text, { style: { fontSize: 18, marginBottom: 12 } }, user.name),
          React.createElement(Text, { style: { marginBottom: 18 } }, user.surprises[0]?.script_text ?? "Your friends' messages are being turned into a surprise..."),
          React.createElement(Text, { style: { fontSize: 16, marginBottom: 8 } }, "Photos and Messages"),
          ...user.contributions.map((contribution) =>
            React.createElement(
              Text,
              { key: contribution.id, style: { marginBottom: 6 } },
              `${contribution.contributor_name}: ${contribution.message_text ?? contribution.type}`
            )
          ),
          React.createElement(Text, { style: { fontSize: 16, marginTop: 18, marginBottom: 8 } }, "Guestbook"),
          ...user.guestbook.map((entry) =>
            React.createElement(
              Text,
              { key: entry.id, style: { marginBottom: 6 } },
              `${entry.name}: ${entry.message}`
            )
          )
        )
      )
    )
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  const firebaseUser = await getCurrentFirebaseUser();
  const user = await prisma.user.findUnique({
    where: {
      id: params.userId
    }
  });

  if (!firebaseUser || !user || user.firebaseUid !== firebaseUser.uid) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pdf = await buildPdf(params.userId);

  if (!pdf) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"joydrop-memory-book.pdf\""
    }
  });
}

export async function POST(
  request: Request,
  context: { params: { userId: string } }
) {
  return GET(request, context);
}
