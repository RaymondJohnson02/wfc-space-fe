import Link from "next/link";

const rooms = [
    { id: "room-1", name: "Cafe" },
    { id: "room-2", name: "Office" },
    { id: "room-3", name: "Plaza" },
];

export default function Home() {
    return (
        <main>
            <h1>Virtual Office</h1>
            <p>Choose a room</p>
            <ul>
                {rooms.map((room) => (
                    <li key={room.id}>
                        <Link href={`/room/${room.id}`}>{room.name}</Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}
