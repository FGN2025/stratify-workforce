import { useState, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Image, Upload, X, Loader2 } from 'lucide-react';

export function TenantMediaSettings() {
  const { tenant } = useTenant();
  const { uploadFile } = useMediaLibrary();
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadFile.mutateAsync({
        file,
        folder: 'logos',
      });
      setLogoUrl(url);
      toast({
        title: 'Logo uploaded',
        description: 'Your logo has been uploaded. Click Save to apply.',
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: logoUrl || null })
        .eq('id', tenant.id);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your organization logo has been updated.',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. You may need admin permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLogo = () => {
    setLogoUrl('');
  };

  if (!tenant) {
    return (
      <Card className="glass-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          <CardTitle>Media Assets</CardTitle>
        </div>
        <CardDescription>
          Manage your organization's branded images and media
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Organization Logo</Label>
          <div className="flex items-start gap-4">
            {/* Logo Preview */}
            <div className="relative flex-shrink-0">
              <div className="h-24 w-24 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Organization logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              {logoUrl && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={handleClearLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo-url" className="text-xs text-muted-foreground">
                  Or enter a URL directly
                </Label>
                <Input
                  id="logo-url"
                  placeholder="https://..."
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="max-w-md"
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 200x200px. PNG or SVG for best quality.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Media Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
