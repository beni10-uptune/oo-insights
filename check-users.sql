-- Connect to production database and check users
-- Run with: psql <connection-string> < check-users.sql

SELECT 
  email,
  name,
  role,
  password IS NOT NULL as has_password,
  "createdAt"
FROM "User"
ORDER BY "createdAt";
