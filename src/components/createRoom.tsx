"use client";
import { useContext, useState, useEffect } from "react";
import { Video, Loader } from "lucide-react";

import { SocketContext } from "@/context/SocketContext";
import { CREATE_SOCKET, ROOM_SOCKET } from "@/constants/constants";
import { Button } from "@/components/ui/button";

const CreateRoom: React.FC = () => {
    const { socket } = useContext(SocketContext);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;
        const handleRoomCreated = () => {
            console.log("Room created, waiting for navigation...");
        };

        socket.on(ROOM_SOCKET, handleRoomCreated);
        return () => {
            socket.off(ROOM_SOCKET, handleRoomCreated);
        };
    }, [socket]);

    const initRoom = () => {
        if (!socket) {
            setError("Socket connection not available");
            return;
        }
        setIsCreating(true);
        setError(null);

        socket.emit(CREATE_SOCKET);
        setTimeout(() => {
            if (isCreating) {
                setIsCreating(false);
                setError("Room creation timed out. Please try again.");
            }
        }, 10000);
    };

    return (
        <div className="h-screen flex flex-col items-center justify-center p-6 bg-zinc-900 shadow-md border border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-zinc-100">Start a Meeting</h2>

            {error && (
                <div className="mb-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <Button
                onClick={initRoom}
                disabled={isCreating}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none min-w-40 justify-center"
            >
                {isCreating ? (
                    <>
                        <Loader size={18} className="animate-spin" />
                        <span>Creating room...</span>
                    </>
                ) : (
                    <>
                        <Video size={18} />
                        <span>Create new room</span>
                    </>
                )}
            </Button>

            {isCreating && (
                <div className="mt-4 text-zinc-400 text-sm animate-pulse">
                    Please wait while we set up your room...
                </div>
            )}
        </div>
    );
};

export default CreateRoom;