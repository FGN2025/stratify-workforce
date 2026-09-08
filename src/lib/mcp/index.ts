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
import listCourses from "./tools/list-courses";
import getCourse from "./tools/get-course";
import upsertCourse from "./tools/upsert-course";
import upsertLesson from "./tools/upsert-lesson";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-academy-mcp",
  title: "FGN Academy",
  version: "0.4.0",
  instructions:
    "Tools for the FGN Academy workforce training platform. Read the signed-in user's profile, work orders, community memberships, tenants, games catalog, industry SIM categories, challenges, courses and skill passport — and, for admins, create or update communities, SIM categories, work orders, courses, lessons and quizzes for a specific community. All calls run as the authenticated user under row-level security.",
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
    listSimCategories,
    listCourses,
    getCourse,
    createCommunity,
    updateCommunity,
    upsertSimCategory,
    upsertWorkOrder,
    upsertCourse,
    upsertLesson,
  ],
});
