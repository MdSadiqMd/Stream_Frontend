"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

            <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-center bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex gap-2">
                    <Button
                        onClick={toggleMute}
                        variant="outline"
                        size="icon"
                        className={cn(
                            "rounded-full bg-zinc-800 border-0 hover:bg-zinc-700",
                            isMuted && "bg-red-900 hover:bg-red-800",
                        )}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={18} className="text-zinc-100" /> : <Mic size={18} className="text-zinc-100" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UserFeedPlayer;
