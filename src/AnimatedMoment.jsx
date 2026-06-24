import React from 'react';
import Lottie from 'lottie-react';
import dailyScore from './animations/daily-score.json';
import dogWalk from './animations/dog-walk.json';
import doneCheck from './animations/done-check.json';
import newDay from './animations/new-day.json';

const animations = {
  dailyScore,
  dogWalk,
  doneCheck,
  newDay
};

export default function AnimatedMoment({ name, className = '', loop = true }) {
  const animationData = animations[name];
  if (!animationData) return null;

  return (
    <div className={`animatedMoment ${className}`} aria-hidden="true">
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
    </div>
  );
}
