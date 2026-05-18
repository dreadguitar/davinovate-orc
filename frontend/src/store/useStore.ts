import { create } from 'zustand';

interface User {
  id: string;
  email: string;
}

interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  model_config: any;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  parameters_schema: any;
  action_code: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  agents: Agent[];
  skills: Skill[];
  isLoading: boolean;
  setUser: (user: User | null, token: string | null) => void;
  setAgents: (agents: Agent[]) => void;
  setSkills: (skills: Skill[]) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  agents: [],
  skills: [],
  isLoading: false,
  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');

    set({ user, token });
  },
  setAgents: (agents) => set({ agents }),
  setSkills: (skills) => set({ skills }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, agents: [], skills: [] });
  },
}));
