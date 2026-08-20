import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [countResult, dataResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("projects")
        .select("id, chat_id, name, type, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    const totalCount = countResult.count ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return NextResponse.json({
      projects: dataResult.data ?? [],
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, name, type } = body;

    if (!chatId || !name) {
      return NextResponse.json(
        { error: "chatId and name are required" },
        { status: 400 }
      );
    }

    const projectType = type === "Web App" ? "Web App" : "Website";

    // Check if project already exists for this chat (avoid duplicates)
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("chat_id", chatId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing project
      const { data, error } = await supabase
        .from("projects")
        .update({ name, type: projectType, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id, chat_id, name, type, created_at, updated_at")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to update project" },
          { status: 500 }
        );
      }

      return NextResponse.json({ project: data });
    }

    // Create new project
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        chat_id: chatId,
        name,
        type: projectType,
      })
      .select("id, chat_id, name, type, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 }
    );
  }
}
