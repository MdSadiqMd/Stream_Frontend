"use client";
import React, { useState, useContext, useEffect, useRef } from "react";
import { Youtube, X, Loader2, ScreenShare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { SocketContext } from "@/context/SocketContext";
import { START_YOUTUBE_STREAM, STOP_YOUTUBE_STREAM, STREAMING_STATUS, BINARY_STREAM } from "@/constants/constants";

interface YouTubeStreamProps {
    roomId: string;
}

const YouTubeStream: React.FC<YouTubeStreamProps> = ({ roomId }) => {
    const { socket, stream: userStream } = useContext(SocketContext);
    const [streamKey, setStreamKey] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [streamerId, setStreamerId] = useState<string | null>(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const compositeStreamRef = useRef<MediaStream | null>(null);
    const renderFrameRef = useRef<number | null>(null);
    const chunkBufferRef = useRef<Blob[]>([]);
    const chunkIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (!socket) return;

        const handleStreamingStatus = (data: { streaming: boolean, streamerId?: string; }) => {
            setIsStreaming(data.streaming);

            if (data.streaming && data.streamerId) {
                setStreamerId(data.streamerId);
            } else {
                setStreamerId(null);
                stopCompositeStream();
            }
        };

        socket.on(STREAMING_STATUS, handleStreamingStatus);

        return () => {
            socket.off(STREAMING_STATUS, handleStreamingStatus);
        };
    }, [socket]);

    useEffect(() => {
        return () => {
            stopCompositeStream();
        };
    }, []);

    const startCompositeStream = async () => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }

        const canvas = canvasRef.current;
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setError("Failed to create canvas context for streaming");
            return null;
        }

        const canvasStream = canvas.captureStream(30);
        if (userStream && userStream.getAudioTracks().length > 0) {
            const audioTrack = userStream.getAudioTracks()[0];
            canvasStream.addTrack(audioTrack);
        }

        compositeStreamRef.current = canvasStream;

        const drawVideoGrid = () => {
            if (!ctx || !canvas) return;
            ctx.fillStyle = '#1f1f23';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const videoElements = Array.from(document.querySelectorAll('video'));

            if (videoElements.length === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('No video feeds available', canvas.width / 2, canvas.height / 2);
                renderFrameRef.current = requestAnimationFrame(drawVideoGrid);
                return;
            }

            if (isScreenSharing && screenStreamRef.current) {
                const screenVideo = document.createElement('video');
                screenVideo.srcObject = screenStreamRef.current;
                screenVideo.autoplay = true;
                screenVideo.muted = true;
                try {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(10, canvas.height - 40, 200, 30);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText('Screen Share', 20, canvas.height - 20);

                    if (screenVideo.readyState >= 2) {
                        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
                    }
                } catch (e) {
                    console.log("Error drawing screen video", e);
                }
            } else {
                let cols: number;
                let rows: number;

                if (videoElements.length <= 1) {
                    cols = 1;
                    rows = 1;
                } else if (videoElements.length <= 2) {
                    cols = 2;
                    rows = 1;
                } else if (videoElements.length <= 4) {
                    cols = 2;
                    rows = 2;
                } else if (videoElements.length <= 6) {
                    cols = 3;
                    rows = 2;
                } else if (videoElements.length <= 9) {
                    cols = 3;
                    rows = 3;
                } else {
                    cols = 4;
                    rows = Math.ceil(videoElements.length / 4);
                }
                const cellWidth = canvas.width / cols;
                const cellHeight = canvas.height / rows;
                const gap = 10;
                const videoWidth = cellWidth - gap;
                const videoHeight = cellHeight - gap;
                videoElements.forEach((video, index) => {
                    if (index >= cols * rows) return;

                    const col = index % cols;
                    const row = Math.floor(index / cols);

                    const x = col * cellWidth + gap / 2;
                    const y = row * cellHeight + gap / 2;

                    if (video.readyState < 2) return;
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(x, y, videoWidth, videoHeight, 10);
                    ctx.clip();

                    try {
                        ctx.drawImage(video, x, y, videoWidth, videoHeight);
                    } catch (e) {
                        console.log("Error drawing video", e);
                    }

                    ctx.restore();

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(x, y + videoHeight - 30, videoWidth, 30);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(index === 0 ? 'You' : `User ${index}`, x + 10, y + videoHeight - 10);
                });
            }

            renderFrameRef.current = requestAnimationFrame(drawVideoGrid);
        };
        drawVideoGrid();
        return canvasStream;
    };

    const stopCompositeStream = () => {
        if (renderFrameRef.current) {
            cancelAnimationFrame(renderFrameRef.current);
            renderFrameRef.current = null;
        }
        if (chunkIntervalRef.current) {
            clearInterval(chunkIntervalRef.current);
            chunkIntervalRef.current = null;
        }

        chunkBufferRef.current = [];
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (compositeStreamRef.current) {
            compositeStreamRef.current.getTracks().forEach(track => track.stop());
            compositeStreamRef.current = null;
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
    };

    const startStreaming = async () => {
        if (!socket || !userStream || !streamKey) {
            setError("Missing stream key or connection");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            socket.emit(START_YOUTUBE_STREAM, {
                roomId,
                streamKey,
            }, async (response: any) => {
                if (response && response.success) {
                    try {
                        const compositeStream = await startCompositeStream();

                        if (!compositeStream) {
                            setError("Failed to create composite stream");
                            setIsLoading(false);
                            return;
                        }

                        startMediaRecorder(compositeStream);
                        setIsStreaming(true);
                        setOpen(false);
                    } catch (err) {
                        console.error("Error creating composite stream:", err);
                        setError("Failed to create composite stream");
                    }
                } else if (response && response.error) {
                    setError(response.error);
                } else {
                    setError("Failed to start streaming. Please try again.");
                }
                setIsLoading(false);
            });
        } catch (err) {
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    const toggleScreenShare = async () => {
        if (!compositeStreamRef.current) return;
        if (isScreenSharing && screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
            setIsScreenSharing(false);
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 30
                },
                audio: true
            });

            screenStreamRef.current = screenStream;
            setIsScreenSharing(true);
            screenStream.getVideoTracks()[0].onended = () => {
                if (screenStreamRef.current) {
                    screenStreamRef.current = null;
                    setIsScreenSharing(false);
                }
            };
        } catch (err) {
            console.error("Error starting screen share:", err);
            setError("Could not start screen sharing. Please try again.");
        }
    };
    const startMediaRecorder = (stream: MediaStream) => {
        try {
            const options = {
                mimeType: 'video/webm;codecs=vp8,opus',
                audioBitsPerSecond: 128000,
                videoBitsPerSecond: 2500000,
            };

            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            if (chunkIntervalRef.current) {
                clearInterval(chunkIntervalRef.current);
            }
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunkBufferRef.current.push(event.data);
                }
            };

            chunkIntervalRef.current = window.setInterval(() => {
                if (chunkBufferRef.current.length > 0 && socket) {
                    const combinedBlob = new Blob(chunkBufferRef.current, { type: 'video/webm' });
                    socket.emit(BINARY_STREAM, combinedBlob, { roomId });
                    chunkBufferRef.current = [];
                }
            }, 100);

            recorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                setError('Recording error occurred. Streaming may be interrupted.');
            };
            recorder.start(250);
            console.log('MediaRecorder started for YouTube streaming');
        } catch (error) {
            console.error('Error creating MediaRecorder:', error);
            setError('Your browser does not support the required recording format.');
        }
    };

    const stopStreaming = () => {
        if (!socket) return;
        setIsLoading(true);

        stopCompositeStream();
        socket.emit(STOP_YOUTUBE_STREAM, { roomId }, (response: any) => {
            setIsLoading(false);
            if (response && response.success) {
                setIsStreaming(false);
            } else if (response && response.error) {
                setError(response.error);
            }
        });
    };

    const isStreamer = socket && streamerId === socket.id;

    return (
        <>
            {isStreaming ? (
                <div className="flex items-center gap-2">
                    {isStreamer && (
                        <>
                            <Button
                                onClick={toggleScreenShare}
                                className={`flex items-center gap-2 ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-800 hover:bg-zinc-700'} text-zinc-100`}
                                title={isScreenSharing ? "Switch to composite view" : "Share screen"}
                            >
                                <ScreenShare size={18} />
                            </Button>

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
                        </>
                    )}

                    {!isStreamer && (
                        <div className="px-3 py-1 bg-red-900/70 rounded-md flex items-center">
                            <Youtube size={16} className="mr-2" />
                            <span className="text-sm">Live on YouTube</span>
                        </div>
                    )}
                </div>
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
                            <div className="mt-4 p-3 bg-zinc-800 rounded-md border border-zinc-700">
                                <p className="text-xs text-zinc-400">
                                    All participants will be shown in a grid layout on the YouTube stream.
                                    You can also share your screen during the stream.
                                </p>
                            </div>
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