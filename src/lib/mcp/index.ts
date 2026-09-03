import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyWorkOrders from "./tools/list-my-work-orders";
import listMyCommunities from "./tools/list-my-communities";
import listTenants from "./tools/list-tenants";
import listGames from "./tools/list-games";
import listChallenges from "./tools/list-challenges";
import getChallenge from "./tools/get-challenge";
import getPassport from "./tools/get-passport";
import listSimCategories from "./tools/list-sim-categories";
import createCommunity from "./tools/create-community";
import updateCommunity from "./tools/update-community";
import upsertSimCategory from "./tools/upsert-sim-category";
import upsertWorkOrder from "./tools/upsert-work-order";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-academy-mcp",
  title: "FGN Academy",
  version: "0.2.0",
  instructions:
    "Tools for the FGN Academy workforce training platform. Read the signed-in user's profile, work orders, community memberships, tenants, games catalog, challenges, and skill passport. All calls run as the authenticated user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfile,
    listMyCommunities,
    listMyWorkOrders,
    listTenants,
    listGames,
    listChallenges,
    getChallenge,
    getPassport,
  ],
});
