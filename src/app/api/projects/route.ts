import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { organization_id, name, description, website_url, git_provider, git_repo_url, git_default_branch, atlassian_project_key, atlassian_base_url, front_office_url, back_office_url } = body;

    if (!organization_id || !name) {
      return NextResponse.json({ error: "Organization ID et nom requis" }, { status: 400 });
    }

    const serviceSupabase = await createServiceRoleSupabase();

    // Verify user is a member of the org
    const { data: membership } = await serviceSupabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Accès non autorisé à cette organisation" }, { status: 403 });
    }

    // Create the project
    const { data: project, error: projectError } = await serviceSupabase
      .from("projects")
      .insert({
        organization_id,
        name,
        description: description || null,
        website_url: website_url || null,
        git_provider: git_provider || null,
        git_repo_url: git_repo_url || null,
        git_default_branch: git_default_branch || "main",
        atlassian_project_key: atlassian_project_key || null,
        atlassian_base_url: atlassian_base_url || null,
        front_office_url: front_office_url || null,
        back_office_url: back_office_url || null,
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    return NextResponse.json({ project });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID requis" }, { status: 400 });
    }

    const serviceSupabase = await createServiceRoleSupabase();

    // Get project to find org
    const { data: project } = await serviceSupabase
      .from("projects")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    // Verify membership
    const { data: membership } = await serviceSupabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", project.organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role === "viewer") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { data: updated, error: updateError } = await serviceSupabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ project: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID requis" }, { status: 400 });
    }

    const serviceSupabase = await createServiceRoleSupabase();

    // Get project to find org
    const { data: project } = await serviceSupabase
      .from("projects")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    // Only admins can delete
    const { data: membership } = await serviceSupabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", project.organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Seuls les admins peuvent supprimer un projet" }, { status: 403 });
    }

    const { error: deleteError } = await serviceSupabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
