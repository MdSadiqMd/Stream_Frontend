const SOCKET_SERVER = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const START_YOUTUBE_STREAM = 'start-youtube-stream';
const STOP_YOUTUBE_STREAM = 'stop-youtube-stream';
const CREATE_SOCKET = 'create:room';
const ROOM_SOCKET = 'room:created';
const JOINED_SOCKET = 'joined:room';
const USERS_SOCKET = 'room:users';
const USER_JOINED_SOCKET = 'user:joined';
const READY_SOCKET = 'user:ready';
const CALL_SOCKET = 'call';
const STRAM_SOCKET = 'stream';
const PEER_DISCONNECT = 'peer:disconnect';
const SIGNAL_SOCKET = 'signal';
const START_HLS_STREAM = 'stream:start:hls';
const STOP_HLS_STREAM = 'stream:stop:hls';
const BINARY_STREAM = 'stream:binary';
const STREAMING_STATUS = 'stream:status';
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
    REMOVE_PEER,
    START_YOUTUBE_STREAM,
    STOP_YOUTUBE_STREAM,
    STREAMING_STATUS,
    BINARY_STREAM,
    START_HLS_STREAM,
    STOP_HLS_STREAM,
    SIGNAL_SOCKET,
    PEER_DISCONNECT
};
