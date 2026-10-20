export type BlendKind = 'pair' | 'group';

export type Track = { id: string; title: string; artist: string; album: string; reason: string; pinned?: boolean; excluded?: boolean };
export type Blend = { id: string; kind: BlendKind; name: string; members: string[]; overlap: number; lastUpdated: string; description: string; tracks: Track[]; scores: { label: string; value: number; explanation: string }[] };
export type Profile = { id: string; displayName: string; username: string; initials: string; tone: string; status: string };
