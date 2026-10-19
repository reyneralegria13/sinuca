import { useEffect, useState } from 'react';

const isPortrait = () => window.innerHeight > window.innerWidth * 1.05;

export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(isPortrait);
  useEffect(() => {
    const onResize = () => setPortrait(isPortrait());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return portrait;
}
