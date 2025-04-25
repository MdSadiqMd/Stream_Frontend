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

const TIMESLICE_MS = 150;

const StreamControl: React.FC<StreamControlProps> = ({ roomId, localStream }) => {
    const { socket } = useContext(SocketContext);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const [showStreamInfo, setShowStreamInfo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamInterval = useRef<NodeJS.Timeout | null>(null);
    const viewerUrl = playbackUrl ? `${window.location.origin}/stream/${roomId}` : null;

    const statsRef = useRef({
        bytesSent: 0,
        chunksSent: 0,
        startTime: 0,
        lastBitrateUpdate: 0,
        currentBitrate: 0
    });

    useEffect(() => {
        if (!socket) return;
        socket.on(STREAMING_STATUS, ({ streaming, playbackUrl }: { streaming: boolean, playbackUrl?: string; }) => {
            setIsStreaming(streaming);
            setIsStarting(false);
            setIsStopping(false);

            if (playbackUrl) {
                const fullUrl = `${window.location.origin}${playbackUrl}`;
                setPlaybackUrl(fullUrl);
                console.log("Playback URL set to:", fullUrl);
            } else {
                setPlaybackUrl(null);
            }
        });

        return () => {
            socket.off(STREAMING_STATUS);
        };
    }, [socket]);

    const getVideoBitrate = () => {
        switch (quality) {
            case 'high': return 1200000; // 1.2 Mbps
            case 'low': return 500000;   // 500 Kbps
            default: return 800000;      // 800 Kbps (medium)
        }
    };

    const startStreaming = () => {
        if (!localStream || !socket) {
            setError("No local stream or socket connection available");
            return;
        }
        setIsStarting(true);
        setError(null);

        socket.emit(START_HLS_STREAM, { roomId }, (response: any) => {
            if (response.error) {
                console.error("Stream error:", response.error);
                setError(`Failed to start stream: ${response.error}`);
                setIsStarting(false);
                return;
            }

            if (response.success) {
                setIsStreaming(true);
                setIsStarting(false);
                if (response.playbackUrl) {
                    const fullUrl = `${window.location.origin}${response.playbackUrl}`;
                    setPlaybackUrl(fullUrl);
                    console.log("Playback URL:", fullUrl);
                }

                statsRef.current = {
                    bytesSent: 0,
                    chunksSent: 0,
                    startTime: Date.now(),
                    lastBitrateUpdate: Date.now(),
                    currentBitrate: 0
                };

                const supportedTypes = [
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=h264,opus',
                    'video/webm',
                    'video/mp4;codecs=h264,aac',
                    'video/mp4'
                ];

                let selectedType: string | null = null;
                for (const type of supportedTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        selectedType = type;
                        console.log(`Using MIME type: ${type}`);
                        break;
                    }
                }

                if (!selectedType) {
                    console.warn("No supported MIME types found, falling back to default");
                    selectedType = 'video/webm';
                }

                try {
                    const options = {
                        mimeType: selectedType,
                        videoBitsPerSecond: getVideoBitrate(),
                        audioBitsPerSecond: 128000
                    };

                    const mediaRecorder = new MediaRecorder(localStream, options);
                    mediaRecorderRef.current = mediaRecorder;
                    mediaRecorder.ondataavailable = async (event) => {
                        if (event.data && event.data.size > 0 && socket.connected) {
                            try {
                                const buffer = await event.data.arrayBuffer();
                                socket.emit(BINARY_STREAM, buffer);

                                statsRef.current.bytesSent += buffer.byteLength;
                                statsRef.current.chunksSent++;
                                const now = Date.now();
                                if (now - statsRef.current.lastBitrateUpdate > 1000) {
                                    const elapsed = (now - statsRef.current.lastBitrateUpdate) / 1000;
                                    statsRef.current.currentBitrate = Math.round(
                                        (statsRef.current.bytesSent * 8) / elapsed / 1000
                                    );
                                    statsRef.current.bytesSent = 0;
                                    statsRef.current.lastBitrateUpdate = now;
                                }
                            } catch (err) {
                                console.error("Error sending media chunk:", err);
                            }
                        }
                    };

                    mediaRecorder.start(TIMESLICE_MS);
                    streamInterval.current = setInterval(() => {
                        if (!socket.connected) {
                            stopStreaming();
                        }
                    }, 3000);
                } catch (error: any) {
                    console.error("MediaRecorder error:", error);
                    setError(`MediaRecorder error: ${error.message}`);
                    stopStreaming();
                }
            }
        });
    };

    const stopStreaming = () => {
        if (!socket) return;
        setIsStopping(true);
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
                setError(`Failed to stop stream: ${response.error}`);
            }

            setIsStreaming(false);
            setIsStopping(false);
            setPlaybackUrl(null);
        });
    };

    const copyStreamLink = () => {
        if (viewerUrl) {
            navigator.clipboard.writeText(viewerUrl);
        }
    };

    const changeQuality = (newQuality: 'high' | 'medium' | 'low') => {
        if (newQuality === quality) return;
        setQuality(newQuality);

        if (isStreaming && mediaRecorderRef.current) {
            const currentRecorder = mediaRecorderRef.current;
            if (currentRecorder.state === 'recording') {
                currentRecorder.stop();
                setTimeout(() => {
                    if (!localStream) return;
                    try {
                        const options = {
                            mimeType: currentRecorder.mimeType,
                            videoBitsPerSecond: getVideoBitrate(),
                            audioBitsPerSecond: 128000
                        };

                        const newRecorder = new MediaRecorder(localStream, options);
                        mediaRecorderRef.current = newRecorder;
                        newRecorder.ondataavailable = currentRecorder.ondataavailable;
                        newRecorder.start(TIMESLICE_MS);
                    } catch (error) {
                        console.error("Error restarting recorder:", error);
                    }
                }, 200);
            }
        }
    };

    return (
        <div className="flex flex-col space-y-3">
            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={() => isStreaming ? stopStreaming() : setShowStreamInfo(true)}
                    disabled={isStarting || isStopping}
                    className={isStreaming
                        ? "bg-red-600 border-red-500 text-white hover:bg-red-700"
                        : "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"}
                >
                    {isStarting ? (
                        "Starting..."
                    ) : isStopping ? (
                        "Stopping..."
                    ) : isStreaming ? (
                        <>
                            <CameraOff size={16} className="mr-2" />
                            Stop Stream
                        </>
                    ) : (
                        <>
                            <Camera size={16} className="mr-2" />
                            Start Stream
                        </>
                    )}
                </Button>

                {isStreaming && viewerUrl && (
                    <>
                        <Button
                            onClick={copyStreamLink}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
                        >
                            <Link size={16} className="mr-2" />
                            Copy Link
                        </Button>

                        <Button
                            onClick={() => window.open(viewerUrl, '_blank')}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
                        >
                            <ExternalLink size={16} className="mr-2" />
                            Open Stream
                        </Button>
                    </>
                )}
            </div>

            {isStreaming && (
                <div className="flex items-center gap-2 text-sm">
                    <span>Quality:</span>
                    <div className="flex rounded-md overflow-hidden border border-zinc-700">
                        <button
                            onClick={() => changeQuality('low')}
                            className={`px-2 py-1 text-xs ${quality === 'low'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                        >
                            Low
                        </button>
                        <button
                            onClick={() => changeQuality('medium')}
                            className={`px-2 py-1 text-xs ${quality === 'medium'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                        >
                            Medium
                        </button>
                        <button
                            onClick={() => changeQuality('high')}
                            className={`px-2 py-1 text-xs ${quality === 'high'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                        >
                            High
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="text-red-500 text-sm">
                    {error}
                </div>
            )}

            <Dialog open={showStreamInfo} onOpenChange={setShowStreamInfo}>
                <DialogContent>
                    <div className="space-y-4">
                        <div className="bg-zinc-100 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Choose Quality:</h4>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => setQuality('low')}
                                    className={`px-3 py-1 rounded ${quality === 'low'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-zinc-700 text-zinc-200'}`}
                                >
                                    Low
                                </button>
                                <button
                                    onClick={() => setQuality('medium')}
                                    className={`px-3 py-1 rounded ${quality === 'medium'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-zinc-700 text-zinc-200'}`}
                                >
                                    Medium
                                </button>
                                <button
                                    onClick={() => setQuality('high')}
                                    className={`px-3 py-1 rounded ${quality === 'high'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-zinc-700 text-zinc-200'}`}
                                >
                                    High
                                </button>
                            </div>
                            <p className="text-xs mt-2 text-zinc-400">
                                Choose lower quality for more reliable streaming on slower connections.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
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
        </div>
    );
};

export default StreamControl;