"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface UserFeedPlayerProps {
    stream?: MediaStream;
    username?: string;
    isLocalUser?: boolean;
}

const UserFeedPlayer: React.FC<UserFeedPlayerProps> = ({ stream, username = "You", isLocalUser = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const toggleMute = () => {
        if (stream) {
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track) => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    return (
        <div className="relative rounded-lg overflow-hidden bg-zinc-900 shadow-lg border border-zinc-800">
            <video
                ref={videoRef}
                muted={isLocalUser}
                autoPlay
                playsInline
                className="w-full h-full object-contain min-h-[240px] max-h-[calc(100vh-200px)]"
            />

            <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-zinc-100 text-sm">
                {username} {isMuted && !isLocalUser && "(Muted)"}
            </div>
        </div>
    );
};

export default UserFeedPlayer;
