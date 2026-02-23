"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  profile: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useOrganization() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load user's organizations
  useEffect(() => {
    if (!user) return;

    const loadOrgs = async () => {
      const { data } = await supabase
        .from("organization_members")
        .select(`
          role,
          organizations (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq("user_id", user.id);

      if (data) {
        const orgs = data.map((d: any) => ({
          id: d.organizations.id,
          name: d.organizations.name,
          slug: d.organizations.slug,
          logo_url: d.organizations.logo_url,
          role: d.role,
        }));
        setOrganizations(orgs);
        if (orgs.length > 0 && !currentOrg) {
          setCurrentOrg(orgs[0]);
        }
      }
      setLoading(false);
    };

    loadOrgs();
  }, [user, supabase, currentOrg]);

  // Load members when current org changes
  useEffect(() => {
    if (!currentOrg) return;

    const loadMembers = async () => {
      const { data } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          role,
          profiles (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("organization_id", currentOrg.id);

      if (data) {
        setMembers(
          data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            role: d.role,
            profile: d.profiles,
          }))
        );
      }
    };

    loadMembers();
  }, [currentOrg, supabase]);

  const inviteMember = async (email: string, role: "member" | "viewer" = "member") => {
    // In MVP, we just return info — real invite would send email
    // For now, the admin adds users by their user_id after they sign up
    return { email, role, message: "L'utilisateur doit d'abord créer un compte." };
  };

  return {
    organizations,
    currentOrg,
    setCurrentOrg,
    members,
    loading,
    inviteMember,
    isAdmin: currentOrg?.role === "admin",
  };
}
