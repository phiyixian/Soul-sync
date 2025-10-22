'use client';

import Image from 'next/image';

export default function TestShopImages() {
  const shopItems = [
    {
      id: "plushie",
      name: "Cute Plushie",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Fplushie.png?alt=media&token=59ea1046-e3f1-4538-a0d0-0ef1652454c5"
    },
    {
      id: "lamp",
      name: "Heart Lamp", 
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Flamp.png?alt=media&token=64b08ed5-24b7-4630-be86-531080e6390a"
    },
    {
      id: "plant",
      name: "Potted Plant",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Fplant.png?alt=media&token=dd5cf497-c64b-4e34-8fa8-6a33381c68b0"
    },
    {
      id: "rug",
      name: "Heart Rug",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Frug.png?alt=media&token=cb093ea0-e87e-4fdb-84af-e41e8b6abf4d"
    }
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test Shop Images</h1>
      <p className="text-muted-foreground mb-6">
        Testing if your Firebase Storage images load correctly
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        {shopItems.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{item.name}</h3>
            <div className="aspect-square bg-gray-100 rounded relative">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-contain p-2"
                onError={(e) => {
                  console.error('Image failed to load:', item.imageUrl);
                  e.currentTarget.src = 'https://via.placeholder.com/200x200/FF0000/FFFFFF?text=Error';
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', item.name);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{item.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
