
export type InputMode = 'text' | 'voice' | 'photo';
export type ArtifactType = 'Article' | 'Interview' | 'Action Plan';

export interface Message {
  role: 'user' | 'model';
  text: string;
  mediaUrl?: string; // Support playback of recorded voice messages
}

export interface Session {
  id: string;
  timestamp: number;
  initialSpark: string;
  type: InputMode;
  status: 'interviewing' | 'synthesizing' | 'completed';
  messages: Message[];
  finalArtifact?: {
    type: ArtifactType;
    title: string;
    content: string;
    summary: string;
  };
  mediaUrl?: string; // Initial spark media URL
}

export interface ArtifactResponse {
  title: string;
  content: string;
  summary: string;
}
