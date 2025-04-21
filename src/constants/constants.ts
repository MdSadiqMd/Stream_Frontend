const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:4000';
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
const START_YOUTUBE_STREAM = 'start-youtube-stream';
const STOP_YOUTUBE_STREAM = 'stop-youtube-stream';
const STREAMING_STATUS = 'streaming-status';
const BINARY_STREAM = 'binarystream';

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
    REMOVE_PEER,
    START_YOUTUBE_STREAM,
    STOP_YOUTUBE_STREAM,
    STREAMING_STATUS,
    BINARY_STREAM
};