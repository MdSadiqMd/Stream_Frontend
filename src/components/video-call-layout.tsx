"use client";
import type React from "react";
import { useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy } from "lucide-react";

import UserFeedPlayer from "./UserFeedPlayer";
import StreamControl from "./stream-control";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoCallLayoutProps {
    localStream?: MediaStream;
    remoteStreams: MediaStream[];
    onLeaveCall: () => void;
    roomId?: string;
}

const VideoCallLayout: React.FC<VideoCallLayoutProps> = ({ localStream, remoteStreams, onLeaveCall, roomId }) => {
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const toggleAudio = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach((track) => {
                track.enabled = isAudioMuted;
            });
            setIsAudioMuted(!isAudioMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            videoTracks.forEach((track) => {
                track.enabled = isVideoOff;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const copyMeetingId = () => {
        if (roomId) {
            navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
            {roomId && (
                <div className="bg-zinc-900 p-3 shadow-md border-b border-zinc-800">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <h1 className="text-lg font-medium text-zinc-100">Meeting: {roomId}</h1>
                        <div className="flex items-center gap-2">
                            {roomId && localStream && <StreamControl roomId={roomId} localStream={localStream} />}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyMeetingId}
                                className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:text-zinc-50"
                            >
                                <Copy size={14} className="mr-2" />
                                {isCopied ? "Copied!" : "Copy ID"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 p-4 overflow-auto">
                <div
                    className={cn(
                        "grid gap-4",
                        remoteStreams.length === 0
                            ? "grid-cols-1 max-w-3xl mx-auto"
                            : remoteStreams.length < 3
                                ? "grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto"
                                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto",
                    )}
                >
                    {localStream && <UserFeedPlayer stream={localStream} username="You" isLocalUser={true} />}
                    {remoteStreams.map((stream, index) => (
                        <UserFeedPlayer key={index} stream={stream} username={`User ${index + 1}`} />
                    ))}
                </div>
            </div>

            <div className="bg-zinc-900 p-4 shadow-lg border-t border-zinc-800">
                <div className="flex justify-center gap-4">
                    <Button
                        onClick={toggleAudio}
                        variant="outline"
                        size="icon"
                        className={cn(
                            "rounded-full h-12 w-12",
                            isAudioMuted
                                ? "bg-red-900 hover:bg-red-800 text-zinc-100 border-0"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700",
                        )}
                    >
                        {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </Button>

                    <Button
                        onClick={toggleVideo}
                        variant="outline"
                        size="icon"
                        className={cn(
                            "rounded-full h-12 w-12",
                            isVideoOff
                                ? "bg-red-900 hover:bg-red-800 text-zinc-100 border-0"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700",
                        )}
                    >
                        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </Button>

                    <Button
                        onClick={onLeaveCall}
                        variant="destructive"
                        size="icon"
                        className="rounded-full h-12 w-12 bg-red-900 hover:bg-red-800"
                    >
                        <PhoneOff size={20} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VideoCallLayout;
