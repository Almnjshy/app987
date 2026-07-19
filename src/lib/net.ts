/**
 * اللعب الجماعي عبر WebRTC — يعمل على الشبكة المحلية (Hotspot / نفس الـ Wi-Fi)
 * وعبر الإنترنت دون أي خادم: يتم تبادل رموز الدعوة يدوياً (نسخ/لصق).
 *
 * المضيف يدير محرك اللعبة بشكل موثوق (Host-Authoritative):
 * كل حركة تُتحقق داخل المحرك قبل قبولها — لا يمكن لأي عميل إرسال حركة غير قانونية.
 */

import type { MatchState, ChainTile, Tile, EndSide } from '@/types/game';
import {
  createRound,
  applyMove,
  applyDraw,
  applyPass,
  canDraw,
  canPass,
  roundStatus,
  legalMoves,
} from '@/lib/gameEngine';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
};

export const NETWORK_TARGET_SCORE = 100;

/* ------------------------------------------------------------------ */
/* ترميز رموز الدعوة                                                   */
/* ------------------------------------------------------------------ */

export function encodeCode(desc: RTCSessionDescriptionInit): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(desc))));
}

export function decodeCode(code: string): RTCSessionDescriptionInit {
  const cleaned = code.trim().replace(/\s+/g, '');
  return JSON.parse(decodeURIComponent(escape(atob(cleaned))));
}

function waitIceComplete(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const timer = setTimeout(resolve, timeoutMs);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* أنواع الرسائل                                                       */
/* ------------------------------------------------------------------ */

export type ClientAction =
  | { type: 'join'; name: string }
  | { type: 'play'; tileId: string; side: EndSide }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'chat'; text: string }
  | { type: 'leave' };

export type HostMessage =
  | { type: 'lobby'; players: { name: string; isHost: boolean }[] }
  | { type: 'snapshot'; snap: NetSnapshot }
  | { type: 'chat'; from: string; text: string }
  | { type: 'error'; message: string }
  | { type: 'closed' };

export interface NetPlayerView {
  name: string;
  isYou: boolean;
  isActive: boolean;
  tileCount: number;
  score: number;
  connected: boolean;
}

export interface NetSnapshot {
  youIndex: number;
  yourHand: Tile[];
  players: NetPlayerView[];
  chain: ChainTile[];
  boneyardCount: number;
  currentPlayer: number;
  message: string;
  roundWinner: string | null;
  matchWinnerIndex: number | null;
  targetScore: number;
}

/* ------------------------------------------------------------------ */
/* جلسة المضيف                                                         */
/* ------------------------------------------------------------------ */

interface GuestSlot {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  name: string;
  connected: boolean;
}

export class HostSession {
  guests: GuestSlot[] = [];
  hostName: string;
  match: MatchState | null = null;
  scores: number[] = [];
  roundWinner: string | null = null;
  matchWinnerIndex: number | null = null;
  message = '';
  started = false;

  onLobby?: (players: { name: string; isHost: boolean }[]) => void;
  onSnapshot?: (snap: NetSnapshot) => void; // لقطة المضيف نفسه
  onChat?: (from: string, text: string) => void;
  onPlayerLeft?: (name: string) => void;

  constructor(hostName: string) {
    this.hostName = hostName;
  }

  lobbyPlayers() {
    return [
      { name: this.hostName, isHost: true },
      ...this.guests.filter((g) => g.connected).map((g) => ({ name: g.name, isHost: false })),
    ];
  }

  private emitLobby() {
    const players = this.lobbyPlayers();
    this.onLobby?.(players);
    this.broadcast({ type: 'lobby', players });
  }

  /** إنشاء رمز دعوة للاعب جديد (يكرر لكل ضيف حتى 3). */
  async createInvite(): Promise<string> {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const slot: GuestSlot = { pc, dc: null, name: `لاعب ${this.guests.length + 2}`, connected: false };
    this.guests.push(slot);

    const dc = pc.createDataChannel('game', { ordered: true });
    this.setupChannel(slot, dc);

    await pc.setLocalDescription(await pc.createOffer());
    await waitIceComplete(pc);
    return encodeCode(pc.localDescription!);
  }

  /** قبول رمز الإجابة من الضيف. */
  async acceptAnswer(slotIndex: number, answerCode: string): Promise<void> {
    const slot = this.guests[slotIndex];
    if (!slot) throw new Error('لا يوجد ضيف بهذا الرقم');
    await slot.pc.setRemoteDescription(decodeCode(answerCode));
  }

