"use client";
import SocketIOClient from 'socket.io-client';
import { createContext, useEffect, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import Peer from 'peerjs';
import { v4 as UUIDv4 } from 'uuid';

import { SOCKET_SERVER, ROOM_SOCKET, USERS_SOCKET, USER_JOINED_SOCKET, READY_SOCKET, CALL_SOCKET, STRAM_SOCKET } from '@/constants/constants';
import { IProps } from '@/types/IProps.types';
import { IRoomParams } from '@/types/IRoomParams.types';
import { peerReducer } from '@/Reducers/peer.reducer';
import { addPeerAction } from '@/Actions/peer.action';

export const SocketContext = createContext<any | null>(null);

const socket = SocketIOClient(SOCKET_SERVER, {
    transports: ['polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    path: '/socket.io',
    withCredentials: false,
    forceNew: true
});

export const SocketProvider: React.FC<IProps> = ({ children }) => {
    const router = useRouter();
    const [user, setUser] = useState<Peer>();
    const [stream, setStream] = useState<MediaStream>();
    const [peers, dispatch] = useReducer(peerReducer, {});
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const fetchParticipants = ({ roomId, participants }: IRoomParams) => {
        console.log("Room participants:", roomId, participants);
    };

    const fetchUserFeed = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setStream(mediaStream);
        } catch (error) {
            console.error("Error accessing media devices:", error);
            setConnectionError("Could not access camera or microphone. Please check permissions.");
        }
    };

    useEffect(() => {
        const handleConnect = () => {
            setIsConnected(true);
            setConnectionError(null);
        };

        const handleDisconnect = (reason: string) => {
            setIsConnected(false);
        };

        const handleConnectError = (error: any) => {
            console.error("Socket connection error:", error);
            setConnectionError(`Socket connection error: ${error.message || error}`);
            setIsConnected(false);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        if (socket.connected) {
            setIsConnected(true);
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
        };
    }, []);

    useEffect(() => {
        const userId = UUIDv4();
        setUser({ id: userId } as any);
        fetchUserFeed();

        const enterRoom = ({ roomId }: { roomId: string; }) => {
            router.push(`/room/${roomId}`);
        };

        socket.on(ROOM_SOCKET, enterRoom);
        socket.on(USERS_SOCKET, fetchParticipants);

        return () => {
            socket.off(ROOM_SOCKET, enterRoom);
            socket.off(USERS_SOCKET, fetchParticipants);
        };
    }, [router]);

    useEffect(() => {
        if (!user || !stream) {
            return;
        }

        const handleUserJoined = ({ peerId }: { peerId: string; }) => {
            dispatch(addPeerAction(peerId, stream));
        };

        socket.on(USER_JOINED_SOCKET, handleUserJoined);
        socket.emit(READY_SOCKET);
        return () => {
            socket.off(USER_JOINED_SOCKET, handleUserJoined);
        };
    }, [user, stream]);

    return (
        <SocketContext.Provider value={{
            socket,
            user,
            stream,
            peers,
            isConnected,
            connectionError
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;