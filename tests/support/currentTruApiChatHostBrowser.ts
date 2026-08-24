import {
  HostChatCreateRoomResponse,
  HostChatPostMessageResponse,
  HostChatRegisterBotResponse,
  VersionedHostChatActionSubscribeItem,
  VersionedHostChatCreateRoomError,
  VersionedHostChatCreateRoomRequest,
  VersionedHostChatListSubscribeItem,
  VersionedHostChatPostMessageError,
  VersionedHostChatPostMessageRequest,
  VersionedHostChatRegisterBotError,
  VersionedHostChatRegisterBotRequest,
  decodeWireMessage,
  encodeWireMessage,
  scale,
  type ChatActionPayload,
  type ChatMessageContent,
} from '@parity/truapi';
import {
  CHAT_ACTION_SUBSCRIBE,
  CHAT_CREATE_ROOM,
  CHAT_LIST_SUBSCRIBE,
  CHAT_POST_MESSAGE,
  CHAT_REGISTER_BOT,
} from '@parity/truapi/wire-table';

type HostRoom = {
  roomId: string;
  name: string;
  icon: string;
  participatingAs: 'RoomHost' | 'Bot';
};

type HostBot = {botId: string; name: string; icon: string};
type HostMessage = {roomId: string; messageId: string; payload: ChatMessageContent; timestamp: number};
type InjectedAction = {roomId: string; peer: string; payload: ChatActionPayload};

const rooms = new Map<string, HostRoom>();
const bots = new Map<string, HostBot>();
const messages: HostMessage[] = [];
const listSubscriptions = new Map<string, {target: Window; origin: string}>();
const actionSubscriptions = new Map<string, {target: Window; origin: string}>();
let messageSequence = 0;

const createRoomResponse = scale.indexedTaggedUnion({
  V1: [0, scale.Result(HostChatCreateRoomResponse, scale.CallError(VersionedHostChatCreateRoomError))],
});
const registerBotResponse = scale.indexedTaggedUnion({
  V1: [0, scale.Result(HostChatRegisterBotResponse, scale.CallError(VersionedHostChatRegisterBotError))],
});
const postMessageResponse = scale.indexedTaggedUnion({
  V1: [0, scale.Result(HostChatPostMessageResponse, scale.CallError(VersionedHostChatPostMessageError))],
});

window.addEventListener('message', event => {
  if (!(event.data instanceof Uint8Array) || !isProductFrame(event.source)) return;
  const decoded = decodeWireMessage(event.data);
  if (decoded.isErr()) return;
  const frame = decoded.value;
  if (!isChatFrame(frame.payload.id)) return;
  event.stopImmediatePropagation();

  const target = event.source;
  if (!target || !('postMessage' in target)) return;
  const peer = {target: target as Window, origin: event.origin};

  switch (frame.payload.id) {
    case CHAT_CREATE_ROOM.request: {
      const request = VersionedHostChatCreateRoomRequest.dec(frame.payload.value).value;
      const existed = rooms.has(request.roomId);
      if (!existed) {
        rooms.set(request.roomId, {...request, participatingAs: 'RoomHost'});
        publishRoomSnapshot();
      }
      send(peer, frame.requestId, CHAT_CREATE_ROOM.response, createRoomResponse.enc({
        tag: 'V1',
        value: {success: true, value: {status: existed ? 'Exists' : 'New'}},
      }));
      return;
    }
    case CHAT_REGISTER_BOT.request: {
      const request = VersionedHostChatRegisterBotRequest.dec(frame.payload.value).value;
      const existed = bots.has(request.botId);
      if (!existed) bots.set(request.botId, request);
      send(peer, frame.requestId, CHAT_REGISTER_BOT.response, registerBotResponse.enc({
        tag: 'V1',
        value: {success: true, value: {status: existed ? 'Exists' : 'New'}},
      }));
      return;
    }
    case CHAT_LIST_SUBSCRIBE.start:
      listSubscriptions.set(frame.requestId, peer);
      publishRoomSnapshotTo(frame.requestId, peer);
      return;
    case CHAT_LIST_SUBSCRIBE.stop:
      listSubscriptions.delete(frame.requestId);
      return;
    case CHAT_POST_MESSAGE.request: {
      const request = VersionedHostChatPostMessageRequest.dec(frame.payload.value).value;
      if (!rooms.has(request.roomId)) {
        send(peer, frame.requestId, CHAT_POST_MESSAGE.response, postMessageResponse.enc({
          tag: 'V1',
          value: {
            success: false,
            value: {tag: 'Domain', value: {tag: 'V1', value: {tag: 'Unknown', value: {reason: `Room does not exist: ${request.roomId}`}}}},
          },
        }));
        return;
      }
      messageSequence += 1;
      const messageId = `msg-${messageSequence}`;
      messages.push({
        roomId: request.roomId,
        messageId,
        payload: request.payload,
        timestamp: Date.now(),
      });
      send(peer, frame.requestId, CHAT_POST_MESSAGE.response, postMessageResponse.enc({
        tag: 'V1',
        value: {success: true, value: {messageId}},
      }));
      return;
    }
    case CHAT_ACTION_SUBSCRIBE.start:
      actionSubscriptions.set(frame.requestId, peer);
      return;
    case CHAT_ACTION_SUBSCRIBE.stop:
      actionSubscriptions.delete(frame.requestId);
  }
}, {capture: true});

