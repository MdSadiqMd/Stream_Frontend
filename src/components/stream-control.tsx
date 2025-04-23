"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Link, ExternalLink } from "lucide-react";

import { SocketContext } from "@/context/SocketContext";
import { START_HLS_STREAM, STOP_HLS_STREAM, STREAMING_STATUS, BINARY_STREAM } from "@/constants/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface StreamControlProps {
    roomId: string;
    localStream?: MediaStream;
}

const StreamControl: React.FC<StreamControlProps> = ({ roomId, localStream }) => {
    const { socket } = useContext(SocketContext);
    const [isStreaming, setIsStreaming] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const [showStreamInfo, setShowStreamInfo] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamInterval = useRef<NodeJS.Timeout | null>(null);
    const viewerUrl = playbackUrl ? `${window.location.origin}/stream/${roomId}` : null;

    useEffect(() => {
        if (!socket) return;
        socket.on(STREAMING_STATUS, ({ streaming, playbackUrl }: { streaming: boolean, playbackUrl?: string; }) => {
            setIsStreaming(streaming);
            if (playbackUrl) {
                const fullUrl = `${window.location.origin}${playbackUrl}`;
                setPlaybackUrl(fullUrl);
            } else {
                setPlaybackUrl(null);
            }
        });

        return () => {
            socket.off(STREAMING_STATUS);
        };
    }, [socket]);

    const startStreaming = () => {
        if (!localStream || !socket) return;
        socket.emit(START_HLS_STREAM, { roomId }, (response: any) => {
            if (response.error) {
                console.error("Stream error:", response.error);
                return;
            }

            if (response.success) {
                setIsStreaming(true);
                if (response.playbackUrl) {
                    const fullUrl = `${window.location.origin}${response.playbackUrl}`;
                    setPlaybackUrl(fullUrl);
                }

                const options = {
                    mimeType: 'video/webm;codecs=vp8,opus',
                    videoBitsPerSecond: 2500000,
                    audioBitsPerSecond: 128000
                };

                try {
                    const mediaRecorder = new MediaRecorder(localStream, options);
                    mediaRecorderRef.current = mediaRecorder;
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && socket.connected) {
                            socket.emit(BINARY_STREAM, event.data);
                        }
                    };

                    mediaRecorder.start(200);
                    streamInterval.current = setInterval(() => {
                        if (!socket.connected) {
                            stopStreaming();
                        }
                    }, 5000);
                } catch (error) {
                    console.error("MediaRecorder error:", error);
                    stopStreaming();
                }
            }
        });
    };

    const stopStreaming = () => {
        if (!socket) return;
        if (mediaRecorderRef.current) {
            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            mediaRecorderRef.current = null;
        }

        if (streamInterval.current) {
            clearInterval(streamInterval.current);
            streamInterval.current = null;
        }

        socket.emit(STOP_HLS_STREAM, { roomId }, (response: any) => {
            if (response.error) {
                console.error("Stream error:", response.error);
            }
            setIsStreaming(false);
            setPlaybackUrl(null);
        });
    };

    const copyStreamLink = () => {
        if (viewerUrl) {
            navigator.clipboard.writeText(viewerUrl);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={isStreaming ? stopStreaming : () => setShowStreamInfo(true)}
                className={isStreaming
                    ? "bg-red-600 border-red-500 text-white hover:bg-red-700"
                    : "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"}
            >
                {isStreaming ? (
                    <>
                        <CameraOff size={14} className="mr-2" />
                        Stop Stream
                    </>
                ) : (
                    <>
                        <Camera size={14} className="mr-2" />
                        Start Stream
                    </>
                )}
            </Button>

            {isStreaming && viewerUrl && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyStreamLink}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 ml-2"
                >
                    <Link size={14} className="mr-2" />
                    Copy Viewer Link
                </Button>
            )}

            {isStreaming && viewerUrl && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(viewerUrl, '_blank')}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 ml-2"
                >
                    <ExternalLink size={14} className="mr-2" />
                    Open Stream
                </Button>
            )}

            <Dialog open={showStreamInfo} onOpenChange={setShowStreamInfo}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle>Start Live Stream</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            You&apos;re about to start streaming your video feed. Viewers will be able to watch without joining the call.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="text-sm text-zinc-300">
                            <p>By starting the stream:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Anyone with the link can watch your stream</li>
                                <li>Your camera and microphone will be broadcast</li>
                                <li>Stream quality depends on your internet connection</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowStreamInfo(false)}
                                className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    startStreaming();
                                    setShowStreamInfo(false);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Start Stream
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default StreamControl;