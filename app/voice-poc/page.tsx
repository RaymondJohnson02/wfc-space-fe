"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    PhoneCall,
    PhoneOff,
    Users,
    Radio,
    Info,
    Sparkles,
    CheckCircle2,
    ArrowLeft,
    Activity,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LobbyLayout from "@/components/layout/LobbyLayout";
import { createSignalRConnection } from "@/services/signalr";
import { HubConnection, HubConnectionState } from "@microsoft/signalr";

// Free public Google STUN server for NAT discovery
const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

interface PeerState {
    connectionId: string;
    username: string;
    isMuted: boolean;
    isSpeaking: boolean;
    stream?: MediaStream;
    volume: number; // 0 to 1
    connectionState: string;
}

interface LogEntry {
    id: string;
    timestamp: string;
    source: "signalr" | "webrtc" | "system";
    message: string;
}

export default function VoicePocPage() {
    // Connection & User Identity States
    const [username, setUsername] = useState("");
    const [roomId, setRoomId] = useState("voice-lounge");
    const [isConnected, setIsConnected] = useState(false);
    const [myConnectionId, setMyConnectionId] = useState<string | null>(null);

    // Audio Control States
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [localVolume, setLocalVolume] = useState(0); // 0-100 for mic meter

    // Peers & Logs
    const [peers, setPeers] = useState<PeerState[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Refs for WebRTC & Audio Context
    const signalRRef = useRef<HubConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const candidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Helper to log diagnostic events on screen
    const addLog = (source: LogEntry["source"], message: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [
            { id: Math.random().toString(), timestamp: time, source, message },
            ...prev.slice(0, 49), // Keep latest 50 logs
        ]);
    };

    // Auto-generate random username on mount
    useEffect(() => {
        setUsername(`Explorer-${Math.floor(100 + Math.random() * 900)}`);
    }, []);

    // =========================================================================
    // STEP 1: Microhpone Capture & Audio Level Visualizer (Web Audio API)
    // =========================================================================
    const setupLocalMicrophone = async (): Promise<MediaStream> => {
        addLog("system", "Requesting microphone permissions...");
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });

        localStreamRef.current = stream;
        addLog("system", "Microphone stream acquired successfully.");

        // Hook up Web Audio API AnalyserNode to calculate volume meter
        try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const sourceNode = audioCtx.createMediaStreamSource(stream);
            sourceNode.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkAudioLevel = () => {
                if (!localStreamRef.current) return;
                analyser.getByteFrequencyData(dataArray);

                // Compute average audio power
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                // Scale to 0-100 percentage
                const normalized = Math.min(100, Math.round((average / 128) * 100));
                setLocalVolume(normalized);

                animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
            };

            checkAudioLevel();
        } catch (err) {
            console.warn("Audio meter could not be initialized:", err);
        }

        return stream;
    };

    // =========================================================================
    // STEP 2 & 3: WebRTC Peer Connection Factory (Peer-to-Peer Mesh)
    // =========================================================================
    const createPeerConnection = (targetConnectionId: string, peerUsername: string, isInitiator: boolean) => {
        addLog("webrtc", `Creating RTCPeerConnection for ${peerUsername} (${isInitiator ? "Caller" : "Callee"})`);

        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionsRef.current.set(targetConnectionId, pc);

        // Add our local microphone track to the connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Track ICE Candidates generated by our browser & send them via SignalR
        pc.onicecandidate = (event) => {
            if (event.candidate && signalRRef.current?.state === HubConnectionState.Connected) {
                signalRRef.current.invoke(
                    "SendIceCandidate",
                    targetConnectionId,
                    JSON.stringify(event.candidate)
                );
            }
        };

        // When remote audio track is received from the other browser
        pc.ontrack = (event) => {
            addLog("webrtc", `Audio stream received from ${peerUsername}!`);
            const [remoteStream] = event.streams;

            setPeers((prev) =>
                prev.map((p) =>
                    p.connectionId === targetConnectionId
                        ? { ...p, stream: remoteStream, connectionState: "connected" }
                        : p
                )
            );
        };

        pc.onconnectionstatechange = () => {
            addLog("webrtc", `Connection state with ${peerUsername}: ${pc.connectionState}`);
            setPeers((prev) =>
                prev.map((p) =>
                    p.connectionId === targetConnectionId
                        ? { ...p, connectionState: pc.connectionState }
                        : p
                )
            );
        };

        // If we are the initiator (e.g. we just joined), generate the SDP Offer
        if (isInitiator) {
            (async () => {
                try {
                    addLog("webrtc", `Creating SDP Offer for ${peerUsername}...`);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    if (signalRRef.current?.state === HubConnectionState.Connected) {
                        await signalRRef.current.invoke(
                            "SendVoiceOffer",
                            targetConnectionId,
                            JSON.stringify(offer)
                        );
                        addLog("signalr", `SDP Offer sent to ${peerUsername}`);
                    }
                } catch (err) {
                    addLog("webrtc", `Error creating offer: ${String(err)}`);
                }
            })();
        }

        return pc;
    };

    // =========================================================================
    // STEP 4: SignalR Connection & Voice Event Handlers
    // =========================================================================
    const handleJoinCall = async () => {
        try {
            // 1. Capture user microphone first
            const stream = await setupLocalMicrophone();

            // 2. Build SignalR connection
            addLog("signalr", "Connecting to SignalR RoomHub...");
            const connection = createSignalRConnection();
            signalRRef.current = connection;

            // Handle when existing room users are reported upon joining
            connection.on("RoomUsers", (users: { id: string; username: string }[]) => {
                const currentId = connection.connectionId;
                setMyConnectionId(currentId || null);
                addLog("signalr", `RoomUsers received (${users.length} user(s) currently in room)`);

                const remoteUsers = users.filter((u) => u.id !== currentId);

                // Add to peers state
                setPeers(
                    remoteUsers.map((u) => ({
                        connectionId: u.id,
                        username: u.username,
                        isMuted: false,
                        isSpeaking: false,
                        volume: 1,
                        connectionState: "initiating",
                    }))
                );

                // As the newcomer, initiate WebRTC connection to every existing user
                remoteUsers.forEach((u) => {
                    createPeerConnection(u.id, u.username, true);
                });
            });

            // Handle when a new peer joins after us
            connection.on("UserJoined", (user: { id: string; username: string }) => {
                if (user.id === connection.connectionId) return;

                addLog("signalr", `New peer joined: ${user.username}`);
                setPeers((prev) => {
                    if (prev.some((p) => p.connectionId === user.id)) return prev;
                    return [
                        ...prev,
                        {
                            connectionId: user.id,
                            username: user.username,
                            isMuted: false,
                            isSpeaking: false,
                            volume: 1,
                            connectionState: "waiting-offer",
                        },
                    ];
                });

                // Prepare peer connection expecting an offer from the joiner
                createPeerConnection(user.id, user.username, false);
            });

            // STEP 5A: Handle incoming SDP Offer
            connection.on("ReceiveVoiceOffer", async (senderId: string, sdpJson: string) => {
                addLog("signalr", `Received SDP Offer from peer ${senderId.slice(0, 5)}...`);
                try {
                    let pc = peerConnectionsRef.current.get(senderId);
                    if (!pc) {
                        pc = createPeerConnection(senderId, "Peer", false);
                    }

                    const offer = JSON.parse(sdpJson);
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));

                    // Flush any queued ICE candidates that arrived before the offer description
                    const queuedCandidates = candidateQueueRef.current.get(senderId) || [];
                    for (const candidate of queuedCandidates) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    candidateQueueRef.current.delete(senderId);

                    // Create & send SDP Answer
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    await connection.invoke("SendVoiceAnswer", senderId, JSON.stringify(answer));
                    addLog("signalr", `SDP Answer sent to peer ${senderId.slice(0, 5)}...`);
                } catch (err) {
                    addLog("webrtc", `Failed to handle SDP Offer: ${String(err)}`);
                }
            });

            // STEP 5B: Handle incoming SDP Answer
            connection.on("ReceiveVoiceAnswer", async (senderId: string, sdpJson: string) => {
                addLog("signalr", `Received SDP Answer from peer ${senderId.slice(0, 5)}...`);
                try {
                    const pc = peerConnectionsRef.current.get(senderId);
                    if (pc) {
                        const answer = JSON.parse(sdpJson);
                        await pc.setRemoteDescription(new RTCSessionDescription(answer));

                        // Flush queued candidates
                        const queuedCandidates = candidateQueueRef.current.get(senderId) || [];
                        for (const candidate of queuedCandidates) {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        candidateQueueRef.current.delete(senderId);
                    }
                } catch (err) {
                    addLog("webrtc", `Failed to handle SDP Answer: ${String(err)}`);
                }
            });

            // STEP 5C: Handle incoming ICE Candidates
            connection.on("ReceiveIceCandidate", async (senderId: string, candidateJson: string) => {
                try {
                    const candidate = JSON.parse(candidateJson);
                    const pc = peerConnectionsRef.current.get(senderId);

                    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } else {
                        // Queue candidate until remoteDescription is set
                        const existingQueue = candidateQueueRef.current.get(senderId) || [];
                        existingQueue.push(candidate);
                        candidateQueueRef.current.set(senderId, existingQueue);
                    }
                } catch (err) {
                    console.error("Error adding ICE candidate:", err);
                }
            });

            // Peer voice mute status changed
            connection.on("UserVoiceStatusChanged", (userId: string, isUserMuted: boolean) => {
                setPeers((prev) =>
                    prev.map((p) => (p.connectionId === userId ? { ...p, isMuted: isUserMuted } : p))
                );
            });

            // Peer left room
            connection.on("UserLeft", (userId: string) => {
                addLog("signalr", `Peer left: ${userId.slice(0, 5)}...`);
                const pc = peerConnectionsRef.current.get(userId);
                if (pc) {
                    pc.close();
                    peerConnectionsRef.current.delete(userId);
                }
                setPeers((prev) => prev.filter((p) => p.connectionId !== userId));
            });

            // 3. Start SignalR connection & Join Room
            await connection.start();
            addLog("signalr", `SignalR Connected! Connection ID: ${connection.connectionId}`);
            await connection.invoke("JoinRoom", roomId, username);
            addLog("signalr", `Joined room: "${roomId}" as "${username}"`);

            setIsConnected(true);
        } catch (err) {
            addLog("system", `Join call failed: ${String(err)}`);
            handleLeaveCall();
        }
    };

    // =========================================================================
    // Cleanup & Disconnect
    // =========================================================================
    const handleLeaveCall = () => {
        addLog("system", "Leaving voice call and releasing devices...");

        // Stop local microphone tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Cancel audio meter animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Close Web Audio Context
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        // Close all RTCPeerConnections
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
        candidateQueueRef.current.clear();

        // Disconnect SignalR
        if (signalRRef.current) {
            signalRRef.current.stop();
            signalRRef.current = null;
        }

        setPeers([]);
        setIsConnected(false);
        setLocalVolume(0);
        addLog("system", "Call ended.");
    };

    // Toggle Local Microphone Mute
    const toggleMute = () => {
        if (!localStreamRef.current) return;
        const newMutedState = !isMuted;
        localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !newMutedState;
        });
        setIsMuted(newMutedState);

        if (signalRRef.current?.state === HubConnectionState.Connected) {
            signalRRef.current.invoke("SendVoiceStatus", roomId, newMutedState);
        }
    };

    // Toggle Deafen (Mute incoming sound)
    const toggleDeafen = () => {
        setIsDeafened((prev) => !prev);
    };

    // Adjust individual peer volume
    const handlePeerVolumeChange = (connectionId: string, vol: number) => {
        setPeers((prev) =>
            prev.map((p) => (p.connectionId === connectionId ? { ...p, volume: vol } : p))
        );
    };

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            handleLeaveCall();
        };
    }, []);

    return (
        <LobbyLayout>
            <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8 animate-in fade-in duration-300">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>Back to Spaces Lobby</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                WebRTC Voice Call POC
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Radio className="size-3 animate-pulse" />
                                Interactive Demo
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Demonstrates real-time P2P voice calling using native browser WebRTC and ASP.NET Core SignalR signaling.
                        </p>
                    </div>

                    {/* Quick Test Info Pill */}
                    <div className="text-xs bg-muted/60 border border-border/80 rounded-xl p-3 flex items-start gap-2 max-w-xs">
                        <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold block text-foreground">How to test alone:</span>
                            Open this page in a second browser tab (or Incognito window) to test talking to yourself!
                        </div>
                    </div>
                </div>

                {/* Control Bar: Join / Leave & Identity */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                                Your Display Name
                            </label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isConnected}
                                placeholder="Your name"
                                className="h-9 w-full sm:w-52"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                                Voice Room ID
                            </label>
                            <Input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                disabled={isConnected}
                                placeholder="Room name"
                                className="h-9 w-full sm:w-52"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {!isConnected ? (
                            <Button
                                onClick={handleJoinCall}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
                            >
                                <PhoneCall className="size-4" />
                                <span>Join Voice Call</span>
                            </Button>
                        ) : (
                            <Button
                                onClick={handleLeaveCall}
                                variant="destructive"
                                className="gap-2 font-semibold px-6"
                            >
                                <PhoneOff className="size-4" />
                                <span>Leave Call</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Call Stage */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Audio Participants Grid */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold flex items-center gap-2">
                                <Users className="size-4 text-primary" />
                                <span>Participants ({isConnected ? peers.length + 1 : 0})</span>
                            </h2>
                            {isConnected && (
                                <span className="text-xs text-muted-foreground">
                                    Room: <span className="font-mono font-medium text-foreground">{roomId}</span>
                                </span>
                            )}
                        </div>

                        {!isConnected ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/80 rounded-2xl bg-muted/20 text-center">
                                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <Radio className="size-7" />
                                </div>
                                <h3 className="font-bold text-base mb-1">You are not connected</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                                    Click &quot;Join Voice Call&quot; above to grant microphone access and join the P2P voice mesh.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Local User Card */}
                                <div className="relative p-5 rounded-2xl bg-card border-2 border-primary/30 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`size-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-150 ${
                                                        localVolume > 15 && !isMuted
                                                            ? "bg-emerald-500 text-white ring-4 ring-emerald-500/30 scale-105"
                                                            : "bg-primary/10 text-primary"
                                                    }`}
                                                >
                                                    {username.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5 font-bold text-sm">
                                                        <span>{username}</span>
                                                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                            You
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {isMuted ? "Microphone Muted" : "Active & Ready"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Local Mute Indicator */}
                                            <div className="p-2 rounded-full bg-muted">
                                                {isMuted ? (
                                                    <MicOff className="size-4 text-destructive" />
                                                ) : (
                                                    <Mic className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Microphone Input Meter */}
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                <span className="flex items-center gap-1">
                                                    <Activity className="size-3" />
                                                    Mic Input Level
                                                </span>
                                                <span className="font-mono">{localVolume}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-75"
                                                    style={{ width: `${isMuted ? 0 : localVolume}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons for Local Mic */}
                                    <div className="flex items-center gap-2 mt-5 pt-3 border-t border-border/40">
                                        <Button
                                            size="sm"
                                            variant={isMuted ? "destructive" : "outline"}
                                            onClick={toggleMute}
                                            className="flex-1 gap-1.5 text-xs"
                                        >
                                            {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                                            <span>{isMuted ? "Unmute" : "Mute"}</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant={isDeafened ? "destructive" : "outline"}
                                            onClick={toggleDeafen}
                                            className="flex-1 gap-1.5 text-xs"
                                        >
                                            {isDeafened ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                                            <span>{isDeafened ? "Undeafen" : "Deafen"}</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Remote Peers Cards */}
                                {peers.map((peer) => (
                                    <div
                                        key={peer.connectionId}
                                        className="relative p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-lg">
                                                        {peer.username.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm">{peer.username}</h4>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <span
                                                                className={`size-2 rounded-full ${
                                                                    peer.connectionState === "connected"
                                                                        ? "bg-emerald-500"
                                                                        : "bg-amber-500 animate-ping"
                                                                }`}
                                                            />
                                                            {peer.connectionState}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-2 rounded-full bg-muted">
                                                    {peer.isMuted ? (
                                                        <MicOff className="size-4 text-destructive" />
                                                    ) : (
                                                        <Mic className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Remote Volume Slider */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                    <span className="flex items-center gap-1">
                                                        <Volume2 className="size-3" />
                                                        User Volume
                                                    </span>
                                                    <span className="font-mono">
                                                        {Math.round((isDeafened ? 0 : peer.volume) * 100)}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.05"
                                                    value={isDeafened ? 0 : peer.volume}
                                                    onChange={(e) =>
                                                        handlePeerVolumeChange(
                                                            peer.connectionId,
                                                            parseFloat(e.target.value)
                                                        )
                                                    }
                                                    className="w-full accent-primary h-1.5 cursor-pointer bg-muted rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* HTML5 Audio Element for playing remote WebRTC stream */}
                                        {peer.stream && (
                                            <audio
                                                autoPlay
                                                playsInline
                                                ref={(audioEl) => {
                                                    if (audioEl && peer.stream && audioEl.srcObject !== peer.stream) {
                                                        audioEl.srcObject = peer.stream;
                                                    }
                                                    if (audioEl) {
                                                        audioEl.volume = isDeafened ? 0 : peer.volume;
                                                    }
                                                }}
                                            />
                                        )}

                                        <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground font-mono truncate">
                                            ID: {peer.connectionId}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right 1 Col: Diagnostic Live Event Log */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold flex items-center gap-2">
                                <Activity className="size-4 text-primary" />
                                <span>WebRTC Diagnostics</span>
                            </h2>
                            <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setLogs([])}
                                className="text-[11px] h-6 px-2 text-muted-foreground"
                            >
                                Clear
                            </Button>
                        </div>

                        <div className="bg-muted/40 border border-border/80 rounded-2xl p-3 h-[420px] flex flex-col font-mono text-[11px] overflow-hidden shadow-inner">
                            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                                {logs.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-16">
                                        No events yet. Click &quot;Join Voice Call&quot; to inspect the WebRTC handshake.
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="p-1.5 rounded bg-background/80 border border-border/40 flex items-start gap-2 break-all"
                                        >
                                            <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
                                            <span
                                                className={`font-semibold shrink-0 uppercase text-[9px] px-1 py-0.5 rounded ${
                                                    log.source === "signalr"
                                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                        : log.source === "webrtc"
                                                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                }`}
                                            >
                                                {log.source}
                                            </span>
                                            <span className="text-foreground/90">{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plain & Simple Walkthrough Guide */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold flex items-center gap-2 mb-3">
                        <Info className="size-4 text-primary" />
                        <span>How WebRTC Voice Calling Works (Plain & Simple)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
                        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-2">
                            <div className="size-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center">
                                1
                            </div>
                            <span className="font-semibold text-foreground">Audio Capture</span>
                            <p className="text-muted-foreground leading-relaxed">
                                Browser calls <code className="font-mono bg-muted px-1 py-0.5 rounded">getUserMedia</code> to capture microphone audio with built-in echo cancellation.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-2">
                            <div className="size-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center">
                                2
                            </div>
                            <span className="font-semibold text-foreground">SignalR Signaling</span>
                            <p className="text-muted-foreground leading-relaxed">
                                Browsers cannot find each other directly. They use ASP.NET Core SignalR as a broker to exchange their connection offers and answers.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-2">
                            <div className="size-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center">
                                3
                            </div>
                            <span className="font-semibold text-foreground">NAT Traversal (STUN)</span>
                            <p className="text-muted-foreground leading-relaxed">
                                Google&apos;s free STUN server helps both browsers discover their public IP and network port (ICE candidates) so they can route packets.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-2">
                            <div className="size-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center">
                                4
                            </div>
                            <span className="font-semibold text-foreground">Direct P2P Audio</span>
                            <p className="text-muted-foreground leading-relaxed">
                                Once connected, voice packets fly directly browser-to-browser with ultra-low latency, bypassing the backend server completely.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </LobbyLayout>
    );
}
