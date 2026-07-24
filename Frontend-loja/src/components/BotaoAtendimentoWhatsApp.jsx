import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import api from '../services/api.js';
import { abrirAtendimentoWhatsApp } from '../utils/whatsapp.js';

export default function BotaoAtendimentoWhatsApp({ numero, mensagem, texto = 'Dúvidas? Fale pelo WhatsApp' }) {
  const [abrindo, setAbrindo] = useState(false);

  async function abrirAtendimento() {
    try {
      setAbrindo(true);
      let numeroAtendimento = numero;

      if (!numeroAtendimento) {
        const resposta = await api.get('/pedidos/atendimento/whatsapp');
        numeroAtendimento = resposta.data?.whatsapp_number;
      }

      abrirAtendimentoWhatsApp({ numero: numeroAtendimento, mensagem });
    } catch (error) {
      alert(error.response?.data?.erro || error.message || 'Atendimento via WhatsApp indisponível');
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <button type="button" className="btn-whatsapp-atendimento" onClick={abrirAtendimento} disabled={abrindo}>
      <FaWhatsapp aria-hidden="true" />
      {abrindo ? 'Abrindo atendimento...' : texto}
    </button>
  );
}
