import { NextResponse } from 'next/server';

interface RoomData {
  name: string;
  hostId: string;
  players: number;
  maxPlayers: number;
  status: 'lobby' | 'playing';
  lastSeen: number;
}

// In-memory store for rooms
// Note: In a real serverless environment (like Vercel), this memory might not be completely reliable across requests due to cold starts,
// but for a simple peer-to-peer matchmaking assist, it's sufficient for active playing sessions.
let rooms: Record<string, RoomData> = {};

export async function GET() {
  const now = Date.now();
  // Cleanup stale rooms (not pinged in the last 30 seconds)
  rooms = Object.fromEntries(
    Object.entries(rooms).filter(([_, room]) => now - room.lastSeen < 30000)
  );

  return NextResponse.json(Object.values(rooms));
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, hostId, players, status } = data;

    if (!name || !hostId) {
      return NextResponse.json({ error: 'Missing room details' }, { status: 400 });
    }

    rooms[name] = {
      name,
      hostId,
      players: players || 1,
      maxPlayers: 12, // Arbitrary visual max
      status: status || 'lobby',
      lastSeen: Date.now()
    };

    return NextResponse.json({ success: true, room: rooms[name] });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (name && rooms[name]) {
      delete rooms[name];
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
