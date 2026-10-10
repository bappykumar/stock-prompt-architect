import React from 'react';

interface QuantumOrbitalCoreProps {
  size?: number;
  className?: string;
  status?: 'active' | 'success' | 'syncing';
}

export const QuantumOrbitalCore: React.FC<QuantumOrbitalCoreProps> = ({
  size = 44,
  className = '',
  status = 'active',
}) => {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Quantum Orbital Neural Core"
    >
      {/* Ambient Neural Glow Atmosphere */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/25 via-blue-600/25 to-indigo-500/25 blur-[10px] animate-pulse pointer-events-none" 
        style={{ animationDuration: '2.4s' }}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Orbital gradients */}
          <linearGradient id="q-orbit-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="q-orbit-secondary" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
          </linearGradient>

          <radialGradient id="q-neural-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#2563eb" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="q-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="q-node-glow-alt" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="45%" stopColor="#818cf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>

          {/* SVG Glow Filter */}
          <filter id="q-core-bloom" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Circular Orbital Track (Clockwise rotation) */}
        <g className="quantum-orbit-cw origin-center">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#q-orbit-primary)"
            strokeWidth="1.25"
            strokeDasharray="5 7 2 7"
            className="opacity-70 dark:opacity-85"
          />
          {/* Orbital Node 1 */}
          <circle cx="50" cy="6" r="3.2" fill="url(#q-node-glow)" filter="url(#q-core-bloom)" />
          <circle cx="50" cy="6" r="1.5" fill="#ffffff" />
          {/* Orbital Node 2 */}
          <circle cx="50" cy="94" r="2.2" fill="url(#q-node-glow-alt)" />
        </g>

        {/* Inclined Quantum Orbital Ellipse 1 (Counter-Clockwise rotation, angle -32deg) */}
        <g className="quantum-orbit-ellipse-ccw origin-center">
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="23"
            fill="none"
            stroke="url(#q-orbit-secondary)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            className="opacity-80 dark:opacity-90"
          />
          {/* Traveling Quantum Node on Ellipse 1 */}
          <circle cx="92" cy="50" r="3.2" fill="url(#q-node-glow)" filter="url(#q-core-bloom)" />
          <circle cx="92" cy="50" r="1.4" fill="#ffffff" />
        </g>

        {/* Inclined Quantum Orbital Ellipse 2 (Clockwise rotation, angle +38deg) */}
        <g className="quantum-orbit-ellipse-cw origin-center">
          <ellipse
            cx="50"
            cy="50"
            rx="41"
            ry="22"
            fill="none"
            stroke="url(#q-orbit-primary)"
            strokeWidth="1.4"
            strokeDasharray="3 8 7 4"
            className="opacity-75 dark:opacity-85"
          />
          {/* Traveling Quantum Node on Ellipse 2 */}
          <circle cx="8" cy="50" r="2.8" fill="url(#q-node-glow-alt)" filter="url(#q-core-bloom)" />
          <circle cx="8" cy="50" r="1.2" fill="#ffffff" />
        </g>

        {/* Inner Resonance Ring (Counter-rotating micro-ring) */}
        <g className="quantum-orbit-ccw-fast origin-center">
          <circle
            cx="50"
            cy="50"
            r="23"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="2 4"
            className="opacity-60 dark:opacity-75"
          />
          <circle cx="50" cy="27" r="1.8" fill="#38bdf8" />
        </g>

        {/* Pulsing Neural Center Core */}
        <g className="origin-center quantum-neural-pulse">
          {/* Diffused neural glow sphere */}
          <circle cx="50" cy="50" r="17" fill="url(#q-neural-core-glow)" filter="url(#q-core-bloom)" />
          
          {/* Intermediate neural energetic ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="11" 
            fill="none" 
            stroke="#93c5fd" 
            strokeWidth="0.8" 
            className="opacity-80" 
          />

          {/* Central Neural Synapse Core */}
          <circle cx="50" cy="50" r="6" fill="#38bdf8" className="opacity-95" />
          <circle cx="50" cy="50" r="3" fill="#ffffff" />

          {/* Synaptic micro-nodes (neural cluster) */}
          <circle cx="46" cy="46" r="1" fill="#ffffff" className="opacity-90" />
          <circle cx="54" cy="47" r="0.9" fill="#ffffff" className="opacity-80" />
          <circle cx="50" cy="54" r="1" fill="#ffffff" className="opacity-90" />
        </g>
      </svg>
    </div>
  );
};
