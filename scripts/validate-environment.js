// Environment validation for CI pipeline
// Exits with code 1 if environment is invalid

const required = [
  'NODE_ENV',
  'APP_ENV'
];

const allowedNodeEnv = ['test'];
const allowedAppEnv = ['ci'];

let hasError = false;

for (const variable of required) {
  if (!process.env[variable]) {
    console.error(`❌ Missing required environment variable: ${variable}`);
    hasError = true;
  }
}

if (process.env.NODE_ENV && !allowedNodeEnv.includes(process.env.NODE_ENV)) {
  console.error(`❌ Invalid NODE_ENV: "${process.env.NODE_ENV}". Must be one of: ${allowedNodeEnv.join(', ')}`);
  hasError = true;
}

if (process.env.APP_ENV && !allowedAppEnv.includes(process.env.APP_ENV)) {
  console.error(`❌ Invalid APP_ENV: "${process.env.APP_ENV}". Must be one of: ${allowedAppEnv.join(', ')}`);
  hasError = true;
}

// Verify test database configuration (MongoMemoryServer will be used)
if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('production')) {
  console.error('❌ TEST environment cannot connect to production database');
  hasError = true;
}

// Verify CI mode
if (process.env.CI !== 'true') {
  console.error('❌ CI must be set to "true"');
  hasError = true;
}

if (hasError) {
  console.error('\n❌ Environment validation failed');
  process.exit(1);
}

console.log('✅ Environment validation passed');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   APP_ENV: ${process.env.APP_ENV}`);
console.log(`   CI: ${process.env.CI}`);
console.log(`   E2E_API_PORT: ${process.env.E2E_API_PORT || '8081'}`);
console.log(`   E2E_FRONTEND_PORT: ${process.env.E2E_FRONTEND_PORT || '5273'}`);
console.log(`   E2E_ADMIN_PORT: ${process.env.E2E_ADMIN_PORT || '5274'}`);