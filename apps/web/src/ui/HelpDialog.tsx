import { Dialog } from './Dialog';

export function HelpDialog({ onClose }: { onClose(): void }) {
  return (
    <Dialog id="help-title" title="Sua próxima boa jogada" onClose={onClose}>
      <p>Dois jogadores, uma mesa. Encaçape seu grupo e finalize com a bola 8.</p>
      <ol className="help-steps">
        <li>
          <strong>Encontre o ângulo</strong>
          <span>Arraste na mesa para mirar. Use a roda de mira fina ou as setas para ajustar.</span>
        </li>
        <li>
          <strong>Dose a força</strong>
          <span>Puxe a barra de força e solte. No teclado, segure e solte Espaço.</span>
        </li>
        <li>
          <strong>Dê seu efeito</strong>
          <span>Toque na bola branca do painel. Em cima ela segue; embaixo, ela volta.</span>
        </li>
        <li>
          <strong>Feche na bola 8</strong>
          <span>Limpe suas lisas ou listradas e escolha a caçapa antes de jogar na 8.</span>
        </li>
      </ol>
      <p className="help-note">
        Falta dá bola na mão ao adversário. Arraste a branca para reposicioná-la. Você tem 30
        segundos por tacada.
      </p>
      <button className="primary" onClick={onClose}>
        Vamos jogar
      </button>
    </Dialog>
  );
}
