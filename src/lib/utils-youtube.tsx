"use client";
import { useEffect, useRef, useState } from "react";

import { BINARY_STREAM, STOP_YOUTUBE_STREAM, STREAMING_STATUS } from "@/constants/constants";

export const useMediaRecorder = (
    socket: any,
    stream: MediaStream | undefined,
    isStreaming: boolean,
    roomId: string
) => {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (!isStreaming || !stream || !socket) return;

        try {
            const options = {
                mimeType: 'video/webm;codecs=vp8,opus',
                audioBitsPerSecond: 128000,
                videoBitsPerSecond: 2500000,
            };

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    socket.emit(BINARY_STREAM, event.data);
                }
            };
            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                setError('Recording error occurred. Streaming may be interrupted.');
            };

            mediaRecorder.start(100);
            console.log('MediaRecorder started for YouTube streaming');

        } catch (err) {
            console.error('Error creating MediaRecorder:', err);
            setError('Your browser does not support the required format for streaming.');
            socket.emit(STOP_YOUTUBE_STREAM, { roomId });
        }

        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                console.log('MediaRecorder stopped');
            }
        };
    }, [isStreaming, stream, socket, roomId]);

    return { error, mediaRecorder: mediaRecorderRef.current };
};

export const useStreamingStatus = (socket: any, roomId: string) => {
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        if (!socket) return;
        const handleStreamingStatus = (data: { streaming: boolean; }) => {
            setIsStreaming(data.streaming);
        };
        socket.on(STREAMING_STATUS, handleStreamingStatus);

        return () => {
            socket.off(STREAMING_STATUS, handleStreamingStatus);
        };
    }, [socket, roomId]);

    return { isStreaming, setIsStreaming };
};