import type { SoundEngine } from '../audio/SoundEngine';
import { Dialog } from './Dialog';

export function SettingsDialog({
  sound,
  volume,
  onVolume,
  onClose,
}: {
  sound: SoundEngine;
  volume: number;
  onVolume(value: number): void;
  onClose(): void;
}) {
  const preview = async (kind: 'cue' | 'ball' | 'cushion' | 'pocket') => {
    await sound.unlock();
    if (kind === 'pocket') sound.pocket();
    else sound[kind](kind === 'cue' ? 4500 : 2400);
  };
  return (
    <Dialog id="settings-title" title="Som da mesa" onClose={onClose}>
      <p>O estalo de cada jogada, na medida certa.</p>
      <label className="volume-label" htmlFor="sound-volume">
        Volume dos efeitos <strong>{Math.round(volume * 100)}%</strong>
      </label>
      <input
        id="sound-volume"
        className="volume-slider"
        type="range"
        min="0"
        max="100"
        value={Math.round(volume * 100)}
        onChange={(e) => onVolume(Number(e.target.value) / 100)}
      />
      <div className="sound-previews">
        <button onClick={() => void preview('cue')}>Ouvir taco</button>
        <button onClick={() => void preview('ball')}>Ouvir bolas</button>
        <button onClick={() => void preview('cushion')}>Ouvir tabela</button>
        <button onClick={() => void preview('pocket')}>Ouvir caçapa</button>
      </div>
      <button className="primary" onClick={onClose}>
        Voltar à mesa
      </button>
    </Dialog>
  );
}
