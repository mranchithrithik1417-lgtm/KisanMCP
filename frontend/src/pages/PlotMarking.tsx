import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, RotateCcw, Check, Sparkles, Navigation, Layers } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

// Fix Leaflet marker icons in React bundles
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom custom draggable pin icon
const createPinIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="background-color: #2E7D32; color: white; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #F9A825; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
        ${index + 1}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

interface PlotMarkingProps {
  farmer: { id: string; name: string };
  initialPlot?: any;
  onPlotSaved: (plot: any) => void;
  lang: Language;
}

// Map event listener component to handle tapping to place pins
function MapTapHandler({
  points,
  onAddPoint
}: {
  points: [number, number][];
  onAddPoint: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (points.length < 4) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export const PlotMarking: React.FC<PlotMarkingProps> = ({
  farmer,
  initialPlot,
  onPlotSaved,
  lang
}) => {
  const t = translations[lang];

  // Default near Devanahalli, Karnataka
  const defaultCenter: [number, number] = [13.2456, 77.7123];

  const [points, setPoints] = useState<[number, number][]>(() => {
    if (initialPlot?.polygon && initialPlot.polygon.length >= 4) {
      return initialPlot.polygon.slice(0, 4);
    }
    return [
      [13.2462, 77.7118],
      [13.2464, 77.7132],
      [13.2448, 77.7135],
      [13.2446, 77.7121]
    ];
  });

  const [metrics, setMetrics] = useState({
    area_acres: initialPlot?.area_acres || 6.81,
    perimeter_m: initialPlot?.perimeter_m || 666.0,
    digipin: initialPlot?.digipin || "4PC-MK3-J434"
  });

  const [surveyNumber, setSurveyNumber] = useState(initialPlot?.survey_number || "Devanahalli Sy. 84/3");
  const [ulpin, setUlpin] = useState(initialPlot?.ulpin || "ULPIN-KA-BLR-DEV-1082");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Re-calculate plot metrics whenever points change
  useEffect(() => {
    if (points.length >= 3) {
      fetch('/api/plots/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: points })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.metrics) {
            setMetrics({
              area_acres: data.metrics.area_acres,
              perimeter_m: data.metrics.perimeter_m,
              digipin: data.metrics.digipin
            });
          }
        })
        .catch(err => console.error("Metrics calc failed:", err));
    }
  }, [points]);

  const handleDragPoint = (index: number, newLatLng: L.LatLng) => {
    const updated = [...points];
    updated[index] = [newLatLng.lat, newLatLng.lng];
    setPoints(updated);
  };

  const handleAddPoint = (coord: [number, number]) => {
    if (points.length < 4) {
      setPoints([...points, coord]);
    }
  };

  const handleResetPoints = () => {
    setPoints([]);
  };

  const handleSavePlot = async () => {
    if (points.length < 4) {
      alert(lang === 'kn' ? 'ದಯವಿಟ್ಟು ಜಮೀನಿನ 4 ಮೂಲೆಗಳನ್ನು ಗುರುತಿಸಿ' : 'Please mark all 4 corner points of your plot');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: farmer.id,
          coordinates: points,
          survey_number: surveyNumber,
          ulpin: ulpin,
          plot_id: initialPlot?.id
        })
      });
      const data = await res.json();
      if (data.success && data.plot) {
        setSaveSuccess(true);
        onPlotSaved(data.plot);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert("Error saving plot");
    } finally {
      setLoading(false);
    }
  };

  const voiceSummary = `${t.plotTitle}. ${t.areaLabel}: ${metrics.area_acres} ${t.acres}. ${t.digipinLabel}: ${metrics.digipin}.`;

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-10">
      {/* Title & Voice Speaker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#2E7D32]" />
            <span>{t.plotTitle}</span>
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            {points.length < 4 ? t.tapToPlacePoints : t.dragToAdjust} ({points.length}/4 points)
          </p>
        </div>
        <AudioSpeaker text={voiceSummary} lang={lang} label={t.listenScreen} />
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[320px] rounded-2xl overflow-hidden shadow-md border-2 border-emerald-700/40 bg-stone-900">
        <MapContainer
          center={points.length > 0 ? points[0] : defaultCenter}
          zoom={17}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          {/* Esri World Imagery Satellite Tiles */}
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />

          <MapTapHandler points={points} onAddPoint={handleAddPoint} />

          {/* Draggable Markers */}
          {points.map((pt, idx) => (
            <Marker
              key={`marker-${idx}`}
              position={pt}
              draggable={true}
              icon={createPinIcon(idx)}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  handleDragPoint(idx, pos);
                }
              }}
            />
          ))}

          {/* Plot Polygon */}
          {points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{
                color: '#F9A825',
                fillColor: '#4CAF50',
                fillOpacity: 0.35,
                weight: 3
              }}
            />
          )}
        </MapContainer>

        {/* Satellite Badge Overlay */}
        <div className="absolute top-3 left-3 z-[1000] bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Esri World Imagery (Satellite)</span>
        </div>

        {/* Reset Points Button */}
        {points.length > 0 && (
          <button
            onClick={handleResetPoints}
            className="absolute top-3 right-3 z-[1000] bg-white/95 text-stone-700 hover:text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetPointsBtn}</span>
          </button>
        )}
      </div>

      {/* Live Computed Metrics Card */}
      <div className="grid grid-cols-3 gap-2 bg-[#FFF8E1] p-3 rounded-xl border border-amber-300 shadow-sm text-center">
        <div className="p-1">
          <span className="text-[11px] font-bold text-stone-600 block">{t.areaLabel}</span>
          <span className="text-lg font-black text-[#2E7D32]">{metrics.area_acres}</span>
          <span className="text-[10px] text-stone-500 block">{t.acres}</span>
        </div>
        <div className="p-1 border-x border-amber-200">
          <span className="text-[11px] font-bold text-stone-600 block">{t.perimeter}</span>
          <span className="text-lg font-black text-stone-800">{metrics.perimeter_m}</span>
          <span className="text-[10px] text-stone-500 block">Metres</span>
        </div>
        <div className="p-1">
          <span className="text-[11px] font-bold text-stone-600 block">{t.digipinLabel}</span>
          <span className="text-sm font-black text-amber-900 tracking-wider font-mono block mt-1">
            {metrics.digipin}
          </span>
          <span className="text-[9px] text-emerald-800 font-bold block">10-Digit Geo-Code</span>
        </div>
      </div>

      {/* Form Fields: Survey Number & ULPIN */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            {t.surveyLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={surveyNumber}
            onChange={(e) => setSurveyNumber(e.target.value)}
            placeholder={t.surveyPlaceholder}
            className="w-full px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            ULPIN (Unique Land Parcel Identification Number)
          </label>
          <input
            type="text"
            value={ulpin}
            onChange={(e) => setUlpin(e.target.value)}
            placeholder={t.ulpinPlaceholder}
            className="w-full px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm font-medium"
          />
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-100 text-[#2E7D32] rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-300">
          <Check className="w-5 h-5" />
          <span>{t.plotSavedSuccess}</span>
        </div>
      )}

      {/* Big Action Save Button */}
      <button
        onClick={handleSavePlot}
        disabled={loading || points.length < 4}
        className="w-full min-h-[56px] py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-black text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Check className="w-6 h-6 stroke-[3]" />
        <span>{loading ? "Saving..." : t.savePlotBtn}</span>
      </button>
    </div>
  );
};