attachPublicTestApi();

function isProductFrame(source: MessageEventSource | null): source is Window {
  const iframe = document.getElementById('product-frame') as HTMLIFrameElement | null;
  return Boolean(iframe?.contentWindow && source === iframe.contentWindow);
}

function isChatFrame(id: number): boolean {
  const chatFrameIds: readonly number[] = [
    CHAT_CREATE_ROOM.request,
    CHAT_REGISTER_BOT.request,
    CHAT_LIST_SUBSCRIBE.start,
    CHAT_LIST_SUBSCRIBE.stop,
    CHAT_POST_MESSAGE.request,
    CHAT_ACTION_SUBSCRIBE.start,
    CHAT_ACTION_SUBSCRIBE.stop,
  ];
  return chatFrameIds.includes(id);
}

function publishRoomSnapshot(): void {
  for (const [requestId, peer] of listSubscriptions) publishRoomSnapshotTo(requestId, peer);
}

function publishRoomSnapshotTo(requestId: string, peer: {target: Window; origin: string}): void {
  const currentRooms = [...rooms.values()].map(({roomId, participatingAs}) => ({roomId, participatingAs}));
  send(peer, requestId, CHAT_LIST_SUBSCRIBE.receive, VersionedHostChatListSubscribeItem.enc({
    tag: 'V1',
    value: {rooms: currentRooms},
  }));
}

function publishAction(action: InjectedAction): void {
  const payload = VersionedHostChatActionSubscribeItem.enc({tag: 'V1', value: action});
  for (const [requestId, peer] of actionSubscriptions) send(peer, requestId, CHAT_ACTION_SUBSCRIBE.receive, payload);
}

function send(peer: {target: Window; origin: string}, requestId: string, id: number, value: Uint8Array): void {
  const encoded = encodeWireMessage({requestId, payload: {id, value}});
  if (encoded.isErr()) throw encoded.error;
  peer.target.postMessage(encoded.value, peer.origin);
}

function attachPublicTestApi(): void {
  const timer = window.setInterval(() => {
    const api = window.__TEST_HOST__ as unknown as Record<string, unknown> | undefined;
    if (!api) return;
    window.clearInterval(timer);
    Object.assign(api, {
      getChatRooms: () => [...rooms.values()].map(room => ({...room})),
      getChatBots: () => [...bots.values()].map(bot => ({...bot})),
      getChatMessageLog: () => messages.map(message => ({...message})),
      clearChatState: () => {
        rooms.clear();
        bots.clear();
        messages.length = 0;
        listSubscriptions.clear();
        actionSubscriptions.clear();
        messageSequence = 0;
      },
      injectChatAction: (action: InjectedAction) => publishAction(action),
    });
  }, 0);
}
