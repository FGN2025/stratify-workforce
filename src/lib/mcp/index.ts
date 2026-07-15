import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyWorkOrders from "./tools/list-my-work-orders";
import listMyCommunities from "./tools/list-my-communities";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-academy-mcp",
  title: "FGN Academy",
  version: "0.1.0",
  instructions:
    "Tools for the FGN Academy workforce training platform. Read the signed-in user's profile, work orders, and community memberships. All calls run as the authenticated user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyWorkOrders, listMyCommunities],
});
