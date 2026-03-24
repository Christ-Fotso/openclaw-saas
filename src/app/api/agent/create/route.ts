import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { UserRepository } from "@/lib/repositories/user.repository";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, description } = await req.json();

    const dbUser = await UserRepository.findByClerkId(clerkUserId);
    if (!dbUser) {
      return new NextResponse("User not found in DB", { status: 404 });
    }

    // Agent Creation
    // Mark it active since Stripe Step 5 was already completed
    const agent = await prisma.agent.create({
      data: {
        name: name || "Myk Agent 23",
        description: description || "",
        isActive: true,
        userId: dbUser.id,
      }
    });

    return NextResponse.json({ agent });

  } catch (error) {
    console.error("[AGENT_CREATE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
