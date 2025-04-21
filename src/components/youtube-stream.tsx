"use client";
import React, { useState, useContext, useEffect } from "react";
import { Youtube, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { SocketContext } from "@/context/SocketContext";
import {
    START_YOUTUBE_STREAM,
    STOP_YOUTUBE_STREAM,
} from "@/constants/constants";
import { useMediaRecorder, useStreamingStatus } from "@/lib/utils-youtube";

interface YouTubeStreamProps {
    roomId: string;
}

const YouTubeStream: React.FC<YouTubeStreamProps> = ({ roomId }) => {
    const { socket, stream } = useContext(SocketContext);
    const [streamKey, setStreamKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const { isStreaming, setIsStreaming } = useStreamingStatus(socket, roomId);
    const { error: recorderError } = useMediaRecorder(socket, stream, isStreaming, roomId);
    useEffect(() => {
        if (recorderError) {
            setError(recorderError);
        }
    }, [recorderError]);
    useEffect(() => {
        if (!open) {
            setError(null);
        }
    }, [open]);

    const startStreaming = async () => {
        if (!socket || !stream || !streamKey) {
            setError("Missing stream key or connection");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            socket.emit(START_YOUTUBE_STREAM, {
                roomId,
                streamKey,
            }, (response: any) => {
                setIsLoading(false);

                if (response && response.success) {
                    setIsStreaming(true);
                    setOpen(false);
                } else if (response && response.error) {
                    setError(response.error);
                } else {
                    setError("Failed to start streaming. Please try again.");
                }
            });
        } catch (err) {
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    const stopStreaming = () => {
        if (!socket) return;
        setIsLoading(true);

        socket.emit(STOP_YOUTUBE_STREAM, { roomId }, (response: any) => {
            setIsLoading(false);
            if (response && response.success) {
                setIsStreaming(false);
            } else if (response && response.error) {
                setError(response.error);
            }
        });
    };

    return (
        <>
            {isStreaming ? (
                <Button
                    onClick={stopStreaming}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-zinc-100"
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Youtube size={18} />
                    )}
                    <span>Stop Streaming</span>
                </Button>
            ) : (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-zinc-100"
                        >
                            <Youtube size={18} />
                            <span>Stream to YouTube</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-100">Stream to YouTube</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                YouTube Stream Key
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter your YouTube stream key"
                                value={streamKey}
                                onChange={(e) => setStreamKey(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-400">{error}</p>
                            )}
                            <p className="mt-3 text-xs text-zinc-400">
                                The stream will be sent directly from your browser to YouTube using WebRTC.
                            </p>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                                >
                                    <X size={16} className="mr-2" />
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                onClick={startStreaming}
                                disabled={!streamKey || isLoading}
                                className="bg-red-900 hover:bg-red-800 text-zinc-100"
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                ) : (
                                    <Youtube size={16} className="mr-2" />
                                )}
                                Start Streaming
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default YouTubeStream;