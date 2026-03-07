import "./validacaoCadastro.css";

export default function ValidacaoCadastro({ onEmail, onSMS }) {
  return (
    <div className="modalOverlay">
      <div className="modalBox">

        <button className="closeBtn">✕</button>

        <div className="iconBox">
          <div className="iconPhone">📱</div>
        </div>

        <h2>Validação de cadastro</h2>

        <p>
          Escolha uma das opções para receber o código e validar seu cadastro
        </p>

        <div className="buttons">
          <button className="btnEmail" onClick={onEmail}>
            ✉ Enviar por E-mail
          </button>

          <button className="btnSMS" onClick={onSMS}>
            💬 Enviar por SMS
          </button>
        </div>

      </div>
    </div>
  );
}