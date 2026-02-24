import { registerCollar } from './register-collar.js';
import { validateSerial, validateCode } from './validation.js';

const tabScan = document.getElementById('tab-scan');
const tabType = document.getElementById('tab-type');
const panelScan = document.getElementById('panel-scan');
const panelType = document.getElementById('panel-type');
const feedback = document.getElementById('feedback');
const form = document.getElementById('serial-form');
const scanBtn = document.getElementById('scan-simulate');

function setActiveTab(tab) {
  const isType = tab === 'type';
  tabType.classList.toggle('active', isType);
  tabScan.classList.toggle('active', !isType);
  tabType.setAttribute('aria-selected', String(isType));
  tabScan.setAttribute('aria-selected', String(!isType));
  panelType.classList.toggle('active', isType);
  panelScan.classList.toggle('active', !isType);
}

function setFeedback(message, kind = 'error') {
  feedback.textContent = message;
  feedback.className = `feedback ${kind}`;
}

function messageForReason(reason) {
  const map = {
    SERIAL_NOT_FOUND: 'serial não encontrado',
    INVALID_CODE: 'código inválido',
    ALREADY_LINKED: 'já vinculado',
  };
  return map[reason] || 'erro ao vincular';
}

async function submitRegistration(serial, code) {
  // Validação no cliente
  if (!validateSerial(serial)) {
    setFeedback('Formato de serial inválido. Use COL-1234-ABCD.');
    return;
  }

  if (!validateCode(code)) {
    setFeedback('Formato de código inválido. Use 6 dígitos.');
    return;
  }

  const result = await registerCollar({ serial, code });

  if (!result.ok) {
    setFeedback(messageForReason(result.reason));
    return;
  }

  setFeedback('Coleira vinculada com sucesso!', 'success');
}

tabScan.addEventListener('click', () => setActiveTab('scan'));
tabType.addEventListener('click', () => setActiveTab('type'));

scanBtn.addEventListener('click', async () => {
  // fluxo de scanner reutiliza a mesma função register-collar
  await submitRegistration('COL-1234-ABCD', '654321');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const serial = document.getElementById('serial-input').value.trim().toUpperCase();
  const code = document.getElementById('code-input').value.trim();
  await submitRegistration(serial, code);
});
