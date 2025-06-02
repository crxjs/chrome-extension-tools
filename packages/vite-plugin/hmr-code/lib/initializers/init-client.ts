import { DO_UPDATE, DONE_UPDATE, LOCAL_RELOAD_SOCKET_URL } from '../consts.js';
import MessageInterpreter from '../interpreter/index.js';

export default ({ id, onUpdate }: { id: string; onUpdate: () => void }) => {
  const ws = new WebSocket(LOCAL_RELOAD_SOCKET_URL);

  ws.onopen = () => {
    ws.addEventListener('message', event => {
      const message = MessageInterpreter.receive(String(event.data));

      if (message.type === DO_UPDATE && message.id === id) {
        onUpdate();
        ws.send(MessageInterpreter.send({ type: DONE_UPDATE }));
      }
    });
  };
};
