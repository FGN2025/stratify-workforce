// Readable tenant columns for signed-in users. Contact/HQ address columns are
// column-restricted, so `select('*')` on tenants is refused (42501).
export const TENANT_COLUMNS =
  'id,name,slug,brand_color,logo_url,created_at,game_titles,category_type,description,cover_image_url,website_url,location,is_verified,member_count,owner_id,parent_tenant_id,hierarchy_level,approval_status,reviewed_by,reviewed_at,reviewer_notes,submitted_at,play_tenant_id,play_synced_at,logo_dark_url,favicon_url,og_image_url,accent_color,font_heading,font_body,nav_app_name,support_email,terms_url,privacy_url,tagline,scorm_destinations,industries,setup_completed_at,setup_step';
