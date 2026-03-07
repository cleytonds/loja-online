import { useNavigate } from "react-router-dom";
import "./validacao.css";

export default function EscolherValidacao() {

  const navigate = useNavigate();

  function email() {
    navigate("/validacao-email");
  }

  function sms() {
    navigate("/validacao-sms");
  }

  return (
    <div className="container-validacao">

      <div className="box-validacao">

        <h2>Validação de cadastro</h2>

        <p>
          Escolha uma das opções para receber o código e validar seu cadastro
        </p>

        <div className="botoes-validacao">

          <button onClick={email} className="btn-email">
            Enviar por E-mail
          </button>

          <button onClick={sms} className="btn-sms">
            Enviar por SMS
          </button>

        </div>

      </div>

    </div>
  );
}