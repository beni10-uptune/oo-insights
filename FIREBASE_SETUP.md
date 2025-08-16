# Firebase Authentication Setup Guide

## Step 1: Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password**
   - Enable **Google** provider
   - Add your domain to **Authorized domains**: 
     - `oo.mindsparkdigitallabs.com`
     - `localhost` (for development)

## Step 2: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click **Add app** → **Web app** (</> icon)
4. Register your app with a nickname (e.g., "OO Insights")
5. Copy the Firebase configuration object

## Step 3: Add Environment Variables

Add these to your `.env.local` file (for development) and Vercel environment variables (for production):

```env
# Firebase Config (from Step 2)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Optional: Firebase Admin SDK (for server-side operations)
# Go to Project Settings → Service Accounts → Generate new private key
# Convert the JSON to a single line string
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

## Step 4: Configure Firebase Security Rules

In Firebase Console → Firestore Database → Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin-only collections (if needed)
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## Step 5: Add Users in Firebase

### Option A: Firebase Console (Manual)
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email and password
4. User can now sign in

### Option B: Custom Claims for Roles (Advanced)
Use Firebase Admin SDK to set custom claims:

```javascript
// This would go in a server-side admin script
const admin = require('firebase-admin');

// Set custom claims for a user
admin.auth().setCustomUserClaims(uid, {
  admin: true,
  role: 'ADMIN'
});
```

## Step 6: Deploy to Vercel

1. Add all `NEXT_PUBLIC_FIREBASE_*` variables to Vercel:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add each variable for Production environment

2. Deploy:
   ```bash
   npx vercel --prod
   ```

## Managing Users

With Firebase Authentication:
- **Add users**: Firebase Console → Authentication → Users → Add user
- **Reset passwords**: Users can use "Forgot password" or you can trigger from console
- **Disable users**: Toggle user status in Firebase Console
- **View sign-ins**: Authentication → Users shows last sign-in time
- **Set roles**: Use custom claims (requires Admin SDK)

## Security Benefits

✅ **No database exposure** - Authentication handled entirely by Firebase
✅ **Built-in security** - Google's infrastructure and security
✅ **MFA support** - Can enable multi-factor authentication
✅ **Session management** - Automatic token refresh and validation
✅ **Rate limiting** - Built-in protection against brute force
✅ **Email verification** - Optional email verification flow

## Troubleshooting

- **"auth/configuration-not-found"**: Check Firebase project settings
- **"auth/invalid-api-key"**: Verify NEXT_PUBLIC_FIREBASE_API_KEY
- **"auth/unauthorized-domain"**: Add domain to Firebase authorized domains
- **Google sign-in not working**: Enable Google provider in Firebase Console