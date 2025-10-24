'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Settings, Music } from 'lucide-react';

interface AvatarBackgroundProps {
  className?: string;
}

const BACKGROUND_OPTIONS = [
  { id: 'none', name: 'No Background', video: null },
  { id: 'bg1', name: 'Background 1', video: '/bg1.mp4' },
  { id: 'bg2', name: 'Background 2', video: '/bg2.mp4' },
  { id: 'bg3', name: 'Background 3', video: '/bg3.mp4' },
];

export function AvatarBackground({ className = '' }: AvatarBackgroundProps) {
  const [currentBackground, setCurrentBackground] = useState<string>('bg1');
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentOption = BACKGROUND_OPTIONS.find(option => option.id === currentBackground);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (!video) return;

    console.log('🎬 AvatarBackground useEffect - Video element:', video);
    console.log('🎬 Current background option:', currentOption);

    // Set video properties
    video.loop = true;
    video.muted = isMuted;
    video.playsInline = true;
    video.preload = 'metadata';

    // Set audio properties
    if (audio) {
      audio.loop = true;
      audio.volume = isMusicMuted ? 0 : 0.3;
      audio.preload = 'auto';
    }

    // Handle video events
    const handleLoadedData = () => {
      console.log('🎬 Background video loaded');
      setIsVideoLoading(false);
    };

    const handleCanPlay = () => {
      console.log('🎬 Background video can play');
      setIsVideoLoading(false);
      // Auto-play the video when it's ready
      if (currentOption?.video && video.paused) {
        video.play().catch(error => {
          console.error('🎬 Error auto-playing video:', error);
        });
      }
    };

    const handleError = (e: any) => {
      console.error('🎬 Background video error:', e);
      setIsVideoLoading(false);
    };

    // Handle audio events
    const handleAudioPlay = () => {
      console.log('🎵 Music started playing');
      setIsMusicPlaying(true);
      setIsMusicLoading(false);
      setMusicError(null);
    };
    
    const handleAudioPause = () => {
      console.log('🎵 Music paused');
      setIsMusicPlaying(false);
      setIsMusicLoading(false);
    };
    
    const handleAudioError = (e: any) => {
      console.error('🎵 Audio error:', e);
      setMusicError('Failed to load music. Please refresh the page.');
      setIsMusicPlaying(false);
      setIsMusicLoading(false);
    };

    const handleAudioLoadStart = () => {
      console.log('🎵 Loading music...');
      setIsMusicLoading(true);
    };

    const handleAudioCanPlay = () => {
      console.log('🎵 Music ready to play');
      setIsMusicLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    if (audio) {
      audio.addEventListener('play', handleAudioPlay);
      audio.addEventListener('pause', handleAudioPause);
      audio.addEventListener('error', handleAudioError);
      audio.addEventListener('loadstart', handleAudioLoadStart);
      audio.addEventListener('canplay', handleAudioCanPlay);
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      
      if (audio) {
        audio.removeEventListener('play', handleAudioPlay);
        audio.removeEventListener('pause', handleAudioPause);
        audio.removeEventListener('error', handleAudioError);
        audio.removeEventListener('loadstart', handleAudioLoadStart);
        audio.removeEventListener('canplay', handleAudioCanPlay);
      }
    };
  }, [isMuted, isMusicMuted]);

  const handleBackgroundChange = (backgroundId: string) => {
    console.log('🎬 Changing background to:', backgroundId);
    setCurrentBackground(backgroundId);
    setIsVideoLoading(true);
    const video = videoRef.current;
    if (video) {
      if (backgroundId === 'none') {
        video.pause();
        setIsVideoLoading(false);
        console.log('🎬 Background video paused');
      } else {
        console.log('🎬 Loading background video:', currentOption?.video);
        // Wait for video to load before playing
        video.addEventListener('canplay', () => {
          console.log('🎬 Video can play, starting playback');
          video.play().catch(error => {
            console.error('🎬 Error playing video:', error);
          });
        }, { once: true });
        
        video.load();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setIsMusicLoading(true);
      setMusicError(null);
      
      if (isMusicPlaying) {
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
        setMusicError('Please click the button to allow music playback');
      } else if (error.name === 'NotSupportedError') {
        setMusicError('Music format not supported');
      } else {
        setMusicError('Could not play music. Please try again.');
      }
      
      setIsMusicLoading(false);
    }
  };

  const toggleMusicMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMusicMuted) {
      audio.volume = 0.3;
      setIsMusicMuted(false);
      console.log('🎵 Music unmuted');
    } else {
      audio.volume = 0;
      setIsMusicMuted(true);
      console.log('🎵 Music muted');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src="/good-night-lofi-cozy-chill-music-160166.mp3"
        preload="auto"
      />
      
      {/* Background Video - positioned behind everything */}
      {currentOption?.video && (
        <>
          <video
            ref={videoRef}
            src={currentOption.video}
            className="w-[180%] h-[105%] object-cover rounded-2xl opacity-80 -translate-x-[0%] -translate-y-[0%]"
            style={{ zIndex: -1 }}
            loop
            muted={isMuted}
            playsInline
            autoPlay
            preload="metadata"
            onLoadStart={() => {
              console.log('🎬 Background video loading started:', currentOption.video);
              setIsVideoLoading(true);
            }}
            onCanPlay={() => {
              console.log('🎬 Background video can play:', currentOption.video);
              setIsVideoLoading(false);
            }}
            onLoadedData={() => {
              console.log('🎬 Background video loaded:', currentOption.video);
              setIsVideoLoading(false);
            }}
            onError={(e) => {
              console.error('🎬 Background video error:', e, 'Video:', currentOption.video);
              setIsVideoLoading(false);
            }}
          />
          {/* Video Loading Overlay */}
          {isVideoLoading && (
            <div className="absolute inset-0 w-[180%] h-[90%] bg-black/20 rounded-2xl flex items-center justify-center -translate-x-[40%] -translate-y-[5%]"
                 style={{ zIndex: 0 }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-white text-sm">Loading background...</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Background Controls */}
      <div className="absolute top-2 left-2 z-20">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowControls(!showControls)}
            variant="outline"
            size="sm"
            className="cute-button cute-bg-subtle backdrop-blur-sm hover:bg-primary/10"
            title="Background Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {/* Music Control - Single button with integrated volume control */}
          <Button
            onClick={isMusicPlaying ? toggleMusicMute : toggleMusic}
            variant="outline"
            size="sm"
            className="cute-button cute-bg-subtle backdrop-blur-sm hover:bg-primary/10"
            disabled={isMusicLoading}
            title={musicError || (isMusicPlaying ? (isMusicMuted ? 'Unmute music' : 'Mute music') : 'Play music')}
          >
            {isMusicLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : isMusicPlaying ? (
              isMusicMuted ? (
                <VolumeX className="h-4 w-4 text-primary" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )
            ) : (
              <Play className="h-4 w-4 text-primary" />
            )}
          </Button>
        </div>
      </div>

      {/* Background Selection Panel - Made Wider */}
      {showControls && (
        <div className="absolute top-12 left-2 z-20 bg-background/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border cute-card w-48">
          <h4 className="text-sm font-medium mb-3 cute-text-muted">Background</h4>
          <div className="space-y-2">
            {BACKGROUND_OPTIONS.map((option) => (
              <Button
                key={option.id}
                onClick={() => handleBackgroundChange(option.id)}
                variant={currentBackground === option.id ? 'default' : 'outline'}
                size="sm"
                className={`w-full justify-start cute-button ${
                  currentBackground === option.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'cute-bg-subtle'
                }`}
              >
                {option.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
