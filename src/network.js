import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ugjjifmlivdufshkhmpa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NKDgamP7doJxSucp5Rtmgw_CHmI3BJq';
const ROUND_MS = 3 * 60 * 1000;

const params = new URLSearchParams(location.search);
const room = (params.get('room') || 'public').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'public';

let playerId = sessionStorage.getItem('infernal-player-id');
if (!playerId) {
  playerId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('infernal-player-id', playerId);
}
const shortId = playerId.replace(/-/g, '').slice(0, 4).toUpperCase();
let playerName = sessionStorage.getItem('infernal-player-name') || `Chef-${shortId}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export function createArenaNetwork(callbacks = {}) {
  const channel = supabase.channel(`infernal:${room}`, {
    config: {
      presence: { key: playerId },
      broadcast: { self: false, ack: false },
    },
  });

  let connectedIds = [playerId];
  let hostId = playerId;
  let joined = false;
  let round = { id: 1, endsAt: Date.now() + ROUND_MS };
  let lastRoundBroadcast = 0;
  let lastStateBroadcast = 0;

  const emitPresence = () => {
    const state = channel.presenceState();
    const ids = Object.keys(state).sort();
    connectedIds = ids.length ? ids : [playerId];
    hostId = connectedIds[0];
    callbacks.onPresence?.({ ids: connectedIds, count: connectedIds.length, hostId, room, playerId, playerName });
  };

  const acceptRound = (payload) => {
    if (!payload?.endsAt || !payload?.id) return;
    if (payload.id < round.id) return;
    round = { id: payload.id, endsAt: payload.endsAt };
    callbacks.onRound?.({ ...round, room, isHost: hostId === playerId });
  };

  channel
    .on('presence', { event: 'sync' }, emitPresence)
    .on('presence', { event: 'join' }, emitPresence)
    .on('presence', { event: 'leave' }, emitPresence)
    .on('broadcast', { event: 'player_state' }, ({ payload }) => {
      if (!payload || payload.id === playerId) return;
      callbacks.onPlayerState?.(payload);
    })
    .on('broadcast', { event: 'round_state' }, ({ payload }) => acceptRound(payload))
    .on('broadcast', { event: 'round_reset' }, ({ payload }) => {
      if (!payload || payload.id < round.id) return;
      round = { id: payload.id, endsAt: payload.endsAt };
      callbacks.onRoundReset?.({ ...round, room });
      callbacks.onRound?.({ ...round, room, isHost: hostId === playerId });
    })
    .on('broadcast', { event: 'steal_request' }, ({ payload }) => {
      if (payload?.to === playerId) callbacks.onStealRequest?.(payload.from);
    })
    .on('broadcast', { event: 'steal_grant' }, ({ payload }) => {
      if (payload?.to === playerId && payload.type) callbacks.onStealGrant?.(payload.type, payload.from);
    })
    .subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      joined = true;
      await channel.track({ id: playerId, name: playerName, joinedAt: Date.now() });
      emitPresence();
    });

  const send = (event, payload) => {
    if (!joined) return;
    channel.send({ type: 'broadcast', event, payload });
  };

  const update = (now = Date.now()) => {
    if (!joined) return;
    if (hostId !== playerId) return;

    if (now >= round.endsAt) {
      round = { id: round.id + 1, endsAt: now + ROUND_MS };
      send('round_reset', round);
      callbacks.onRoundReset?.({ ...round, room });
      callbacks.onRound?.({ ...round, room, isHost: true });
      lastRoundBroadcast = now;
      return;
    }

    if (now - lastRoundBroadcast >= 1000) {
      send('round_state', round);
      lastRoundBroadcast = now;
    }
  };

  return {
    room,
    playerId,
    get playerName() { return playerName; },
    async setPlayerName(name) {
      const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20) || `Chef-${shortId}`;
      playerName = clean;
      sessionStorage.setItem('infernal-player-name', clean);
      if (joined) {
        try { await channel.track({ id: playerId, name: playerName, joinedAt: Date.now() }); } catch {}
      }
      return playerName;
    },
    sendPlayerState(state, now = performance.now()) {
      if (!joined || now - lastStateBroadcast < 100) return;
      lastStateBroadcast = now;
      send('player_state', { ...state, id: playerId, name: playerName, sentAt: Date.now() });
    },
    requestSteal(targetId) {
      if (targetId && targetId !== playerId) send('steal_request', { from: playerId, to: targetId });
    },
    grantSteal(targetId, type) {
      if (targetId && type) send('steal_grant', { from: playerId, to: targetId, type });
    },
    update,
    getRound() { return { ...round }; },
    getPresence() { return { ids: [...connectedIds], count: connectedIds.length, hostId }; },
    disconnect() {
      try { channel.untrack(); } catch {}
      try { supabase.removeChannel(channel); } catch {}
    },
  };
}
