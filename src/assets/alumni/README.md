# Alumni image uploads

Add each learner portrait directly in this folder using one of these exact names:

- `anant-shiva.jpg`
- `syed-arif.jpg`
- `anjali-singh.jpg`
- `garima-singh.jpg`
- `shalini-kumari.jpg`
- `aditya-ahlawat.jpg`
- `sneha-agarwal.jpg`

Supported types: `.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, and `.webp`.

The Alumni Spotlight discovers these files automatically. Replace a file to update
that learner's photo; no component or data-file change is required. During local
development Vite reloads the gallery after a file is added or replaced. In a
production deployment, include the new image in the next build and deploy.

## Use a hosted image URL instead

For an image hosted on ImageKit, Cloudinary, or another CDN, edit the matching
`imageUrl` field in `src/data/alumniSpotlight.js`. For example:

```js
id: "syed-arif",
imageUrl: "https://your-cdn.example/syed-arif.jpg",
```

That URL takes priority over any local file in this folder.
