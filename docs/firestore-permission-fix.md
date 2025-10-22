# 🔥 Firestore Permission Error Fix

## ❌ **Current Error**
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

## 🎯 **Root Cause**
The Firestore security rules haven't been deployed to Firebase yet. The local `firestore.rules` file has the correct permissive rules for testing, but Firebase is still using the old restrictive rules.

## ✅ **Solution: Deploy Updated Rules**

### **Option 1: Firebase CLI (Recommended)**

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy only the Firestore rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### **Option 2: Firebase Console (Manual)**

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `studio-8158823289-aa6bd`
3. **Navigate to**: **Firestore Database** → **Rules**
4. **Copy the contents** of your local `firestore.rules` file
5. **Paste and Publish** the rules

## 📋 **Current Rules (Temporary for Testing)**

The current rules are permissive for testing purposes:

```javascript
// Game Invites - Temporary permissive rules for testing
match /gameInvites/{inviteId} {
  allow read, write: if isSignedIn();
}

// Game Sessions - Temporary permissive rules for testing
match /gameSessions/{sessionId} {
  allow read, write: if isSignedIn();
}

// Credit Transactions - Temporary permissive rules for testing
match /creditTransactions/{transactionId} {
  allow read, write: if isSignedIn();
}
```

## 🚀 **After Deploying Rules**

1. **Restart development servers**:
   ```bash
   npm run dev
   npx next dev --turbopack -p 9003
   ```

2. **Test the games page** - permission errors should be resolved

3. **Test multiplayer functionality** with two accounts

## ⚠️ **Important Security Note**

These rules are **temporary and permissive** for testing only. Before deploying to production, you should:

1. **Restore secure rules** that check user ownership
2. **Test thoroughly** with proper security
3. **Deploy production-ready rules**

## 🔧 **Production-Ready Rules (For Later)**

When ready for production, replace the permissive rules with:

```javascript
// Game Invites - Production rules
match /gameInvites/{inviteId} {
  allow get: if isSignedIn() && (
    resource.data.inviterId == request.auth.uid ||
    resource.data.inviteeId == request.auth.uid
  );
  allow list: if isSignedIn();
  allow create: if isSignedIn() && request.resource.data.inviterId == request.auth.uid;
  allow update: if isSignedIn() && (
    resource.data.inviterId == request.auth.uid ||
    resource.data.inviteeId == request.auth.uid
  );
  allow delete: if isSignedIn() && (
    resource.data.inviterId == request.auth.uid ||
    resource.data.inviteeId == request.auth.uid
  );
}

// Game Sessions - Production rules
match /gameSessions/{sessionId} {
  allow get: if isSignedIn() && (
    resource.data.player1Id == request.auth.uid ||
    resource.data.player2Id == request.auth.uid
  );
  allow list: if isSignedIn();
  allow create: if isSignedIn() && (
    request.resource.data.player1Id == request.auth.uid ||
    request.resource.data.player2Id == request.auth.uid
  );
  allow update: if isSignedIn() && (
    resource.data.player1Id == request.auth.uid ||
    resource.data.player2Id == request.auth.uid
  );
  allow delete: if false; // Games should not be deleted
}

// Credit Transactions - Production rules
match /creditTransactions/{transactionId} {
  allow get: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow list: if isSignedIn();
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  allow update: if false;
  allow delete: if false;
}
```

## 🎮 **Testing Checklist**

After deploying rules:

- [ ] Games page loads without permission errors
- [ ] Can create game invites
- [ ] Can view incoming invites
- [ ] Can accept/decline invites
- [ ] Real-time updates work
- [ ] Multiplayer games function properly

---

**Next Step**: Deploy the Firestore rules using one of the methods above, then restart the development servers to test the multiplayer games functionality.
