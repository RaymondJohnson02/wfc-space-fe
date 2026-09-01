"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";
import logoImg from "@/asset/logo-wfc-space.png";
import { Button } from "@/components/ui/button";
import LoginModal from "@/components/auth/LoginModal";

interface LobbyLayoutProps {
    children: React.ReactNode;
}

export default function LobbyLayout({ children }: LobbyLayoutProps) {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    return (
        <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
            {/* Ambient background decoration */}
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/5 rounded-full blur-2xl" />
            </div>

            {/* Top Navigation Bar */}
            <header className="w-full flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/60 sticky top-0 z-30">
                {/* Top-Left: Logo */}
                <Link
                    href="/"
                    className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                    <div className="relative size-10 overflow-hidden rounded-xl shadow-sm transition-shadow group-hover:shadow-md bg-muted/30 flex items-center justify-center">
                        <Image
                            src={logoImg}
                            alt="WFC Space Logo"
                            width={40}
                            height={40}
                            className="object-cover"
                            priority
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-base tracking-tight leading-tight group-hover:text-primary transition-colors">
                            WFC Space
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-none">
                            Virtual Office
                        </span>
                    </div>
                </Link>

                {/* Top-Right: Login Button */}
                <div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsLoginModalOpen(true)}
                        className={"cursor-pointer"}
                    >
                        <LogIn className="size-4" />
                        <span>Login</span>
                    </Button>
                </div>
            </header>

            {/* Center Content Container */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
                {children}
            </main>

            {/* Login Dialog */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </div>
    );
}
