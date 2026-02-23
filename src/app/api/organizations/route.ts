import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Get the authenticated user from the session
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nom et slug requis" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS for org creation
    const serviceSupabase = await createServiceRoleSupabase();

    // Create the organization
    const { data: org, error: orgError } = await serviceSupabase
      .from("organizations")
      .insert({ name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: orgError.message },
        { status: 400 }
      );
    }

    // Add user as admin
    const { error: memberError } = await serviceSupabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberError) {
      // Rollback org creation
      await serviceSupabase.from("organizations").delete().eq("id", org.id);
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ organization: org });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
