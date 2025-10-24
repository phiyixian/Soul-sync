'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  emoji: string;
  direction: number;
  speed: number;
}

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const emojis = ['💕', '✨', '🌟', '💖', '🌸', '🦋', '💫', '🎀', '💝', '🌺'];

  useEffect(() => {
    const createParticles = () => {
      const newParticles: Particle[] = [];
      
      for (let i = 0; i < 6; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 80 + 10, // Keep within 10-90% of container
          y: Math.random() * 80 + 10, // Keep within 10-90% of container
          size: Math.random() * 15 + 12, // Smaller particles
          delay: Math.random() * 5,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          direction: Math.random() * 360, // Random direction
          speed: Math.random() * 0.5 + 0.3, // Slow movement
        });
      }
      
      setParticles(newParticles);
    };

    createParticles();
    
    // Refresh particles every 15 seconds
    const interval = setInterval(createParticles, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute floating-particle-gentle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${8 + particle.speed * 4}s`,
          }}
        >
          {particle.emoji}
        </div>
      ))}
    </div>
  );
}
