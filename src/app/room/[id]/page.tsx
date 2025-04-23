"use client";
import { useContext, useEffect } from "react";
import type React from "react";
import { useParams, useRouter } from "next/navigation";

import { SocketContext } from "@/context/SocketContext";
import VideoCallLayout from "@/components/video-call-layout";
import { JOINED_SOCKET } from "@/constants/constants";

export const runtime = 'edge';

const Room: React.FC = () => {
    const { id } = useParams();
    const router = useRouter();
    const { socket, user, stream, peers } = useContext(SocketContext);

    useEffect(() => {
        if (user) {
            console.log(`Joining room ${id} with user ${user._id}`);
            socket.emit(JOINED_SOCKET, { roomId: id, peerId: user._id });
        }
    }, [id, user, socket]);

    const handleLeaveCall = () => {
        if (user) {
            router.push("/");
        }
    };

    const remoteStreams = Object.values(peers).map((peer) => (peer as any).stream);

    return (
        <div className="h-screen bg-zinc-950">
            <VideoCallLayout
                localStream={stream as MediaStream}
                remoteStreams={remoteStreams}
                onLeaveCall={handleLeaveCall}
                roomId={id as string}
            />
        </div>
    );
};

export default Room;
