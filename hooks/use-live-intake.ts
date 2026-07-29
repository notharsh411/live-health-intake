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
  changedSummaryKeys,
  COMPLETE_INTAKE,
  emptyIntakeSummary,
  hasRequiredFields,
  INTAKE_STORAGE_KEY,
  mergeIntakeSummary,
  RECORDING_STORAGE_KEY,
  SESSION_META_KEY,
  SET_TRIAGE_LEVEL,
  TRANSCRIPT_STORAGE_KEY,
  TRIAGE_REASON_KEY,
  UPDATE_INTAKE_SUMMARY,
  type IntakeSummary,
  type TriageLevel,
} from "@/lib/intake-schema";
import type { SessionOptions } from "@/lib/session-options";
import {
  appendRecordingEvent,
  createRecording,
  type RecordingEvent,
  type SessionRecording,
} from "@/lib/session-recording";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  resumeAudioContext,
  type WakeLockSentinelLike,
} from "@/lib/wake-lock";

export type SessionStatus =
  | "idle"
  | "preparing"
  | "connecting"
  | "ready"
  | "live"
  | "complete"
  | "interrupted"
  | "error";

type TokenPayload = {
  token: string;
  model: string;
  voiceName: string;
};

const VIDEO_INTERVAL_MS = 1100;
/** Give the patient time to aim before any frame is sent. */
const FRAME_AIM_GRACE_MS = 2200;

export type CameraFacing = "user" | "environment";

/** Skip near-black / washed-out / flat frames that trigger hallucinated vision. */
function isFrameUsefulForVision(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const sample = Math.min(48, width, height);
  const stepX = Math.max(1, Math.floor(width / sample));
  const stepY = Math.max(1, Math.floor(height / sample));
  const data = ctx.getImageData(0, 0, width, height).data;
  let count = 0;
  let sum = 0;
  let sumSq = 0;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
      count += 1;
    }
  }

  if (count < 16) return false;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  if (mean < 18 || mean > 245) return false;
  if (variance < 90) return false;
  return true;
}

