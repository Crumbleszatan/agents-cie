import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

// List Jira projects for connected Jira integration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (provider !== "jira") {
    return NextResponse.json({ error: "Uniquement pour Jira" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json({ error: "org_id requis" }, { status: 400 });
  }

  const serviceSupabase = await createServiceRoleSupabase();
  const { data: token } = await serviceSupabase
    .from("integration_tokens")
    .select("access_token, account_url")
    .eq("organization_id", orgId)
    .eq("provider", "jira")
    .single();

  if (!token) {
    return NextResponse.json({ error: "Jira non connecté" }, { status: 404 });
  }

  try {
    // First get accessible resources to get cloud ID
    const sitesRes = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/json",
      },
    });
    const sites = await sitesRes.json();

    if (!Array.isArray(sites) || sites.length === 0) {
      return NextResponse.json({ error: "Aucun site Jira accessible" }, { status: 404 });
    }

    const cloudId = sites[0].id;

    // Fetch projects
    const projectsRes = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/json",
        },
      }
    );
    const projectsData = await projectsRes.json();

    const projects = (projectsData.values || []).map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      url: `${token.account_url}/browse/${p.key}`,
      avatar: p.avatarUrls?.["48x48"] || null,
      projectType: p.projectTypeKey,
    }));

    return NextResponse.json({ projects, site: sites[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur Jira" }, { status: 500 });
  }
}
