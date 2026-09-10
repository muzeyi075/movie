# Cinemora deployment notes

Copy `.env.example` to `.env.local` and configure MongoDB plus Backblaze B2 before starting the app. The first database request creates the required indexes and seeds the starter catalog if the `movies` collection is empty.

## Media uploads

The admin screen requests a short-lived Backblaze S3 upload URL, uploads the file directly from the browser, then saves the resulting public URL on the movie. Posters accept JPEG, PNG, and WebP up to 10 MB. Videos accept MP4, WebM, and MOV up to 5 GB.

Set `B2_PUBLIC_URL` to a public bucket or CDN origin. Private premium media needs signed playback delivery, which has intentionally not been added because subscriptions and authentication are out of scope.

## Production checklist

- Use separate MongoDB databases and Backblaze buckets for staging and production.
- Restrict Backblaze CORS to the deployed application origin.
- Add an admin authorization layer before exposing `/admin` or `/api/admin/*` publicly.
- Configure MongoDB backups, monitoring, and an alert for upload/API failures.
- Run `npm run test` and `npm run build` in CI.
