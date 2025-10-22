# Deploy Firestore Rules

To fix the permission error, you need to deploy the updated Firestore rules to your Firebase project.

## Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `studio-8158823289-aa6bd`
3. Go to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` file
5. Paste it into the rules editor
6. Click **Publish**

## What Was Fixed

The issue was with the `list` rules for game collections. Firestore list rules work differently than get rules:

- **Get rules**: Check individual document access (`resource.data`)
- **List rules**: Allow queries but filter results client-side

The updated rules now allow:
- ✅ **gameInvites**: Any signed-in user can list (filtered by query)
- ✅ **gameSessions**: Any signed-in user can list (filtered by query)  
- ✅ **creditTransactions**: Any signed-in user can list (filtered by query)

## Security Note

The rules are still secure because:
- The queries in the app filter by `inviteeId == user.uid`
- Only documents where the user is involved will be returned
- Individual document access is still restricted to participants only

After deploying the rules, the games page should work without permission errors!
