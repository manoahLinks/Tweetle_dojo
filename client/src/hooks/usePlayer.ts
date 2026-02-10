import { useState, useEffect, useCallback } from 'react';
import { useSession } from './SessionContext';
import { feltToString } from '../dojo/models';
import {
  apolloClient,
  GET_PLAYER,
  type GetPlayerResponse,
} from '../dojo/apollo';

// Bird-themed levels from the PRD
export const LEVELS = [
  { title: 'Hatchling', xp: 0, icon: '🥚' },
  { title: 'Fledgling', xp: 100, icon: '🐣' },
  { title: 'Songbird', xp: 300, icon: '🐦' },
  { title: 'Nightingale', xp: 600, icon: '🎵' },
  { title: 'Hawk', xp: 1000, icon: '🦅' },
  { title: 'Eagle', xp: 1800, icon: '🦅' },
  { title: 'Phoenix', xp: 3000, icon: '🔥' },
  { title: 'Thunderbird', xp: 5000, icon: '⚡' },
  { title: 'Tweetle Master', xp: 8000, icon: '👑' },
  { title: 'Legendary Owl', xp: 13000, icon: '🦉' },
];

export function getLevel(points: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.xp) level = l;
    else break;
  }
  return level;
}

export interface PlayerData {
  username: string;
  points: number;
  classicGameCount: number;
  isRegistered: boolean;
  levelTitle: string;
  levelIcon: string;
  friendsCount: number;
}

export function usePlayer() {
  const { sessionMetadata } = useSession();
  const address = sessionMetadata.address;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayerData = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await apolloClient.query<GetPlayerResponse>({
        query: GET_PLAYER,
        variables: { address },
        fetchPolicy: 'network-only',
      });

      const node = data?.tweetleDojoPlayerModels?.edges?.[0]?.node;
      if (node) {
        const points = Number(node.points);
        const level = getLevel(points);
        let username = '';
        try {
          username = node.username ? feltToString(node.username) : '';
        } catch {
          username = node.username || '';
        }
        setPlayer({
          username,
          points,
          classicGameCount: Number(node.classic_game_count),
          isRegistered: node.is_registered,
          levelTitle: level.title,
          levelIcon: level.icon,
          friendsCount: Number(node.friends_count ?? 0),
        });
      }
    } catch {
      // Silently fail — player may not be registered yet
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  return { player, loading, refetch: fetchPlayerData };
}
