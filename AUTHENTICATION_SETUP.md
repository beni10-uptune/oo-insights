# Authentication Setup Guide for OO Insights

## Overview
The application now uses Google OAuth for authentication with role-based access control. Only authorized users can access the application.

## Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `oo-insights-468716`
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application**
6. Configure:
   - **Name**: OO Insights OAuth
   - **Authorized JavaScript origins**:
     - http://localhost:3000 (for development)
     - https://oo.mindsparkdigitallabs.com (for production)
   - **Authorized redirect URIs**:
     - http://localhost:3000/api/auth/callback/google (for development)
     - https://oo.mindsparkdigitallabs.com/api/auth/callback/google (for production)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

#### Local Development (.env.local)
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
INITIAL_ADMIN_EMAILS=ben@mindsparkdigitallabs.com
```

#### Production (Vercel Environment Variables)
Add these in Vercel Dashboard > Settings > Environment Variables:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
INITIAL_ADMIN_EMAILS=ben@mindsparkdigitallabs.com
NEXTAUTH_URL=https://oo.mindsparkdigitallabs.com
NEXTAUTH_SECRET=fr+lYLycT9XY+hOkVEpJDYobdfdpzCNhHQVgD1rk+m4=
```

### 3. User Roles

The system supports these roles:

1. **ADMIN** - Full system access, can manage users
2. **TEAM_EUCAN** - Access to all markets
3. **TEAM_LOCAL** - Access to specific markets only
4. **USER** - Read-only access

### 4. Initial Setup

1. The first admin user(s) are defined in `INITIAL_ADMIN_EMAILS`
2. When ben@mindsparkdigitallabs.com signs in for the first time, an admin account will be created
3. Once logged in as admin, navigate to `/admin/users` to manage other users

### 5. Adding Users

As an admin, you can:
1. Go to `/admin/users`
2. Click "Add User"
3. Enter the user's email address
4. Select their role
5. For TEAM_LOCAL users, select which markets they can access
6. Click "Add User"

The user will then be able to sign in with their Google account using that email address.

## Testing Authentication Locally

1. Make sure your `.env.local` has the Google OAuth credentials
2. Restart the development server: `npm run dev`
3. Navigate to http://localhost:3000
4. You should be redirected to the sign-in page
5. Sign in with your Google account
6. Once authenticated, you'll have access to the application

## Troubleshooting

### "Access Denied" Error
- Your email is not in the authorized users list
- Contact an admin to add your email

### Redirect Loop
- Check that NEXTAUTH_URL matches your current domain
- Ensure NEXTAUTH_SECRET is set correctly
- Verify Google OAuth credentials are correct

### Can't Access Admin Panel
- Only users with ADMIN role can access `/admin/*` routes
- Check your role in the database or ask another admin

## Security Notes

- All API routes are now protected by authentication
- User sessions expire after inactivity
- All user actions are associated with their account
- The database stores minimal user information (email, name, role)