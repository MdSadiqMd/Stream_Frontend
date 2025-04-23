"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HLSStreamPlayerProps {
    src: string;
    autoPlay?: boolean;
    controls?: boolean;
    muted?: boolean;
    className?: string;
}

const HLSStreamPlayer: React.FC<HLSStreamPlayerProps> = ({
    src,
    autoPlay = true,
    controls = true,
    muted = false,
    className = "w-full h-full",
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let hls: Hls | null = null;
        const initPlayer = () => {
            if (!videoRef.current) return;
            if (Hls.isSupported()) {
                hls = new Hls({
                    liveDurationInfinity: true,
                    lowLatencyMode: true,
                    liveSyncDuration: 2,
                    liveMaxLatencyDuration: 10,
                    maxBufferLength: 10,
                    maxBufferSize: 30,
                });

                hls.loadSource(src);
                hls.attachMedia(videoRef.current);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    if (autoPlay && videoRef.current) {
                        videoRef.current.play().catch((e) => {
                            console.error("Error playing video:", e);
                        });
                    }
                });

                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (data.fatal) {
                        setError(`HLS error: ${data.type} - ${data.details}`);
                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                            hls?.startLoad();
                        }
                    }
                });
            } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
                videoRef.current.src = src;
                videoRef.current.addEventListener("loadedmetadata", () => {
                    setIsLoading(false);
                    if (autoPlay && videoRef.current) {
                        videoRef.current.play().catch((e) => {
                            console.error("Error playing video:", e);
                        });
                    }
                });

                videoRef.current.addEventListener("error", () => {
                    setError("Error loading video");
                });
            } else {
                setError("HLS is not supported in this browser");
            }
        };

        initPlayer();
        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [src, autoPlay]);

    return (
        <div className="relative w-full h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                    <div className="text-zinc-100">Loading stream...</div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                    <div className="text-red-400">{error}</div>
                </div>
            )}

            <video
                ref={videoRef}
                className={className}
                controls={controls}
                muted={muted}
                playsInline
            />
        </div>
    );
};

export default HLSStreamPlayer;