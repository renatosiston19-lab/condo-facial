"use client";

import { useEffect, useRef, useState } from "react";

type Stage =
  | "idle"
  | "loading-camera"
  | "camera-error"
  | "ready"
  | "preview"
  | "sending"
  | "processing"
  | "success"
  | "error";

const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 800;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export function FaceCapture({ token }: { token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Some navegadores (principalmente iOS Safari) só concedem acesso à câmera
  // quando getUserMedia é chamado diretamente dentro de um gesto do usuário
  // (um clique) — por isso a câmera não é ativada automaticamente ao carregar
  // a página, só quando a pessoa toca em "Ativar câmera"/"Tirar novamente".
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setStage("loading-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: CAPTURE_WIDTH }, height: { ideal: CAPTURE_HEIGHT } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStage("ready");
    } catch {
      setErrorMessage(
        "Não foi possível acessar a câmera. Verifique se você deu permissão ao navegador nas configurações do celular.",
      );
      setStage("camera-error");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const videoAspect = video.videoWidth / video.videoHeight;
    const targetAspect = CAPTURE_WIDTH / CAPTURE_HEIGHT;
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    if (videoAspect > targetAspect) {
      sw = video.videoHeight * targetAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / targetAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStage("preview");
  }

  function retake() {
    setPhoto(null);
    startCamera();
  }

  async function confirmSend() {
    if (!photo) return;
    setStage("sending");
    try {
      const response = await fetch(`/api/cadastros/${token}/foto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto: photo }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? "Falha ao enviar a foto.");
        setStage("error");
        return;
      }
      if (data.status === "CONCLUIDO") {
        setStage("success");
        return;
      }
      if (data.status === "ERRO") {
        setErrorMessage(data.erro ?? "Falha ao processar o cadastro.");
        setStage("error");
        return;
      }
      setStage("processing");
      pollStatus();
    } catch {
      setErrorMessage("Falha de conexão ao enviar a foto. Tente novamente.");
      setStage("error");
    }
  }

  function pollStatus() {
    const startedAt = Date.now();
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/cadastros/${token}/status`);
        const data = await response.json();
        if (data.status === "CONCLUIDO") {
          clearInterval(interval);
          setStage("success");
        } else if (data.status === "ERRO") {
          clearInterval(interval);
          setErrorMessage(data.erro ?? "Falha ao processar o cadastro.");
          setStage("error");
        } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(interval);
          setErrorMessage("O cadastro está demorando mais que o esperado. Atualize a página em instantes.");
          setStage("error");
        }
      } catch {
        // ignore transient network errors while polling
      }
    }, POLL_INTERVAL_MS);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      {stage === "camera-error" && <p className="text-red-600 text-sm text-center">{errorMessage}</p>}

      {(stage === "idle" || stage === "loading-camera" || stage === "ready") && (
        <div className="relative w-64 h-80 rounded-full overflow-hidden bg-black flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          {stage === "loading-camera" && (
            <p className="absolute text-white text-sm">Abrindo câmera...</p>
          )}
          <div className="absolute inset-0 border-4 border-white/70 rounded-full pointer-events-none" />
        </div>
      )}

      {stage === "idle" && (
        <button onClick={startCamera} className="bg-brand-navy hover:bg-brand-navy-dark text-white rounded-full px-6 py-3 w-full transition-colors">
          Ativar câmera
        </button>
      )}

      {stage === "ready" && (
        <button onClick={capturePhoto} className="bg-brand-navy hover:bg-brand-navy-dark text-white rounded-full px-6 py-3 w-full transition-colors">
          Tirar foto
        </button>
      )}

      {(stage === "preview" || stage === "sending") && photo && (
        <>
          <img src={photo} alt="Prévia da foto" className="w-64 h-80 object-cover rounded-full" />
          <div className="flex gap-2 w-full">
            <button onClick={retake} disabled={stage === "sending"} className="flex-1 border rounded-full px-4 py-3">
              Tirar novamente
            </button>
            <button onClick={confirmSend} disabled={stage === "sending"} className="flex-1 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-full px-4 py-3 transition-colors">
              {stage === "sending" ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </>
      )}

      {stage === "processing" && <p className="text-sm text-gray-600">Processando seu cadastro...</p>}

      {stage === "success" && (
        <p className="text-green-700 font-medium text-center">Cadastro facial concluído com sucesso!</p>
      )}

      {stage === "error" && (
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm">{errorMessage}</p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
