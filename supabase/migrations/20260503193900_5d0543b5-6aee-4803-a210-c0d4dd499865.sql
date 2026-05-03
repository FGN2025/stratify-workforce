update storage.buckets set public = true where id = 'media-assets';
drop policy if exists "scorm covers are publicly readable" on storage.objects;