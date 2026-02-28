import { supabase } from '@/services/supabase';

const BRANDING_BUCKET = 'branding';
const BRANDING_LOGO_PATH = 'logo.png';

export function getBrandLogoUrl() {
  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(BRANDING_LOGO_PATH);
  if (!data?.publicUrl) return null;

  // Bust cache when app is reopened so logo swaps appear quickly.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export const brandConfig = {
  bucket: BRANDING_BUCKET,
  logoPath: BRANDING_LOGO_PATH
};
