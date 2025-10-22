# Multiplayer Game Testing Guide

## 🎮 **Two-Instance Testing Setup**

You now have two development servers running for testing multiplayer games:

### **Server Instances**
- **Instance 1**: `http://localhost:9002` (Port 9002)
- **Instance 2**: `http://localhost:9003` (Port 9003)

### **How to Test Multiplayer Games**

#### **Step 1: Open Two Browser Windows**
1. **Window 1**: Open `http://localhost:9002` in Chrome/Edge
2. **Window 2**: Open `http://localhost:9003` in Firefox/Safari (or incognito mode)

#### **Step 2: Create Two Different Accounts**
1. **Account 1** (Port 9002):
   - Register/Login with email: `user1@test.com`
   - Complete profile setup
   - Note the username

2. **Account 2** (Port 9003):
   - Register/Login with email: `user2@test.com`
   - Complete profile setup
   - Note the username

#### **Step 3: Link the Accounts**
1. **From Account 1**: Go to Profile → Link Partner
2. **Enter Account 2's username** and send invite
3. **From Account 2**: Accept the partner request
4. **Verify**: Both accounts should show as "Linked"

#### **Step 4: Test Game Invitations**
1. **From Account 1**: Go to Games page (`/home/games`)
2. **Click "Invite to Tic-Tac-Toe"**
3. **Check Account 2**: Should see the game invite appear
4. **From Account 2**: Click "Accept" on the invite

#### **Step 5: Play the Game**
1. **Both accounts** should be redirected to the game session
2. **Take turns** making moves
3. **Verify** that moves appear in real-time on both screens
4. **Complete the game** and check credit rewards

### **Quick Commands**

#### **Start Both Servers**
```bash
npm run dev:both
```

#### **Start Individual Servers**
```bash
# Server 1 (Port 9002)
npm run dev

# Server 2 (Port 9003) 
npm run dev:test
```

#### **Stop All Servers**
```bash
taskkill /F /IM node.exe
```

### **Testing Checklist**

- [ ] **Account Creation**: Both accounts can register/login
- [ ] **Partner Linking**: Accounts can link as partners
- [ ] **Game Invites**: Invites appear in real-time
- [ ] **Game Acceptance**: Invites can be accepted
- [ ] **Real-time Sync**: Game moves sync between players
- [ ] **Turn Management**: Only current player can make moves
- [ ] **Win Detection**: Game correctly detects wins/draws
- [ ] **Credit Rewards**: Credits are awarded after games
- [ ] **Multiple Games**: Can play multiple games in sequence

### **Troubleshooting**

#### **Permission Errors**
- The Firestore rules have been temporarily made permissive for testing
- If you still get errors, check browser console for details

#### **Real-time Issues**
- Make sure both browser windows are active
- Check that both accounts are properly linked
- Verify Firebase connection in both instances

#### **Game State Issues**
- Refresh both pages if game state gets out of sync
- Check Firestore console to see if data is being written

### **Production Notes**

⚠️ **Important**: The current Firestore rules are permissive for testing only. Before deploying to production, you should:

1. **Restore secure rules** that check user ownership
2. **Test thoroughly** with proper security
3. **Deploy rules** to Firebase: `firebase deploy --only firestore:rules`

### **Next Steps**

Once basic testing works:
1. **Test different game types** (Memory Match, Word Guess)
2. **Test edge cases** (network disconnection, page refresh)
3. **Test credit system** thoroughly
4. **Implement proper security rules**
5. **Add more game features** (chat, spectating, etc.)

Happy testing! 🎮
