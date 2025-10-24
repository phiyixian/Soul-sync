// Quote of the Day Component for LDR Couples
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Quote, Sparkles } from 'lucide-react';

interface QuoteData {
  text: string;
  emoji: string;
}

const LDR_QUOTES: QuoteData[] = [
  { text: "Distance means nothing when someone means everything 💕", emoji: "💕" },
  { text: "True love doesn't mean being inseparable; it means being separated and nothing changes ✨", emoji: "✨" },
  { text: "The best love is the kind that awakens the soul and makes us reach for more 🌟", emoji: "🌟" },
  { text: "Distance is just a test to see how far love can travel 🚀", emoji: "🚀" },
  { text: "Love knows no distance; it has no continent; its eyes are for the stars 🌙", emoji: "🌙" },
  { text: "Every mile between us is just another reason to love you more 💝", emoji: "💝" },
  { text: "The best relationships are built on trust, patience, and understanding 💫", emoji: "💫" },
  { text: "Distance is not an obstacle; it's a reminder of how strong our love is 💪", emoji: "💪" },
  { text: "Love is not about being perfect together; it's about being perfectly imperfect together 💖", emoji: "💖" },
  { text: "The heart has no distance; it beats for you no matter where you are 💓", emoji: "💓" },
  { text: "True love is when you can't sleep because reality is finally better than your dreams 🌈", emoji: "🌈" },
  { text: "Distance teaches us to appreciate the moments we have together 🕰️", emoji: "🕰️" },
  { text: "Love is the bridge that connects two hearts across any distance 🌉", emoji: "🌉" },
  { text: "Every day apart is one day closer to being together again ⏰", emoji: "⏰" },
  { text: "The best love stories are written with patience and trust 📖", emoji: "📖" },
  { text: "Love is not about finding the perfect person, but about seeing an imperfect person perfectly 👁️", emoji: "👁️" },
  { text: "Distance is just a word; love is everything 💌", emoji: "💌" },
  { text: "The strongest relationships are built on trust, communication, and endless love 💬", emoji: "💬" },
  { text: "Love is not about how much you say 'I love you', but how much you prove it's true 💯", emoji: "💯" },
  { text: "Every sunset brings us closer to the day we'll be together again 🌅", emoji: "🌅" },
  { text: "True love is when you can't imagine your life without them, even from miles away 🗺️", emoji: "🗺️" },
  { text: "Distance is temporary, but love is forever ♾️", emoji: "♾️" },
  { text: "The best relationships are those where you can be yourself and still be loved unconditionally 🎭", emoji: "🎭" },
  { text: "Love is not about being together every moment; it's about being together in every moment 💭", emoji: "💭" },
  { text: "Every text, call, and video chat is a love letter written across the miles 📱", emoji: "📱" },
  { text: "The best love stories don't have endings; they have new beginnings 🌱", emoji: "🌱" },
  { text: "Distance is just a test to see how far love can travel and how strong it can grow 🌱", emoji: "🌱" },
  { text: "Love is not about finding someone to live with; it's about finding someone you can't live without 🏠", emoji: "🏠" },
  { text: "Every day apart is a day closer to forever together 💍", emoji: "💍" },
  { text: "The best relationships are built on trust, respect, and endless support 🤝", emoji: "🤝" }
];

export const QuoteOfTheDay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [todayQuote, setTodayQuote] = useState<QuoteData | null>(null);

  // Generate quote of the day based on current date
  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % LDR_QUOTES.length;
    setTodayQuote(LDR_QUOTES[quoteIndex]);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsClicked(true);
    }
  };

  if (!todayQuote) return null;

  return (
    <div className="relative">
      {/* Quote Button - only show if not clicked */}
      {!isClicked && (
        <Button
          onClick={handleToggle}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200 hover:from-pink-100 hover:to-purple-100 transition-all duration-300 hover:scale-105"
        >
          <Quote className="h-4 w-4 text-pink-600" />
          <span className="text-pink-700 font-medium">Quote of the Day</span>
          <Sparkles className="h-3 w-3 text-purple-500" />
        </Button>
      )}

      {/* Quote Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200 shadow-2xl animate-in fade-in zoom-in duration-300 mx-auto">
            <CardContent className="p-6 text-center">
              {/* Close Button */}
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>

              {/* Quote Content */}
              <div className="space-y-4">
                {/* Quote Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center">
                    <Heart className="h-8 w-8 text-pink-600" />
                  </div>
                </div>

                {/* Quote Text */}
                <div className="space-y-3">
                  <p className="text-lg font-medium text-gray-800 leading-relaxed">
                    "{todayQuote.text}"
                  </p>
                  
                  {/* Decorative Elements */}
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent"></div>
                    <span className="text-2xl">{todayQuote.emoji}</span>
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
                  </div>
                </div>

                {/* Motivational Footer */}
                <div className="pt-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Stay strong, stay connected 💪
                  </p>
                </div>

                {/* Close Button */}
                <Button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium transition-all duration-300 hover:scale-105"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Keep Loving
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
