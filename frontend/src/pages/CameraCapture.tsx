import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Upload, CheckCircle2, AlertCircle, MapPin, Image as ImageIcon } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface CameraCaptureProps {
  farmer: { id: string; name: string };
  plot: { id: string; digipin: string; polygon: [number, number][] } | null;
  onPhotoConfirmed: (photoInfo: any) => void;
  lang: Language;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  farmer,
  plot,
  onPhotoConfirmed,
  lang
}) => {
  const t = translations[lang];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: plot?.polygon?.[0]?.[0] || 13.2456,
    lon: plot?.polygon?.[0]?.[1] || 77.7123
  });
  const [checking, setChecking] = useState(false);
  const [locationCheck, setLocationCheck] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get live GPS if available
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lon: Number(pos.coords.longitude.toFixed(6))
          });
        },
        (err) => {
          console.warn("GPS unavailable, falling back to plot coords:", err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Initialize camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setErrorMsg(null);
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setStreamActive(false);
      setErrorMsg("Camera access denied or unsupported. Please use the 'Upload from Gallery' button.");
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Stamp details onto canvas
  const drawStampOnCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    lat: number,
    lon: number,
    digipin: string,
    farmerName: string
  ) => {
    const barHeight = Math.max(50, height * 0.16);
    // Dark semi-transparent background banner at bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, height - barHeight, width, barHeight);

    // Green accent line
    ctx.fillStyle = "#2E7D32";
    ctx.fillRect(0, height - barHeight, width, 4);

    // Text formatting
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.max(12, Math.floor(height * 0.03))}px sans-serif`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const line1 = `📍 GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)} | DIGIPIN: ${digipin || '4PC-MK3-J434'}`;
    const line2 = `👨‍🌾 Farmer: ${farmerName} | ⏰ ${dateStr} ${timeStr}`;

    ctx.fillText(line1, 16, height - barHeight + 24);
    ctx.font = `normal ${Math.max(11, Math.floor(height * 0.026))}px sans-serif`;
    ctx.fillText(line2, 16, height - barHeight + 48);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw watermark stamp
    drawStampOnCanvas(
      ctx,
      canvas.width,
      canvas.height,
      coords.lat,
      coords.lon,
      plot?.digipin || "4PC-MK3-J434",
      farmer.name
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);

    // Send to backend location check
    verifyLocationWithBackend(dataUrl, coords.lat, coords.lon);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        drawStampOnCanvas(
          ctx,
          canvas.width,
          canvas.height,
          coords.lat,
          coords.lon,
          plot?.digipin || "4PC-MK3-J434",
          farmer.name
        );

        const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedImage(stampedDataUrl);
        verifyLocationWithBackend(stampedDataUrl, coords.lat, coords.lon);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const verifyLocationWithBackend = async (dataUrl: string, lat: number, lon: number) => {
    if (!plot) return;
    setChecking(true);
    try {
      // Convert dataUrl to blob
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append('plot_id', plot.id);
      formData.append('lat', lat.toString());
      formData.append('lon', lon.toString());
      formData.append('photo', blob, 'claim_photo.jpg');

      const res = await fetch('/api/photo/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setLocationCheck(data.check);
      }
    } catch (err) {
      console.error("Photo verification failed:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    onPhotoConfirmed({
      photo_url: capturedImage,
      photo_lat: coords.lat,
      photo_lon: coords.lon,
      photo_passed: locationCheck?.passed ?? true,
      photo_distance_meters: locationCheck?.distance_meters ?? 0.0,
      location_message: lang === 'kn' ? locationCheck?.message_kn : locationCheck?.message_en
    });
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#2E7D32]" />
            <span>{t.cameraTitle}</span>
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">{t.cameraSubtitle}</p>
        </div>
        <AudioSpeaker
          text={`${t.cameraTitle}. ${t.watermarkNote}`}
          lang={lang}
          label={t.listenScreen}
        />
      </div>

      {/* Hidden processing canvas & file input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera Preview / Captured Photo Display */}
      <div className="relative w-full h-[340px] bg-black rounded-2xl overflow-hidden shadow-md border-2 border-emerald-700/40 flex items-center justify-center">
        {!capturedImage ? (
          streamActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center text-stone-300 space-y-3">
              <Camera className="w-12 h-12 text-stone-500 mx-auto" />
              <p className="text-xs">{errorMsg || "Starting back camera..."}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-xl flex items-center gap-2 mx-auto shadow"
              >
                <Upload className="w-4 h-4" />
                <span>{t.uploadFallbackBtn}</span>
              </button>
            </div>
          )
        ) : (
          <img
            src={capturedImage}
            alt="Captured evidence"
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Live GPS badge overlay */}
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>{coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</span>
        </div>

        {/* Camera flip control */}
        {streamActive && !capturedImage && (
          <button
            onClick={handleFlipCamera}
            className="absolute top-3 right-3 bg-white/80 p-2 rounded-full text-stone-800 shadow hover:bg-white"
            title={t.switchCameraBtn}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Geofence Location Verification Result */}
      {locationCheck && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 shadow-sm ${
            locationCheck.passed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {locationCheck.passed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="text-xs font-black uppercase tracking-wide block">
              {locationCheck.is_inside
                ? t.photoInsideField
                : locationCheck.passed
                ? t.photoNearField
                : t.photoFarField}
            </span>
            <p className="text-xs mt-0.5 font-medium">
              {lang === 'kn' ? locationCheck.message_kn : locationCheck.message_en}
            </p>
          </div>
        </div>
      )}

      {/* Action Controls */}
      {!capturedImage ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={capturePhoto}
            disabled={!streamActive}
            className="min-h-[56px] bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-black text-base rounded-xl shadow flex items-center justify-center gap-2 active:scale-95"
          >
            <Camera className="w-6 h-6" />
            <span>{t.takePhotoBtn}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[56px] bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-sm rounded-xl shadow flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5 text-emerald-700" />
            <span>{t.uploadFallbackBtn}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setCapturedImage(null);
              setLocationCheck(null);
              startCamera(facingMode);
            }}
            className="min-h-[56px] bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-base rounded-xl flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>{t.retakeBtn}</span>
          </button>
          <button
            onClick={handleConfirm}
            className="min-h-[56px] bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black text-base rounded-xl shadow flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            <span>{t.confirmPhotoBtn}</span>
          </button>
        </div>
      )}
    </div>
  );
};