  private setupChannel(slot: GuestSlot, dc: RTCDataChannel) {
    slot.dc = dc;
    dc.onopen = () => {
      slot.connected = true;
      this.emitLobby();
    };
    dc.onclose = () => this.handleLeave(slot);
    dc.onerror = () => this.handleLeave(slot);
    dc.onmessage = (ev) => {
      try {
        const action = JSON.parse(ev.data as string) as ClientAction;
        this.handleAction(slot, action);
      } catch { /* تجاهل الرسائل التالفة */ }
    };
  }

  private handleLeave(slot: GuestSlot) {
    if (!slot.connected) return;
    slot.connected = false;
    this.onPlayerLeft?.(slot.name);
    // اللاعب المنقطع يبقى في المباراة ويلعب عنه المحرك تلقائياً
    this.emitLobby();
    this.broadcastAll();
  }

  private playerIndexOf(slot: GuestSlot): number {
    return this.guests.indexOf(slot) + 1;
  }

  private handleAction(slot: GuestSlot, action: ClientAction) {
    if (action.type === 'join') {
      slot.name = action.name.slice(0, 20) || slot.name;
      this.emitLobby();
      this.broadcastAll();
      return;
    }
    if (action.type === 'chat') {
      const text = action.text.slice(0, 200);
      this.broadcast({ type: 'chat', from: slot.name, text });
      this.onChat?.(slot.name, text);
      return;
    }
    if (action.type === 'leave') {
      slot.dc?.close();
      this.handleLeave(slot);
      return;
    }
    if (!this.started || !this.match) return;

    const idx = this.playerIndexOf(slot);
    try {
      if (action.type === 'play') {
        this.match = applyMove(this.match, idx, { tileId: action.tileId, side: action.side });
        this.message = '';
      } else if (action.type === 'draw') {
        this.match = applyDraw(this.match, idx).state;
      } else if (action.type === 'pass') {
        this.match = applyPass(this.match, idx);
      }
      this.afterTransition();
    } catch {
      this.send(slot, { type: 'error', message: 'حركة غير قانونية' });
    }
  }

  /** بدء المباراة (المضيف فقط). */
  startGame() {
    const activeGuests = this.guests.filter((g) => g.connected);
    const playerCount = 1 + activeGuests.length;
    if (playerCount < 2) throw new Error('يلزم لاعبان على الأقل');
    const variant = playerCount >= 4 ? 'block' : 'draw';
    this.match = createRound(playerCount, variant);
    this.scores = new Array(playerCount).fill(0);
    this.roundWinner = null;
    this.matchWinnerIndex = null;
    this.started = true;
    this.message = '';
    this.broadcastAll();
  }

  /** إجراء المضيف نفسه (اللاعب رقم 0). */
  hostAction(action: { type: 'play'; tileId: string; side: EndSide } | { type: 'draw' } | { type: 'pass' }) {
    if (!this.match) return;
    try {
      if (action.type === 'play') {
        this.match = applyMove(this.match, 0, { tileId: action.tileId, side: action.side });
      } else if (action.type === 'draw') {
        this.match = applyDraw(this.match, 0).state;
      } else {
        this.match = applyPass(this.match, 0);
      }
      this.message = '';
      this.afterTransition();
    } catch { /* حركة غير قانونية */ }
  }

  private afterTransition() {
    if (!this.match) return;
    const status = roundStatus(this.match);
    if (status.type === 'ended') {
      const names = [this.hostName, ...this.guests.map((g) => g.name)];
      this.scores[status.winnerIndex] += status.points;
      this.roundWinner = names[status.winnerIndex];
      this.message = status.reason === 'blocked'
        ? `انسداد اللعب! الفائز: ${names[status.winnerIndex]}`
        : `${names[status.winnerIndex]} أنهى قطعه!`;

      if (this.scores[status.winnerIndex] >= NETWORK_TARGET_SCORE) {
        this.matchWinnerIndex = status.winnerIndex;
      } else {
        // جولة جديدة تلقائياً بعد مهلة قصيرة
        this.broadcastAll();
        setTimeout(() => {
          if (!this.match || this.matchWinnerIndex !== null) return;
          this.match = createRound(this.match.playerCount, this.match.variant);
          this.roundWinner = null;
          this.message = '';
          this.broadcastAll();
        }, 3000);
        return;
      }
    }
    this.broadcastAll();
  }

  private names(): string[] {
    return [this.hostName, ...this.guests.map((g) => g.name)];
  }

