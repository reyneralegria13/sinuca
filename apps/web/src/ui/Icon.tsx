type Name = 'sound' | 'muted' | 'help' | 'restart' | 'close' | 'arrow' | 'settings';

const paths: Record<Name, string> = {
  sound: 'M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  restart: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
};

export function Icon({ name }: { name: Name }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
