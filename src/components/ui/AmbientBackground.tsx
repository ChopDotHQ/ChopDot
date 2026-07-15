import React from 'react';
import { motion } from 'framer-motion';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" style={{ background: 'var(--background)' }}>
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(230, 0, 122, 0.15) 0%, rgba(9, 9, 11, 0) 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          opacity: 0.6,
        }}
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(255, 149, 0, 0.1) 0%, rgba(9, 9, 11, 0) 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.5,
        }}
      />
    </div>
  );
};
