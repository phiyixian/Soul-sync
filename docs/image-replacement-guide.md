# Image Replacement Guide

This guide explains how to replace placeholder images with real pixel art images for the SoulSync app.

## Current Status-Based Image System

The app now shows different images based on your partner's status:
- **Sleeping**: Shows sleeping placeholder image instead of avatar
- **Eating**: Shows eating placeholder image instead of avatar  
- **Showering**: Shows showering placeholder image instead of avatar
- **Idle/Studying**: Shows the partner's custom avatar (if available)

## Fixed Image Access Issues

✅ **Problem Solved**: Shop items now load from Firestore with your actual images
✅ **Error Handling**: Added fallback error images if any image fails to load
✅ **Dynamic Loading**: Shop items are fetched from Firestore on page load
✅ **Firestore Integration**: Uses the `shopItems` collection for all shop data

## Shop Items (Firestore Integration)

The shop now loads items dynamically from Firestore instead of hardcoded data:

### Firestore Structure
Shop items are stored in the `shopItems` collection with this structure:
```json
{
  "id": "plushie",
  "name": "Cute Plushie", 
  "price": 100,
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/shop%2Fplushie.png?alt=media"
}
```

### How to Add Your Images

1. **Upload to Firebase Storage**:
   - Go to Firebase Console → Storage
   - Create a `shop` folder
   - Upload your images: `plushie.png`, `lamp.png`, `plant.png`, `rug.png`

2. **Get Public URLs**:
   - Right-click each image in Firebase Storage
   - Copy the download URL
   - Replace `YOUR_PROJECT_ID` with your actual project ID

3. **Seed the Data**:
   - Use the admin page at `/admin/shop` 
   - Or run the seeding script in `scripts/seed-shop-items.ts`

## Image Locations

### Status Images
Status images are defined in `src/lib/placeholder-images.json`:

```json
{
  "id": "avatar-sleeping",
  "description": "Pixel art character sleeping in a bed.",
  "imageUrl": "https://picsum.photos/seed/sleeping/300/400",
  "imageHint": "pixel art sleeping character in bed"
}
```

### Shop Item Images
Shop items are also in `src/lib/placeholder-images.json`:

```json
{
  "id": "shop-plushie", 
  "description": "A cute pixel art plushie toy.",
  "imageUrl": "https://picsum.photos/seed/plushie/200/200",
  "imageHint": "pixel art toy"
}
```

## How to Replace with Real Images

### Option 1: Direct URL Replacement (Recommended)

1. **Host your images** on a public CDN or image hosting service:
   - Firebase Storage (with public access)
   - Cloudinary
   - AWS S3 (with public bucket)
   - GitHub (for small images)

2. **Update the imageUrl** in `src/lib/placeholder-images.json`:

```json
{
  "id": "avatar-sleeping",
  "description": "Pixel art character sleeping in a bed.",
  "imageUrl": "https://your-cdn.com/images/sleeping-character.png",
  "imageHint": "pixel art sleeping character in bed"
}
```

### Option 2: Local Images (For Development)

1. **Add images** to `public/images/` directory:
   ```
   public/
     images/
       status/
         sleeping.png
         eating.png
         showering.png
         studying.png
         idle.png
       shop/
         plushie.png
         lamp.png
         plant.png
         rug.png
   ```

2. **Update imageUrl** to use local paths:
   ```json
   {
     "id": "avatar-sleeping",
     "imageUrl": "/images/status/sleeping.png"
   }
   ```

### Option 3: Firebase Storage Integration

1. **Upload images** to Firebase Storage
2. **Make them publicly accessible** by updating Firebase Storage rules:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /images/{allPaths=**} {
         allow read: if true; // Public read access
       }
     }
   }
   ```

3. **Get the public URL** from Firebase Console and update the JSON

## Image Specifications

### Status Images
- **Size**: 300x400 pixels (3:4 aspect ratio)
- **Format**: PNG (for transparency support)
- **Style**: Pixel art characters
- **Content**: Character performing the specific activity

### Shop Item Images  
- **Size**: 200x200 pixels (square)
- **Format**: PNG (for transparency support)
- **Style**: Pixel art items
- **Content**: The specific item being sold

## Example Real Image URLs

Here are examples of how to structure your image URLs:

```json
{
  "id": "avatar-sleeping",
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/images%2Fstatus%2Fsleeping.png?alt=media",
  "imageHint": "pixel art sleeping character in bed"
},
{
  "id": "shop-plushie",
  "imageUrl": "https://your-cdn.com/shop-items/plushie.png",
  "imageHint": "pixel art toy"
}
```

## Testing Your Changes

1. **Update the JSON file** with your new image URLs
2. **Restart the development server** (`npm run dev`)
3. **Test different statuses** by changing your status in the app
4. **Verify shop items** display correctly in the shop page

## Troubleshooting

### Images Not Loading
- Check that URLs are publicly accessible
- Verify the URL format is correct
- Check browser console for CORS errors

### Firebase Storage Access Issues
- Ensure Storage rules allow public read access
- Check that the URL includes the correct token parameters
- Verify the bucket name in the URL matches your project

### Image Quality Issues
- Ensure images are the correct dimensions
- Use PNG format for best quality with transparency
- Optimize file sizes for web delivery

## Next Steps

Once you have your real images ready:

1. Replace all placeholder URLs in `src/lib/placeholder-images.json`
2. Test thoroughly across all statuses and shop items
3. Consider adding more status types (working, gaming, etc.)
4. Add more shop items with their own images
5. Implement image caching for better performance

The system is designed to be flexible - you can easily add new statuses or shop items by adding entries to the JSON file and updating the corresponding TypeScript types in `src/lib/data.ts`.
