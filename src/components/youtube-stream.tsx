"use client";
import { useState, useEffect } from "react";
import { Youtube, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { START_YOUTUBE_STREAM, STOP_YOUTUBE_STREAM, STREAMING_STATUS } from "@/constants/constants";

interface YouTubeStreamProps {
    roomId: string;
    socket: any;
}

const YouTubeStream: React.FC<YouTubeStreamProps> = ({ roomId, socket }) => {
    const [showPanel, setShowPanel] = useState(false);
    const [streamKey, setStreamKey] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleStreamPanel = () => {
        setShowPanel(!showPanel);
        setError(null);
    };

    const startStreaming = () => {
        if (!streamKey) {
            setError("Please enter a YouTube stream key");
            return;
        }

        setIsLoading(true);
        setError(null);

        // Create YouTube RTMP URL with the stream key
        const youtubeUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

        // Signal to backend to start streaming
        socket.emit(START_YOUTUBE_STREAM, { roomId, youtubeUrl }, (response: any) => {
            setIsLoading(false);

            if (response && response.success) {
                setIsStreaming(true);
            } else if (response && response.error) {
                setError(response.error);
            } else {
                setError("Failed to start streaming. Please try again.");
            }
        });
    };

    const stopStreaming = () => {
        setIsLoading(true);

        socket.emit(STOP_YOUTUBE_STREAM, { roomId }, (response: any) => {
            setIsLoading(false);

            if (response && response.success) {
                setIsStreaming(false);
                setStreamKey("");
            } else if (response && response.error) {
                setError(response.error);
            } else {
                setError("Failed to stop streaming. Please try again.");
            }
        });
    };

    // Listen for streaming status updates from server
    useEffect(() => {
        if (!socket) return;

        const handleStreamingStatus = (data: { streaming: boolean; }) => {
            setIsStreaming(data.streaming);
        };

        socket.on(STREAMING_STATUS, handleStreamingStatus);

        return () => {
            socket.off(STREAMING_STATUS, handleStreamingStatus);
        };
    }, [socket]);

    return (
        <div className="relative">
            <Button
                onClick={toggleStreamPanel}
                variant="outline"
                size="icon"
                className={cn(
                    "rounded-full h-12 w-12 border-0",
                    isStreaming
                        ? "bg-red-900 hover:bg-red-800 text-zinc-100"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                )}
                title={isStreaming ? "Currently streaming to YouTube" : "Stream to YouTube"}
            >
                <Youtube size={20} />
            </Button>

            {showPanel && (
                <div className="absolute bottom-16 right-0 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-72 p-4 z-10">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-zinc-100 font-medium">YouTube Stream</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                            onClick={toggleStreamPanel}
                        >
                            <X size={16} />
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-red-900/30 border border-red-800 text-red-200 p-2 rounded text-sm mb-3">
                            {error}
                        </div>
                    )}

                    {!isStreaming ? (
                        <>
                            <div className="mb-3">
                                <label htmlFor="stream-key" className="block text-sm text-zinc-400 mb-1">
                                    YouTube Stream Key
                                </label>
                                <Input
                                    id="stream-key"
                                    type="password"
                                    value={streamKey}
                                    onChange={(e) => setStreamKey(e.target.value)}
                                    placeholder="Enter your stream key"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                                />
                            </div>
                            <Button
                                onClick={startStreaming}
                                disabled={isLoading || !streamKey}
                                className="w-full bg-red-900 hover:bg-red-800 text-zinc-100"
                            >
                                {isLoading ? "Starting Stream..." : "Start Stream"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="bg-green-900/30 border border-green-800 text-green-200 p-2 rounded text-sm mb-3">
                                Streaming to YouTube
                            </div>
                            <Button
                                onClick={stopStreaming}
                                disabled={isLoading}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                            >
                                {isLoading ? "Stopping Stream..." : "Stop Stream"}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default YouTubeStream;