"use client";

import {
  GoogleGenAI,
  type FunctionCall,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  calculateLevel,
  INPUT_RATE,
  OUTPUT_RATE,
} from "@/lib/audio-utils";
import { createLiveConnectConfig } from "@/lib/live-config";
import {
  COMPLETE_INTAKE,
  emptyIntakeSummary,
  INTAKE_STORAGE_KEY,
  mergeIntakeSummary,
  TRANSCRIPT_STORAGE_KEY,
  UPDATE_INTAKE_SUMMARY,
  type IntakeSummary,
} from "@/lib/intake-schema";

export type SessionStatus =
  | "idle"
  | "preparing"
  | "connecting"
  | "live"
  | "complete"
  | "error";

type TokenPayload = {
  token: string;
  model: string;
  voiceName: string;
};

export function useLiveIntake(onComplete?: () => void) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [summary, setSummary] = useState<IntakeSummary>(emptyIntakeSummary);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<Session | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const captureContextRef = useRef<AudioContext | undefined>(undefined);
  const playbackContextRef = useRef<AudioContext | undefined>(undefined);
  const playbackGainRef = useRef<GainNode | undefined>(undefined);
  const captureWorkletRef = useRef<AudioWorkletNode | undefined>(undefined);
  const captureSourceRef = useRef<MediaStreamAudioSourceNode | undefined>(
    undefined
  );
  const playbackCursorRef = useRef(0);
  const isActiveRef = useRef(false);
  const modelRef = useRef("");
  const voiceNameRef = useRef("Aoede");
  const userTranscriptRef = useRef("");
  const modelTranscriptRef = useRef("");

  const persistState = useCallback(
    (nextSummary: IntakeSummary, lines: string[]) => {
      sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(nextSummary));
      sessionStorage.setItem(TRANSCRIPT_STORAGE_KEY, lines.join("\n"));
    },
    []
  );

  const summaryRef = useRef(summary);
  const transcriptRef = useRef(transcript);
  summaryRef.current = summary;
  transcriptRef.current = transcript;

  const appendTranscript = useCallback(
    (role: "user" | "assistant" | "system", text: string) => {
      setTranscript((prev) => {
        const next = [...prev, `[${role}] ${text}`];
        persistState(summaryRef.current, next);
        return next;
      });
    },
    [persistState]
  );

  const cleanupAudio = useCallback(async () => {
    setInputLevel(0);
    setOutputLevel(0);

    captureWorkletRef.current?.port.close();
    captureWorkletRef.current?.disconnect();
    captureWorkletRef.current = undefined;
    captureSourceRef.current?.disconnect();
    captureSourceRef.current = undefined;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
    }
    streamRef.current = undefined;

    if (captureContextRef.current?.state !== "closed") {
      await captureContextRef.current?.close();
    }
    captureContextRef.current = undefined;

    if (playbackContextRef.current?.state !== "closed") {
      await playbackContextRef.current?.close();
    }
    playbackContextRef.current = undefined;
    playbackGainRef.current = undefined;
  }, []);

  const closeSession = useCallback((session?: Session) => {
    if (!session) return;
    try {
      session.close();
    } catch {
      // WebSocket may already be closing
    }
  }, []);

  const resetPlayback = useCallback(() => {
    const playbackContext = playbackContextRef.current;
    const playbackGain = playbackGainRef.current;
    if (!playbackContext || !playbackGain) return;

    playbackGain.disconnect();
    playbackGainRef.current = playbackContext.createGain();
    playbackGainRef.current.connect(playbackContext.destination);
    playbackCursorRef.current = playbackContext.currentTime;
    setOutputLevel(0);
  }, []);

  const playPcmChunk = useCallback((base64Data: string) => {
    const playbackContext = playbackContextRef.current;
    const playbackGain = playbackGainRef.current;
    if (!playbackContext || !playbackGain) return;

    const pcm16 = new Int16Array(base64ToArrayBuffer(base64Data));
    const floats = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i += 1) {
      floats[i] = pcm16[i] / 32768;
    }

    setOutputLevel(calculateLevel(pcm16));

    const audioBuffer = playbackContext.createBuffer(
      1,
      floats.length,
      OUTPUT_RATE
    );
    audioBuffer.copyToChannel(floats, 0);

    const source = playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(playbackGain);

    const now = playbackContext.currentTime;
    playbackCursorRef.current = Math.max(playbackCursorRef.current, now);
    source.start(playbackCursorRef.current);
    playbackCursorRef.current += audioBuffer.duration;
  }, []);

  const setupAudio = useCallback(async () => {
    streamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    captureContextRef.current = new AudioContext({ sampleRate: INPUT_RATE });
    await captureContextRef.current.audioWorklet.addModule("/audio-worklet.js");

    playbackContextRef.current = new AudioContext({ sampleRate: OUTPUT_RATE });
    playbackGainRef.current = playbackContextRef.current.createGain();
    playbackGainRef.current.connect(playbackContextRef.current.destination);
    playbackCursorRef.current = playbackContextRef.current.currentTime;
  }, []);

  const startCapture = useCallback(() => {
    const captureContext = captureContextRef.current;
    const stream = streamRef.current;
    if (!captureContext || !stream) return;

    captureSourceRef.current = captureContext.createMediaStreamSource(stream);
    captureWorkletRef.current = new AudioWorkletNode(
      captureContext,
      "pcm-capture-processor"
    );

    captureWorkletRef.current.port.onmessage = (event: MessageEvent) => {
      const pcmBuffer = event.data as ArrayBuffer;
      setInputLevel(calculateLevel(new Int16Array(pcmBuffer)));

      const session = sessionRef.current;
      if (!session || !isActiveRef.current) return;

      session.sendRealtimeInput({
        audio: {
          data: arrayBufferToBase64(pcmBuffer),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    };

    captureSourceRef.current.connect(captureWorkletRef.current);
  }, []);

  const handleToolCall = useCallback(
    async (functionCall: FunctionCall) => {
      const session = sessionRef.current;
      if (!session) return;

      const name = functionCall.name ?? "";
      const args = (functionCall.args ?? {}) as Record<string, unknown>;
      let response: Record<string, unknown> = { ok: true };

      if (name === UPDATE_INTAKE_SUMMARY) {
        setSummary((prev) => {
          const merged = mergeIntakeSummary(prev, args as IntakeSummary);
          persistState(merged, transcriptRef.current);
          return merged;
        });
        response = { updated: true };
      } else if (name === COMPLETE_INTAKE && args.ready === true) {
        setStatus("complete");
        isActiveRef.current = false;
        response = { ready: true };
        appendTranscript("system", "Intake marked complete.");
        onComplete?.();
      }

      await session.sendToolResponse({
        functionResponses: [
          {
            id: functionCall.id,
            name,
            response,
          },
        ],
      });
    },
    [appendTranscript, onComplete, persistState]
  );

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage, onSetupComplete: () => void) => {
      if (message.setupComplete) {
        onSetupComplete();
        return;
      }

      if (message.toolCall?.functionCalls?.length) {
        for (const call of message.toolCall.functionCalls) {
          void handleToolCall(call);
        }
        return;
      }

      const content = message.serverContent;
      if (!content) return;

      if (content.interrupted) {
        resetPlayback();
        userTranscriptRef.current = "";
        modelTranscriptRef.current = "";
        appendTranscript("system", "Interrupted.");
        return;
      }

      if (content.inputTranscription?.text) {
        userTranscriptRef.current += content.inputTranscription.text;
      }

      if (content.outputTranscription?.text) {
        modelTranscriptRef.current += content.outputTranscription.text;
      }

      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.text) {
            modelTranscriptRef.current += part.text;
          }
          if (part.inlineData?.data) {
            playPcmChunk(part.inlineData.data);
          }
        }
      }

      if (content.turnComplete) {
        if (userTranscriptRef.current.trim()) {
          appendTranscript("user", userTranscriptRef.current.trim());
        }
        if (modelTranscriptRef.current.trim()) {
          appendTranscript("assistant", modelTranscriptRef.current.trim());
        }
        userTranscriptRef.current = "";
        modelTranscriptRef.current = "";
      }
    },
    [appendTranscript, handleToolCall, playPcmChunk, resetPlayback]
  );

  const stopSession = useCallback(async () => {
    isActiveRef.current = false;
    closeSession(sessionRef.current);
    sessionRef.current = undefined;
    await cleanupAudio();
    setStatus("idle");
  }, [cleanupAudio, closeSession]);

  const startSession = useCallback(async () => {
    setErrorMessage(null);
    setStatus("preparing");
    setSummary(emptyIntakeSummary());
    setTranscript([]);
    sessionStorage.removeItem(INTAKE_STORAGE_KEY);
    sessionStorage.removeItem(TRANSCRIPT_STORAGE_KEY);

    try {
      await setupAudio();

      setStatus("connecting");
      const tokenResponse = await fetch("/api/live-token", { method: "POST" });
      const tokenPayload = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(
          tokenPayload.detail || tokenPayload.error || "Could not create token"
        );
      }

      const { token, model, voiceName } = tokenPayload as TokenPayload;
      modelRef.current = model;
      voiceNameRef.current = voiceName;

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      let setupComplete = false;
      const activate = () => {
        if (setupComplete && sessionRef.current && isActiveRef.current) {
          setStatus("live");
          startCapture();
          appendTranscript("system", "Session connected. Describe your symptoms.");
        }
      };

      const session = await ai.live.connect({
        model,
        config: createLiveConnectConfig(voiceName),
        callbacks: {
          onopen: () => {
            isActiveRef.current = true;
          },
          onmessage: (message) => {
            handleLiveMessage(message, () => {
              setupComplete = true;
              activate();
            });
          },
          onerror: (event) => {
            setErrorMessage(event.message || "Gemini Live session error.");
            setStatus("error");
            void stopSession();
          },
          onclose: () => {
            if (isActiveRef.current) {
              isActiveRef.current = false;
              setStatus((s) => (s === "complete" ? "complete" : "idle"));
            }
          },
        },
      });

      sessionRef.current = session;
      activate();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start session"
      );
      setStatus("error");
      await cleanupAudio();
    }
  }, [
    appendTranscript,
    cleanupAudio,
    handleLiveMessage,
    setupAudio,
    startCapture,
    stopSession,
  ]);

  useEffect(() => {
    return () => {
      void stopSession();
    };
  }, [stopSession]);

  return {
    status,
    summary,
    transcript,
    inputLevel,
    outputLevel,
    errorMessage,
    startSession,
    stopSession,
  };
}