function hasSavedSummary(): boolean {
  try {
    const raw = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as IntakeSummary;
    return Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

export function useLiveIntake(onComplete?: () => void) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [summary, setSummary] = useState<IntakeSummary>(emptyIntakeSummary);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pulsedFields, setPulsedFields] = useState<string[]>([]);
  const [triageReason, setTriageReason] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment");
  const [framesStreaming, setFramesStreaming] = useState(false);
  const [recording, setRecording] = useState<SessionRecording | null>(null);

  const sessionRef = useRef<Session | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const videoStreamRef = useRef<MediaStream | undefined>(undefined);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const videoTimerRef = useRef<number | null>(null);
  const framesStreamingRef = useRef(false);
  const frameArmedAtRef = useRef(0);
  const cameraFacingRef = useRef<CameraFacing>("environment");
  const captureContextRef = useRef<AudioContext | undefined>(undefined);
  const playbackContextRef = useRef<AudioContext | undefined>(undefined);
  const playbackGainRef = useRef<GainNode | undefined>(undefined);
  const captureWorkletRef = useRef<AudioWorkletNode | undefined>(undefined);
  const captureSourceRef = useRef<MediaStreamAudioSourceNode | undefined>(
    undefined
  );
  const playbackCursorRef = useRef(0);
  const isActiveRef = useRef(false);
  const conversationStartedRef = useRef(false);
  const voiceNameRef = useRef("Aoede");
  const optionsRef = useRef<SessionOptions>({
    language: "en",
    specialty: "general",
  });
  const userTranscriptRef = useRef("");
  const modelTranscriptRef = useRef("");
  const recordingRef = useRef<SessionRecording | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const statusRef = useRef<SessionStatus>("idle");
  statusRef.current = status;

  const persistState = useCallback(
    (nextSummary: IntakeSummary, lines: string[]) => {
      sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(nextSummary));
      sessionStorage.setItem(TRANSCRIPT_STORAGE_KEY, lines.join("\n"));
      if (recordingRef.current) {
        sessionStorage.setItem(
          RECORDING_STORAGE_KEY,
          JSON.stringify(recordingRef.current)
        );
      }
    },
    []
  );

  const pushRecording = useCallback(
    (event: RecordingEvent | Omit<RecordingEvent, "t">) => {
      if (!recordingRef.current) return;
      const withTime =
        "t" in event && typeof event.t === "number"
          ? (event as RecordingEvent)
          : ({
              ...event,
              t: Date.now() - recordingRef.current.startedAt,
            } as RecordingEvent);
      const next = appendRecordingEvent(recordingRef.current, withTime);
      recordingRef.current = next;
      setRecording(next);
      sessionStorage.setItem(RECORDING_STORAGE_KEY, JSON.stringify(next));
    },
    []
  );

  const summaryRef = useRef(summary);
  const transcriptRef = useRef(transcript);
  summaryRef.current = summary;
  transcriptRef.current = transcript;

  const pulseFields = useCallback((keys: string[]) => {
    if (!keys.length) return;
    setPulsedFields(keys);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => setPulsedFields([]), 1600);
  }, []);

  const appendTranscript = useCallback(
    (role: "user" | "assistant" | "system", text: string) => {
      setTranscript((prev) => {
        const next = [...prev, `[${role}] ${text}`];
        persistState(summaryRef.current, next);
        return next;
      });
      pushRecording({ type: "transcript", role, text });
    },
    [persistState, pushRecording]
  );

  const stopCamera = useCallback(() => {
    if (videoTimerRef.current) {
      window.clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    framesStreamingRef.current = false;
    setFramesStreaming(false);
    frameArmedAtRef.current = 0;
    if (videoStreamRef.current) {
      for (const track of videoStreamRef.current.getTracks()) track.stop();
    }
    videoStreamRef.current = undefined;
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
    }
    setCameraEnabled(false);
  }, []);

  const attachVideoStream = useCallback(async (stream: MediaStream) => {
    if (videoStreamRef.current) {
      for (const track of videoStreamRef.current.getTracks()) track.stop();
    }
    videoStreamRef.current = stream;
    if (videoElRef.current) {
      videoElRef.current.srcObject = stream;
      await videoElRef.current.play().catch(() => undefined);
    }
  }, []);

  const requestCameraStream = useCallback(async (facing: CameraFacing) => {
    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  }, []);

  const cleanupAudio = useCallback(async () => {
    setInputLevel(0);
    setOutputLevel(0);
    stopCamera();

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
  }, [stopCamera]);

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
      if (!session || !isActiveRef.current || !conversationStartedRef.current) {
        return;
      }

      session.sendRealtimeInput({
        audio: {
          data: arrayBufferToBase64(pcmBuffer),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    };

    captureSourceRef.current.connect(captureWorkletRef.current);
  }, []);

  const sendVideoFrame = useCallback(() => {
    const session = sessionRef.current;
    const video = videoElRef.current;
    if (!session || !video || !conversationStartedRef.current) return;
    if (!framesStreamingRef.current) return;
    if (Date.now() < frameArmedAtRef.current) return;
    if (video.videoWidth < 16 || video.videoHeight < 16) return;

    const canvas = document.createElement("canvas");
    const maxSide = 768;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(16, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(16, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (!isFrameUsefulForVision(ctx, canvas.width, canvas.height)) return;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;

    session.sendRealtimeInput({
      video: {
        data: base64,
        mimeType: "image/jpeg",
      },
    });
  }, []);

  const ensureFrameTimer = useCallback(() => {
    if (videoTimerRef.current) return;
    videoTimerRef.current = window.setInterval(sendVideoFrame, VIDEO_INTERVAL_MS);
  }, [sendVideoFrame]);

  const enableCamera = useCallback(async () => {
    try {
      const facing = cameraFacingRef.current;
      const stream = await requestCameraStream(facing);
      await attachVideoStream(stream);
      setCameraFacing(facing);
      setCameraEnabled(true);
      setCameraPromptOpen(false);
      framesStreamingRef.current = false;
      setFramesStreaming(false);
      frameArmedAtRef.current = 0;
      appendTranscript(
        "system",
        "Camera preview on. Frames are not shared yet — aim at the item, then tap “I’m showing it now”."
      );
      // Timer may run, but framesStreamingRef stays false until armed.
      ensureFrameTimer();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not access the camera."
      );
      setCameraPromptOpen(false);
    }
  }, [appendTranscript, attachVideoStream, ensureFrameTimer, requestCameraStream]);

  const beginFrameStreaming = useCallback(() => {
    if (!cameraEnabled || !videoStreamRef.current) return;
    framesStreamingRef.current = true;
    setFramesStreaming(true);
    // Aim grace: do not send frames (or vision-priming text) immediately.
    frameArmedAtRef.current = Date.now() + FRAME_AIM_GRACE_MS;
    ensureFrameTimer();
    appendTranscript(
      "system",
      "Sharing will start in a couple of seconds. Hold the label, skin area, or document steady and fill the frame."
    );
    // Intentionally no sendRealtimeInput text — that was priming false “I see a rash” turns.
  }, [appendTranscript, cameraEnabled, ensureFrameTimer]);

  const switchCamera = useCallback(async () => {
    if (!cameraEnabled) return;
    const next: CameraFacing =
      cameraFacingRef.current === "environment" ? "user" : "environment";
    try {
      const stream = await requestCameraStream(next);
      await attachVideoStream(stream);
      cameraFacingRef.current = next;
      setCameraFacing(next);
      appendTranscript(
        "system",
        next === "environment"
          ? "Switched to rear camera."
          : "Switched to front camera."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not switch cameras on this device."
      );
    }
  }, [appendTranscript, attachVideoStream, cameraEnabled, requestCameraStream]);

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
          const changed = changedSummaryKeys(prev, merged);
          pulseFields(changed);
          persistState(merged, transcriptRef.current);
          pushRecording({ type: "fields", keys: changed, summary: merged });
          return merged;
        });
        response = { updated: true };
      } else if (name === SET_TRIAGE_LEVEL) {
        const level = args.level as TriageLevel;
        const reason =
          typeof args.reason === "string" ? args.reason : undefined;
        if (level === "routine" || level === "soon" || level === "urgent") {
          setTriageReason(reason ?? null);
          if (reason) sessionStorage.setItem(TRIAGE_REASON_KEY, reason);
          else sessionStorage.removeItem(TRIAGE_REASON_KEY);
          setSummary((prev) => {
            const merged = { ...prev, triage_level: level };
            pulseFields(["triage_level"]);
            persistState(merged, transcriptRef.current);
            return merged;
          });
          pushRecording({ type: "triage", level, reason });
          response = { level, saved: true };
        } else {
          response = { error: "Invalid triage level" };
        }
      } else if (name === COMPLETE_INTAKE && args.ready === true) {
        if (!hasRequiredFields(summaryRef.current)) {
          response = {
            ready: false,
            error:
              "Still missing chief complaint, duration, or severity. Keep asking.",
          };
        } else {
          setStatus("complete");
          isActiveRef.current = false;
          conversationStartedRef.current = false;
          void releaseScreenWakeLock(wakeLockRef.current);
          wakeLockRef.current = null;
          response = { ready: true };
          appendTranscript("system", "Intake marked complete.");
          pushRecording({ type: "complete" });
          onComplete?.();
        }
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
    [appendTranscript, onComplete, persistState, pulseFields, pushRecording]
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
    conversationStartedRef.current = false;
    await releaseScreenWakeLock(wakeLockRef.current);
    wakeLockRef.current = null;
    closeSession(sessionRef.current);
    sessionRef.current = undefined;
    await cleanupAudio();
    setStatus("idle");
    setCameraPromptOpen(false);
  }, [cleanupAudio, closeSession]);

  const markInterrupted = useCallback(async (reason: string) => {
    isActiveRef.current = false;
    conversationStartedRef.current = false;
    await releaseScreenWakeLock(wakeLockRef.current);
    wakeLockRef.current = null;
    sessionRef.current = undefined;
    await cleanupAudio();
    persistState(summaryRef.current, transcriptRef.current);
    appendTranscript("system", reason);
    setStatus(hasSavedSummary() ? "interrupted" : "error");
    setCameraPromptOpen(false);
  }, [appendTranscript, cleanupAudio, persistState]);

  const acquireWakeLock = useCallback(async () => {
    await releaseScreenWakeLock(wakeLockRef.current);
    wakeLockRef.current = await requestScreenWakeLock();
  }, []);

  const beginConversation = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || status !== "ready") return;

    conversationStartedRef.current = true;
    setStatus("live");
    startCapture();
    await acquireWakeLock();

    try {
      await session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: "I am ready. Please greet me briefly and ask what brought me in today. Keep this as a live conversation until the intake is complete.",
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch {
      // Some Live builds accept realtime text instead; audio path still works.
    }

    appendTranscript(
      "system",
      "Conversation started. Keep talking through the follow-ups. Leave the screen on if you can."
    );
    window.setTimeout(() => setCameraPromptOpen(true), 4500);
  }, [acquireWakeLock, appendTranscript, startCapture, status]);

  const startSession = useCallback(
    async (options: SessionOptions) => {
      setErrorMessage(null);
      setStatus("preparing");
      setSummary(emptyIntakeSummary());
      setTranscript([]);
      setPulsedFields([]);
      setTriageReason(null);
      setCameraPromptOpen(false);
      optionsRef.current = options;
      conversationStartedRef.current = false;

      const freshRecording = createRecording(options);
      recordingRef.current = freshRecording;
      setRecording(freshRecording);

      sessionStorage.removeItem(INTAKE_STORAGE_KEY);
      sessionStorage.removeItem(TRANSCRIPT_STORAGE_KEY);
      sessionStorage.removeItem(TRIAGE_REASON_KEY);
      sessionStorage.setItem(RECORDING_STORAGE_KEY, JSON.stringify(freshRecording));
      sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(options));

      try {
        await setupAudio();

        setStatus("connecting");
        const tokenResponse = await fetch("/api/live-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options),
        });
        const tokenPayload = await tokenResponse.json();
        if (!tokenResponse.ok) {
          throw new Error(
            tokenPayload.detail || tokenPayload.error || "Could not create token"
          );
        }

        const { token, model, voiceName } = tokenPayload as TokenPayload;
        voiceNameRef.current = voiceName;

        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: "v1alpha" },
        });

        let setupComplete = false;
        const activate = () => {
          if (setupComplete && sessionRef.current && isActiveRef.current) {
            setStatus("ready");
            appendTranscript(
              "system",
              "Connected. Tap I'm ready to speak to begin the live intake."
            );
          }
        };

        const session = await ai.live.connect({
          model,
          config: createLiveConnectConfig(voiceName, options),
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
            onerror: () => {
              setErrorMessage(
                "The live connection dropped. Your saved summary is still available."
              );
              void markInterrupted(
                "Connection error. Partial summary was saved in this browser."
              );
            },
            onclose: () => {
              if (statusRef.current === "complete") return;
              if (
                conversationStartedRef.current ||
                statusRef.current === "live" ||
                statusRef.current === "ready"
              ) {
                void markInterrupted(
                  "Session closed (often from screen sleep). Partial summary was saved."
                );
                return;
              }
              isActiveRef.current = false;
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
    },
    [
      appendTranscript,
      cleanupAudio,
      handleLiveMessage,
      markInterrupted,
      setupAudio,
    ]
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void resumeAudioContext(captureContextRef.current);
        void resumeAudioContext(playbackContextRef.current);
        if (statusRef.current === "live") {
          void acquireWakeLock();
        }
        return;
      }

      // Screen off / tab hidden: force-persist whatever we have so far.
      persistState(summaryRef.current, transcriptRef.current);
    };

    const onPageHide = () => {
      persistState(summaryRef.current, transcriptRef.current);
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (statusRef.current === "live" || statusRef.current === "ready") {
        persistState(summaryRef.current, transcriptRef.current);
        event.preventDefault();
        event.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [acquireWakeLock, persistState]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      void releaseScreenWakeLock(wakeLockRef.current);
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
    pulsedFields,
    triageReason,
    cameraEnabled,
    cameraPromptOpen,
    cameraFacing,
    framesStreaming,
    recording,
    videoElRef,
    startSession,
    beginConversation,
    enableCamera,
    beginFrameStreaming,
    switchCamera,
    declineCamera: () => setCameraPromptOpen(false),
    stopCamera,
    stopSession,
  };
}
