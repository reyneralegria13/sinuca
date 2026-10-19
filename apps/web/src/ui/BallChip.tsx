import { ballColor } from '../render/textures/ballTexture';

export function BallChip({ id, out }: { id: number; out?: boolean }) {
  const color = ballColor(id);
  const background =
    id > 8 ? `linear-gradient(${color},${color}) center/100% 52% no-repeat, #f5f0e2` : color;
  return (
    <span
      className={`chip${out ? ' out' : ''}${id === 8 ? ' eight' : ''}`}
      style={{ background }}
      aria-hidden
    />
  );
}
