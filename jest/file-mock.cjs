// Image/font imports (public/ assets, ImageKit URLs) resolve to a string in
// Vite; Jest needs a stub that is also a string so `src={url}` keeps working.
module.exports = "test-file-stub";