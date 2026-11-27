import { describe, it, expect } from 'vitest';
import {
  MAX_PERC_VOICES,
  MAX_VOICES,
  oldestVoice,
  pickVoiceVictim,
  voiceStealing,
} from '../../engine/audio';
import type { VoiceRef } from '../../engine/audio';

type ActiveVoice = VoiceRef & { perc?: boolean };

const ref = (id: number, t: number, perc = false): ActiveVoice => ({ id, t, perc });

describe('audio voice stealing (чистые функции, без AudioContext)', () => {
  it('лимиты голосов соответствуют аудиту', () => {
    expect(MAX_VOICES).toBe(24);
    expect(MAX_PERC_VOICES).toBe(10);
  });

  it('voiceStealing возвращает null, пока лимит не достигнут', () => {
    const active = [1, 2, 3].map((i) => ({ id: i, t: i * 0.1 }));
    expect(voiceStealing(active, 4)).toBeNull();
    expect(voiceStealing([], 24)).toBeNull();
  });

  it('voiceStealing на лимите глушит самый старый голос', () => {
    const active = [
      { id: 10, t: 0.5 },
      { id: 11, t: 0.2 },
      { id: 12, t: 0.9 },
    ];
    expect(voiceStealing(active, 3)).toBe(11);
    expect(voiceStealing(active, 2)).toBe(11);
  });

  it('при равном времени старта жертвуется минимальный id', () => {
    const active = [ref(7, 0.3), ref(3, 0.3), ref(9, 0.3)];
    expect(oldestVoice(active)!.id).toBe(3);
    expect(oldestVoice([])).toBeNull();
    expect(voiceStealing(active, 3)).toBe(3);
  });

  it('тональный голос при свободных лимитах никого не глушит', () => {
    // перкуссия заполнена до отказа, но добавляется тональный голос
    const active: ActiveVoice[] = [];
    for (let i = 0; i < MAX_PERC_VOICES; i++) active.push(ref(i + 1, i * 0.1, true));
    expect(pickVoiceVictim(active, MAX_VOICES, MAX_PERC_VOICES, false)).toBeNull();
  });

  it('перкуссия при своём лимите глушит старейший шумовой голос', () => {
    const active: ActiveVoice[] = [];
    for (let i = 0; i < MAX_PERC_VOICES; i++) active.push(ref(i + 1, i * 0.1, true));
    active.push(ref(99, 5, false)); // старый тональный голос не должен пострадать
    expect(pickVoiceVictim(active, MAX_VOICES, MAX_PERC_VOICES, true)).toBe(1);
  });

  it('общий лимит: глушится старейший голос вообще', () => {
    const active: ActiveVoice[] = [];
    for (let i = 0; i < MAX_VOICES; i++) active.push(ref(i + 1, i * 0.1, i % 2 === 0));
    expect(pickVoiceVictim(active, MAX_VOICES, MAX_PERC_VOICES, false)).toBe(1);
    // перкуссии здесь 12 - больше своего лимита, жертвой станет старейшая перкуссия
    expect(pickVoiceVictim(active, MAX_VOICES, MAX_PERC_VOICES, true)).toBe(1);
  });

  it('общий лимит при неполной перкуссии: перкуссионный голос глушит старейшего из всех', () => {
    const active: ActiveVoice[] = [];
    for (let i = 0; i < MAX_VOICES; i++) active.push(ref(i + 1, i * 0.1, false));
    active.push(ref(999, 10, true)); // свежая перкуссия поверх
    expect(pickVoiceVictim(active, MAX_VOICES, MAX_PERC_VOICES, true)).toBe(1);
    expect(pickVoiceVictim(active, MAX_VOICES, MAX_PERC_VOICES, false)).toBe(1);
  });

  it('выбор жертвы идемпотентен: повторный вызов даёт того же кандидата', () => {
    const active: ActiveVoice[] = [ref(1, 0.1, true), ref(2, 0.2), ref(3, 0.3, true)];
    const first = pickVoiceVictim(active, 3, 2, true);
    expect(first).toBe(1);
    expect(pickVoiceVictim(active, 3, 2, true)).toBe(first);
  });
});
