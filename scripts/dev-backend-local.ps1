# Start the backend with localhost CORS origins.
#
# Why this exists: backend/.env is loaded with dotenv({override: false}), so any
# FRONTEND_URL / ADMIN_URL / CORS_ALLOWED_ORIGINS / NODE_ENV already present in
# the terminal's process environment wins over the file. Agents and some shells
# inject production values, which makes the local admin panel fail with
# "Origin not allowed". Setting them here, in the same process that starts Node,
# guarantees the local values win.

$env:NODE_ENV = "development"
$env:FRONTEND_URL = "http://localhost:5173"
$env:ADMIN_URL = "http://localhost:5174"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:5174"
$env:COOKIE_DOMAIN = ""
$env:COOKIE_SECURE = "false"

npm --prefix backend run dev
