create policy "scorm covers are publicly readable"
on storage.objects
for select
to public
using (
  bucket_id = 'media-assets'
  and (storage.foldername(name))[1] = 'scorm-covers'
);