'use client';

import { useState, useEffect } from 'react';

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

export function GlobalBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const emojis = ['💕', '✨', '🌟', '💖', '🌸', '🦋', '💫', '🎀', '💝', '🌺'];

  useEffect(() => {
    const createParticles = () => {
      const newParticles: Particle[] = [];
      
      for (let i = 0; i < 8; i++) { // More particles for global background
        newParticles.push({
          id: i,
          x: Math.random() * 100, // Full screen coverage
          y: Math.random() * 100, // Full screen coverage
          size: Math.random() * 20 + 15, // Larger particles
          delay: Math.random() * 5,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          direction: Math.random() * 360, // Random direction
          speed: Math.random() * 0.8 + 0.4, // Varied movement speed
        });
      }
      
      setParticles(newParticles);
    };

    createParticles();
    
    // Refresh particles every 20 seconds
    const interval = setInterval(createParticles, 20000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute floating-particle-gentle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${10 + particle.speed * 6}s`, // Varied duration
          }}
        >
          {particle.emoji}
        </div>
      ))}
    </div>
  );
}
