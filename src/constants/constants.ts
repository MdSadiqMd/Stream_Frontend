const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_SERVER || 4000;
const ROOM_SOCKET = 'room-created';
const USERS_SOCKET = 'get-users';
const JOINED_SOCKET = 'joined-room';
const CREATE_SOCKET = 'create-room';
const USER_JOINED_SOCKET = 'user-joined';
const READY_SOCKET = 'ready';
const CALL_SOCKET = 'call';
const STRAM_SOCKET = 'stream';
const ADD_PEER = 'ADD_PEER';
const REMOVE_PEER = 'REMOVE_PEER';

export {
    SOCKET_SERVER,
    ROOM_SOCKET,
    USERS_SOCKET,
    JOINED_SOCKET,
    CREATE_SOCKET,
    USER_JOINED_SOCKET,
    READY_SOCKET,
    CALL_SOCKET,
    STRAM_SOCKET,
    ADD_PEER,
    REMOVE_PEER
};