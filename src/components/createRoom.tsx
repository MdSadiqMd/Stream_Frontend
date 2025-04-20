"use client";
import { useContext } from "react";
import { Video } from "lucide-react";

import { SocketContext } from "@/context/SocketContext";
import { CREATE_SOCKET } from "@/constants/constants";
import { Button } from "@/components/ui/button";

const CreateRoom: React.FC = () => {
    const { socket } = useContext(SocketContext);

    const initRoom = () => {
        socket.emit(CREATE_SOCKET);
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-lg shadow-md border border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-zinc-100">Start a Meeting</h2>
            <Button
                onClick={initRoom}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none"
            >
                <Video size={18} />
                <span>Create new room</span>
            </Button>
        </div>
    );
};

export default CreateRoom;