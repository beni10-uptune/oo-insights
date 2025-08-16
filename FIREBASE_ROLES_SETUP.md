# Firebase Role-Based Access Control Setup

## Overview

The app now uses Firebase Authentication + Firestore for complete role-based access control with the following hierarchy:

### User Roles

1. **ADMIN** 
   - Full system access
   - Can manage all users
   - Access to all markets
   - Can edit all content

2. **TEAM_EUCAN**
   - Access to all markets
   - Can edit content
   - Cannot manage users

3. **TEAM_LOCAL**
   - Access to specific assigned markets only
   - Can view content for their markets
   - Cannot edit or manage users

4. **USER**
   - Read-only access
   - Limited to assigned markets
   - Default role for new users

## Setup Instructions

### Step 1: Enable Firestore

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Firestore Database** in the left menu
4. Click **Create database**
5. Choose **Production mode**
6. Select your region (preferably same as your app: `europe-west1`)

### Step 2: Deploy Security Rules

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select **Firestore**
   - Use existing project
   - Keep default rules file name

3. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Step 3: Set Up Your Admin Account

When you first sign in with `ben@mindsparkdigitallabs.com`, you'll automatically be created as an ADMIN.

### Step 4: Access Admin Panel

1. Sign in to the app
2. Navigate to `/admin/firebase-users`
3. You can now:
   - Add new users
   - Assign roles
   - Set market access for TEAM_LOCAL users
   - Activate/deactivate users

## Managing Users

### Adding a New User

1. Go to Admin Panel (`/admin/firebase-users`)
2. Click "Add User"
3. Enter:
   - **Email**: User's email address
   - **Name**: Full name
   - **Password**: Initial password (minimum 6 characters)
   - **Role**: Select appropriate role
   - **Markets**: (For TEAM_LOCAL only) Select accessible markets

### Modifying User Access

1. Click Edit (pencil icon) next to user
2. Change:
   - **Role**: Update their permission level
   - **Markets**: Modify market access
   - **Status**: Active/Inactive
3. Click Save

### Removing User Access

- **Soft Delete**: Set user to "Inactive" status
- **Hard Delete**: Click delete icon (removes Firestore profile but not Firebase Auth)

## Market Access Control

### Core Markets (Priority)
- UK
- Italy
- Spain
- France
- Germany
- Poland
- Canada

### Secondary Markets
- Belgium (NL/FR)
- Switzerland (DE/FR/IT)
- Netherlands
- Austria
- Portugal
- Nordic countries (SE, DK, NO, FI)

## How It Works

### Authentication Flow

1. User signs in via Firebase Auth (Google or Email/Password)
2. System checks for Firestore user profile
3. If no profile exists:
   - Creates one with USER role (except for initial admin)
4. Loads user profile with role and permissions
5. App UI adapts based on role

### Permission Checking

```javascript
// In your components
const { userProfile, isAdmin, canManageUsers, accessibleMarkets } = useAuth();

// Check if user can access a market
if (accessibleMarkets.includes('UK')) {
  // Show UK data
}

// Check if user is admin
if (isAdmin) {
  // Show admin features
}
```

### Data Access Rules

The Firestore rules automatically enforce:
- Users can only read their own profile
- Admins can read/write all profiles
- Market data access based on role and assigned markets
- Audit logging for compliance

## Security Benefits

✅ **Complete isolation** from your database - auth is 100% Firebase
✅ **Granular permissions** - Control access at document level
✅ **Real-time updates** - Changes take effect immediately
✅ **Audit trail** - All actions can be logged
✅ **No SQL injection** - No direct database access
✅ **Built-in rate limiting** - Firebase handles abuse prevention

## Troubleshooting

### User can't sign in
- Check Firebase Authentication > Users
- Verify user exists and is not disabled
- Check Firestore > users collection for profile

### User has wrong permissions
- Check their role in Firestore > users > [userId]
- Verify `active` field is `true`
- For TEAM_LOCAL, check `markets` array

### Admin panel not accessible
- Verify user role is `ADMIN` in Firestore
- Check browser console for errors
- Ensure Firestore rules are deployed

## Environment Variables Required

```env
# Firebase Configuration (all NEXT_PUBLIC)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Optional: For server-side operations
FIREBASE_SERVICE_ACCOUNT_KEY=
```

## Next Steps

1. Add Firebase config to `.env.local`
2. Deploy to Vercel with environment variables
3. Sign in as admin
4. Start adding team members!

The system is now fully configured for role-based access control with Firebase!