  private snapshotFor(playerIndex: number): NetSnapshot {
    const m = this.match!;
    const names = this.names();
    return {
      youIndex: playerIndex,
      yourHand: m.hands[playerIndex],
      players: names.map((name, i) => ({
        name,
        isYou: i === playerIndex,
        isActive: m.currentPlayer === i,
        tileCount: m.hands[i].length,
        score: this.scores[i] || 0,
        connected: i === 0 ? true : (this.guests[i - 1]?.connected ?? false),
      })),
      chain: m.chain,
      boneyardCount: m.boneyard.length,
      currentPlayer: m.currentPlayer,
      message: this.message,
      roundWinner: this.roundWinner,
      matchWinnerIndex: this.matchWinnerIndex,
      targetScore: NETWORK_TARGET_SCORE,
    };
  }

  private send(slot: GuestSlot, msg: HostMessage) {
    try {
      if (slot.dc && slot.dc.readyState === 'open') slot.dc.send(JSON.stringify(msg));
    } catch { /* ignore */ }
  }

  private broadcast(msg: HostMessage) {
    for (const g of this.guests) if (g.connected) this.send(g, msg);
  }

  broadcastAll() {
    if (!this.match) {
      this.emitLobby();
      return;
    }
    // لقطة مخصصة لكل لاعب (يده فقط مكشوفة له)
    this.guests.forEach((g, i) => {
      if (g.connected) this.send(g, { type: 'snapshot', snap: this.snapshotFor(i + 1) });
    });
    this.onSnapshot?.(this.snapshotFor(0));
  }

  /** هل يستطيع لاعب منقطع أن يُدار آلياً؟ — تُستخدم من واجهة المضيف. */
  autoPlayDisconnected() {
    if (!this.match || this.matchWinnerIndex !== null) return;
    const idx = this.match.currentPlayer;
    if (idx === 0) return;
    const slot = this.guests[idx - 1];
    if (slot?.connected) return;
    // المحرك يلعب بدلاً عنه بأول حركة قانونية
    const moves = legalMoves(this.match.hands[idx], this.match.chain);
    try {
      if (moves.length > 0) {
        this.match = applyMove(this.match, idx, moves[0]);
      } else if (canDraw(this.match, idx)) {
        this.match = applyDraw(this.match, idx).state;
      } else if (canPass(this.match, idx)) {
        this.match = applyPass(this.match, idx);
      }
      this.afterTransition();
    } catch { /* ignore */ }
  }

  destroy() {
    for (const g of this.guests) {
      try { g.dc?.close(); g.pc.close(); } catch { /* ignore */ }
    }
    this.guests = [];
    this.match = null;
    this.started = false;
  }
}

/* ------------------------------------------------------------------ */
/* جلسة الضيف                                                          */
/* ------------------------------------------------------------------ */

export class GuestSession {
  pc: RTCPeerConnection | null = null;
  dc: RTCDataChannel | null = null;
  name: string;

  onLobby?: (players: { name: string; isHost: boolean }[]) => void;
  onSnapshot?: (snap: NetSnapshot) => void;
  onChat?: (from: string, text: string) => void;
  onError?: (message: string) => void;
  onClosed?: () => void;

  constructor(name: string) {
    this.name = name;
  }

  /** إنشاء رمز إجابة من رمز الدعوة. */
  async join(inviteCode: string): Promise<string> {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc = pc;

    const channelReady = new Promise<void>((resolve, reject) => {
      pc.ondatachannel = (ev) => {
        this.dc = ev.channel;
        this.dc.onopen = () => {
          this.send({ type: 'join', name: this.name });
          resolve();
        };
        this.dc.onclose = () => this.onClosed?.();
        this.dc.onerror = () => this.onClosed?.();
        this.dc.onmessage = (e) => this.handleMessage(e.data as string);
      };
      setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), 20000);
    });

    await pc.setRemoteDescription(decodeCode(inviteCode));
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIceComplete(pc);
    const answerCode = encodeCode(pc.localDescription!);

    // ننتظر فتح القناة في الخلفية
    channelReady.catch(() => this.onError?.('فشل الاتصال بالمضيف'));
    return answerCode;
  }

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw) as HostMessage;
      if (msg.type === 'lobby') this.onLobby?.(msg.players);
      else if (msg.type === 'snapshot') this.onSnapshot?.(msg.snap);
      else if (msg.type === 'chat') this.onChat?.(msg.from, msg.text);
      else if (msg.type === 'error') this.onError?.(msg.message);
      else if (msg.type === 'closed') this.onClosed?.();
    } catch { /* ignore */ }
  }

  send(action: ClientAction) {
    try {
      if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(action));
    } catch { /* ignore */ }
  }

  destroy() {
    try { this.dc?.close(); this.pc?.close(); } catch { /* ignore */ }
    this.dc = null;
    this.pc = null;
  }
}
