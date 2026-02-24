import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organization_id, email, role } = body;

    if (!organization_id || !email) {
      return NextResponse.json(
        { error: "organization_id et email requis" },
        { status: 400 }
      );
    }

    if (role && !["member", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Rôle invalide (member ou viewer)" },
        { status: 400 }
      );
    }

    const serviceSupabase = await createServiceRoleSupabase();

    // Verify user is admin of the organization
    const { data: membership } = await serviceSupabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Seuls les admins peuvent inviter des membres" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await serviceSupabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", (
        await serviceSupabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single()
      ).data?.id || "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "Cet utilisateur est déjà membre de l'organisation" },
        { status: 409 }
      );
    }

    // Create the invite record
    const { data: invite, error: inviteError } = await serviceSupabase
      .from("organization_invites")
      .upsert(
        {
          organization_id,
          email: email.toLowerCase().trim(),
          role: role || "member",
          invited_by: user.id,
          status: "pending",
        },
        { onConflict: "organization_id,email" }
      )
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    // Send an invite email via Supabase Auth magic link
    // This creates the user account if they don't have one
    const { error: inviteEmailError } = await serviceSupabase.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim()
    );

    // Ignore "User already registered" — the invite record is what matters
    if (inviteEmailError && !inviteEmailError.message.includes("already been registered")) {
      console.error("Invite email error:", inviteEmailError.message);
      // Don't fail — the invite record is created, user can still be added manually
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
