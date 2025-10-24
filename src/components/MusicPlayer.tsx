'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set up audio properties
    audio.loop = true;
    audio.volume = 0.3; // Lower volume for background music
    audio.preload = 'auto'; // Preload the audio

    // Handle audio events
    const handlePlay = () => {
      console.log('🎵 Music started playing');
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
    };
    
    const handlePause = () => {
      console.log('🎵 Music paused');
      setIsPlaying(false);
      setIsLoading(false);
    };
    
    const handleError = (e: any) => {
      console.error('🎵 Audio error:', e);
      console.log('🎵 Audio error details:', {
        error: e,
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState
      });
      setError('Failed to load music. Please refresh the page.');
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      console.log('🎵 Loading music...');
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      console.log('🎵 Music ready to play');
      setIsLoading(false);
    };

    const handleLoadedData = () => {
      console.log('🎵 Music data loaded');
      setIsLoading(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setIsLoading(true);
      setError(null);
      setHasUserInteracted(true);
      
      if (isPlaying) {
        audio.pause();
      } else {
        console.log('🎵 Attempting to play music...');
        
        // Ensure audio is loaded
        if (audio.readyState < 2) {
          console.log('🎵 Audio not ready, loading...');
          audio.load();
        }
        
        // Try to play the audio
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('🎵 Music play promise resolved');
        }
      }
    } catch (error: any) {
      console.error('🎵 Could not play audio:', error);
      
      // Handle specific error types
      if (error.name === 'NotAllowedError') {
        setError('Please click the button to allow music playback');
      } else if (error.name === 'NotSupportedError') {
        setError('Music format not supported');
      } else {
        setError('Could not play music. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = 0.3;
      setIsMuted(false);
      console.log('🎵 Music unmuted');
    } else {
      audio.volume = 0;
      setIsMuted(true);
      console.log('🎵 Music muted');
    }
  };

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src="/good-night-lofi-cozy-chill-music-160166.mp3"
        preload="auto"
      />
      
          {/* Music control button - z-30 to stay below notifications (z-100) and other UI elements */}
          <div className="absolute top-32 right-4 z-30">
        <div className="flex gap-2">
          <Button
            onClick={toggleMusic}
            variant="outline"
            size="sm"
                className="cute-button music-button cute-bg-subtle backdrop-blur-sm hover:bg-primary/10"
            disabled={isLoading}
            title={error || (isPlaying ? 'Pause music' : 'Play music')}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 text-primary" />
            ) : (
              <Play className="h-4 w-4 text-primary" />
            )}
          </Button>
          
          {isPlaying && !isMuted && (
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
                className="cute-button music-button cute-bg-subtle backdrop-blur-sm hover:bg-primary/10"
              title="Mute music"
            >
              <Volume2 className="h-4 w-4 text-primary" />
            </Button>
          )}
          
          {isPlaying && isMuted && (
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
                className="cute-button music-button cute-bg-subtle backdrop-blur-sm hover:bg-primary/10"
              title="Unmute music"
            >
              <VolumeX className="h-4 w-4 text-primary" />
            </Button>
          )}
        </div>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
