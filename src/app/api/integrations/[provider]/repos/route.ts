import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

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

  // Get stored token
  const serviceSupabase = await createServiceRoleSupabase();
  const { data: token } = await serviceSupabase
    .from("integration_tokens")
    .select("access_token, account_name")
    .eq("organization_id", orgId)
    .eq("provider", provider)
    .single();

  if (!token) {
    return NextResponse.json({ error: `${provider} non connecté` }, { status: 404 });
  }

  try {
    let repos: { id: string; name: string; full_name: string; url: string; default_branch: string; private: boolean }[] = [];

    if (provider === "github") {
      // Fetch user repos + org repos
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,organization_member,collaborator", {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/vnd.github+json",
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        repos = data.map((r: any) => ({
          id: r.id.toString(),
          name: r.name,
          full_name: r.full_name,
          url: r.html_url,
          default_branch: r.default_branch || "main",
          private: r.private,
        }));
      }
    } else if (provider === "gitlab") {
      const res = await fetch("https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=updated_at", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        repos = data.map((r: any) => ({
          id: r.id.toString(),
          name: r.name,
          full_name: r.path_with_namespace,
          url: r.web_url,
          default_branch: r.default_branch || "main",
          private: r.visibility === "private",
        }));
      }
    } else if (provider === "bitbucket") {
      const res = await fetch("https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100&sort=-updated_on", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const data = await res.json();
      if (data.values && Array.isArray(data.values)) {
        repos = data.values.map((r: any) => ({
          id: r.uuid,
          name: r.name,
          full_name: r.full_name,
          url: r.links?.html?.href || "",
          default_branch: r.mainbranch?.name || "main",
          private: r.is_private,
        }));
      }
    } else {
      return NextResponse.json({ error: "Ce provider ne supporte pas les repos" }, { status: 400 });
    }

    return NextResponse.json({ repos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur lors du chargement des repos" }, { status: 500 });
  }
}
