"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import HLSStreamPlayer from "@/components/hls-stream-player";
import { Button } from "@/components/ui/button";

export const runtime = 'edge';

const StreamViewPage = () => {
    const params = useParams();
    const roomId = params?.id as string;

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) return;
        const checkStreamStatus = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const response = await fetch(`${backendUrl}/streams/info/${roomId}`);
                const data: { isActive: boolean; playbackUrl: string; } = await response.json();

                if (data.isActive && data.playbackUrl) {
                    setStreamUrl(`${backendUrl}${data.playbackUrl}`);
                } else {
                    setError("This stream is not currently active.");
                }
            } catch (err) {
                setError("Failed to connect to the stream. Please try again later.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        checkStreamStatus();
        const interval = setInterval(checkStreamStatus, 10000);
        return () => clearInterval(interval);
    }, [roomId]);

    return (
        <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
            <header className="bg-zinc-900 p-3 shadow-md border-b border-zinc-800">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button
                                variant="outline"
                                size="icon"
                                className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
                            >
                                <ArrowLeft size={18} />
                            </Button>
                        </Link>
                        <h1 className="text-lg font-medium">Live Stream: {roomId}</h1>
                    </div>

                    <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-900 text-red-100">
                            LIVE
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4">
                <div className="max-w-5xl mx-auto bg-zinc-900 rounded-lg overflow-hidden shadow-lg border border-zinc-800">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-zinc-400">Loading stream...</div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-96">
                            <div className="text-red-400 mb-4">{error}</div>
                            <Link href="/">
                                <Button className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                                    Return Home
                                </Button>
                            </Link>
                        </div>
                    ) : streamUrl ? (
                        <HLSStreamPlayer
                            src={streamUrl}
                            autoPlay={true}
                            controls={true}
                            className="w-full aspect-video"
                        />
                    ) : null}
                </div>
            </main>
        </div>
    );
};

export default StreamViewPage;