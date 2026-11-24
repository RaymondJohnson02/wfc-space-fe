import Link from "next/link";
import { Coffee, Briefcase, Trees, ArrowRight, Users, Sparkles, Radio } from "lucide-react";
import LobbyLayout from "@/components/layout/LobbyLayout";

interface RoomItem {
    id: string;
    name: string;
    description: string;
    icon: typeof Coffee;
    tag: string;
}

const ROOMS: RoomItem[] = [
    {
        id: "room-1",
        name: "Cafe",
        description: "A cozy spot for informal chats, quick watercooler breaks, and casual catchups.",
        icon: Coffee,
        tag: "Casual & Social",
    },
    {
        id: "room-2",
        name: "Office",
        description: "Focused collaboration zone for sprint meetings, co-working, and deep team work.",
        icon: Briefcase,
        tag: "Work & Focus",
    },
    {
        id: "room-3",
        name: "Plaza",
        description: "Open town hall area for team-wide gatherings, demos, and announcements.",
        icon: Trees,
        tag: "Open Space",
    },
];

export default function Home() {
    return (
        <LobbyLayout>
            <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                {/* Hero Section */}
                <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
                        <Sparkles className="size-3.5" />
                        <span>Interactive 2D Virtual Office</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                        Choose a Space to Enter
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                        Join your colleagues in real-time. Pick a room below to choose your display name and enter the space.
                    </p>
                </div>

                {/* Rooms Grid */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
                    {ROOMS.map((room) => {
                        const Icon = room.icon;
                        return (
                            <Link
                                key={room.id}
                                href={`/room/${room.id}`}
                                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-card border border-border/70 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div>
                                    {/* Top Card Section */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                            <Icon className="size-6" />
                                        </div>
                                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                            {room.tag}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                        {room.name}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        {room.description}
                                    </p>
                                </div>

                                {/* Bottom Action */}
                                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                                    <span className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <Users className="size-3.5" />
                                        <span>Guest Room</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        <span>Enter</span>
                                        <ArrowRight className="size-3.5" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Voice Call POC Banner */}
                <div className="w-full mt-8 p-4 rounded-2xl bg-card/60 border border-border/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Radio className="size-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">Voice Call Proof-of-Concept</h3>
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">New POC</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Test browser-to-browser WebRTC voice calling with live diagnostics and audio visualizer.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/voice-poc"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-all shrink-0"
                    >
                        <span>Open Voice POC</span>
                        <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </div>
        </LobbyLayout>
    );
}
