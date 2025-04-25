"use client";
import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HLSStreamPlayerProps {
    src: string;
    autoPlay?: boolean;
    controls?: boolean;
    muted?: boolean;
    className?: string;
    lowLatency?: boolean;
}

const HLSStreamPlayer: React.FC<HLSStreamPlayerProps> = ({
    src,
    autoPlay = true,
    controls = true,
    muted = false,
    className = "w-full h-full",
    lowLatency = true,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const maxRetries = 5;

    const healthRef = useRef({
        lastBufferCheck: 0,
        bufferStalls: 0,
        lastPosition: 0,
        playbackIssues: 0,
        manifestLoadTime: 0
    });

    const initPlayer = () => {
        if (!videoRef.current) return;
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        setIsLoading(true);
        setError(null);

        const cacheBustSrc = `${src}${src.includes('?') ? '&' : '?'}_t=${Date.now()}`;

        if (Hls.isSupported()) {
            const hlsConfig: any = {
                debug: false,
                // These settings focus on low latency
                enableWorker: true,
                lowLatencyMode: lowLatency,
                liveSyncDuration: lowLatency ? 1 : 3,
                liveMaxLatencyDuration: lowLatency ? 3 : 10,
                liveDurationInfinity: true,
                // Buffer settings
                maxBufferLength: lowLatency ? 4 : 10,
                maxBufferSize: lowLatency ? 10 : 30,
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 1,
                // Optimize network settings
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 4,
                fragLoadingMaxRetry: 4,
                // Try to recover from errors
                startFragPrefetch: true,
                testBandwidth: true
            };

            const hls = new Hls(hlsConfig);
            hlsRef.current = hls;
            hls.loadSource(cacheBustSrc);
            hls.attachMedia(videoRef.current);
            setupHlsEventHandlers(hls);
        }
        else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
            videoRef.current.src = cacheBustSrc;
            videoRef.current.addEventListener("loadedmetadata", () => {
                setIsLoading(false);
                setError(null);
                attemptAutoPlay();
            });

            videoRef.current.addEventListener("error", (e) => {
                const videoElement = e.target as HTMLVideoElement;
                const errorCode = videoElement.error ? videoElement.error.code : 0;
                console.error(`Video element error code ${errorCode}:`, videoElement.error);
                handlePlaybackError();
            });
            setupNativePlaybackMonitoring();
        }
        else {
            setError("HLS is not supported in this browser");
            setIsLoading(false);
        }
    };

    const setupHlsEventHandlers = (hls: Hls) => {
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            setIsLoading(false);
            if (data.levels.length > 0) {
                const hasLiveStreams = data.levels.some(level => level.details?.live);
                setIsLive(hasLiveStreams);
            }
            attemptAutoPlay();
        });

        hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
            healthRef.current.manifestLoadTime = Date.now();
            if (data.details.live) {
                setIsLive(true);
                if (lowLatency && videoRef.current) {
                    const seekPosition = videoRef.current.duration - 1;
                    if (seekPosition > 0) {
                        videoRef.current.currentTime = seekPosition;
                    }
                }
            }
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
            healthRef.current.bufferStalls = 0;
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
            console.error("HLS error:", data.type, data.details);
            if (data.fatal) {
                if (retryCount < maxRetries) {
                    setError(`Loading stream... (retry ${retryCount + 1}/${maxRetries})`);
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        hls.startLoad();
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        handlePlaybackError();
                    }
                } else {
                    setError("Could not load stream after multiple attempts. Please try again later.");
                    if (hls) {
                        hls.destroy();
                        hlsRef.current = null;
                    }
                }
            }
        });
    };

    const setupNativePlaybackMonitoring = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        video.addEventListener('waiting', () => {
            healthRef.current.bufferStalls++;
            if (healthRef.current.bufferStalls > 3) {
                handlePlaybackError();
            }
        });

        video.addEventListener('timeupdate', () => {
            const currentTime = video.currentTime;
            const lastPosition = healthRef.current.lastPosition;

            if (Math.abs(currentTime - lastPosition) < 0.1 && !video.paused) {
                healthRef.current.playbackIssues++;
                if (healthRef.current.playbackIssues > 5) {
                    handlePlaybackError();
                }
            } else {
                healthRef.current.playbackIssues = 0;
            }
            healthRef.current.lastPosition = currentTime;
        });
    };

    const attemptAutoPlay = () => {
        if (!videoRef.current || !autoPlay) return;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch((e) => {
                console.error("Error playing video:", e);
                if (e.name === 'NotAllowedError') {
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(err => {
                            console.error("Still failed to play even with mute:", err);
                        });
                    }
                }
            });
        }
    };

    const handlePlaybackError = () => {
        if (retryCount < maxRetries) {
            setError(`Loading stream... (retry ${retryCount + 1}/${maxRetries})`);
            const retryDelay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);

            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                initPlayer();
            }, retryDelay);
        } else {
            setError("Could not load stream after multiple attempts. Please try again later.");
        }
    };

    useEffect(() => {
        setRetryCount(0);
        setIsLoading(true);
        setError(null);
        initPlayer();

        let periodicReload: NodeJS.Timeout | null = null;
        if (lowLatency) {
            periodicReload = setInterval(() => {
                if (hlsRef.current && !isLoading && !error) {
                    hlsRef.current.startLoad();
                }
            }, 20000);
        }

        return () => {
            if (periodicReload) {
                clearInterval(periodicReload);
            }

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, lowLatency]);

    return (
        <div className="relative w-full h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                        <p className="text-white">Loading stream...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                    <div className="flex flex-col items-center text-center p-4">
                        <p className="text-white mb-4">{error}</p>
                        {retryCount >= maxRetries && (
                            <button
                                onClick={() => setRetryCount(0)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isLive && (
                <div className="absolute top-3 right-3 z-10">
                    <span className="bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center">
                        <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                        LIVE
                    </span>
                </div>
            )}

            <video
                ref={videoRef}
                className={className}
                controls={controls}
                autoPlay={autoPlay}
                muted={muted}
                playsInline
                style={{ backgroundColor: '#000' }}
            />
        </div>
    );
};

export default HLSStreamPlayer;