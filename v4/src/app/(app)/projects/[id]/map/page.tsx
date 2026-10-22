"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryCharging,
  Box,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileCheck2,
  Grid,
  Home,
  Info,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  ShieldAlert,
  Sliders,
  Sun,
  Trash2,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import { fetchBuildingsAroundLocation, BuildingFeature } from "@/lib/geo/buildings";
import type {
  LatLngPoint,
  PanelLayoutConfig,
  PlacedPanel,
  RestrictedZone,
  RestrictedZoneCategory,
  SolarPanelLayout,
} from "@/lib/solar/types";
import {
  DEFAULT_LAYOUT_CONFIG,
  PRESET_PANEL_SPECS,
  RESTRICTED_ZONE_LABELS,
} from "@/lib/solar/types";
import {
  calculatePolygonAreaM2,
  calculateUsableArea,
  getPanelBoundingPoints,
  latLngToLocalMeters,
  localMetersToLatLng,
} from "@/lib/geo/geometry";
import { generatePanelLayout } from "@/lib/solar/layout";
import { validatePanels } from "@/lib/solar/validation";
import { useLayoutHistory } from "@/lib/solar/useLayoutHistory";
import type { MapMode } from "@/components/projects/SiteLayoutMap";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import "./site-layout.css";

// Dynamic import with SSR disabled for Leaflet map component
const SiteLayoutMap = dynamic(
  () => import("@/components/projects/SiteLayoutMap"),
  {
    ssr: false,
    loading: () => (
      <div className="solarscope-site-map-wrapper" style={{ height: "560px" }}>
        <div className="solarscope-site-map-loading">
          <Loader2 size={32} className="solarscope-spin" />
          <span>Loading solar engineering workspace...</span>
        </div>
      </div>
    ),
  }
);

// Dynamic import for Isolated 3D Building Studio
const IsolatedBuildingWorkspace = dynamic(
  () => import("@/components/projects/IsolatedBuildingWorkspace"),
  { ssr: false }
);

export default function ProjectSiteLayoutPage({
  params,
}: {
  params?: { id: string };
}) {
  const router = useRouter();
  const routerParams = useParams();
  const projectId = (params?.id || routerParams?.id) as string;

  const { getProject, updateProject, isLoading: isContextLoading } = useProjects();
  const project = getProject(projectId);

  // 4-Step Simplified Customer Wizard: 1 = Boundary, 2 = Solar Panels, 3 = Battery Storage, 4 = Finalize & Report
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Battery Storage Workflow State
  const [batteryIncluded, setBatteryIncluded] = useState<boolean>(() => project?.batteryIncluded ?? false);
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState<number>(() => project?.batteryCapacityKwh ?? 5.12);
  const [batteryModel, setBatteryModel] = useState<string>(() => project?.batteryModel ?? "LiFePO4 Home Storage 5.12 kWh");

  // Legacy tab compatibility
  const [activeTab, setActiveTab] = useState<
    "SITE" | "ZONES" | "LAYOUT" | "EDIT" | "FINALIZE"
  >("SITE");

  // Map Mode: 'VIEW' | 'PIN_LOCATION' | 'DRAW_BOUNDARY' | 'DRAW_ZONE' | 'PANEL_EDIT'
  const [mapMode, setMapMode] = useState<MapMode>("VIEW");

  // Core Spatial State
  const [locationCoords, setLocationCoords] = useState<LatLngPoint | null>(() => {
    if (project && typeof project.latitude === "number" && typeof project.longitude === "number") {
      return { lat: project.latitude, lng: project.longitude };
    }
    return null;
  });
  const [siteBoundary, setSiteBoundary] = useState<LatLngPoint[]>(() => project?.boundary || []);
  const [restrictedZones, setRestrictedZones] = useState<RestrictedZone[]>(() => project?.restrictedZones || []);
  const [panelLayout, setPanelLayout] = useState<SolarPanelLayout | null>(() => project?.panelLayout || null);
  const [layoutFinalized, setLayoutFinalized] = useState(() => Boolean(project?.layoutFinalized));
  const [layoutFinalizedAt, setLayoutFinalizedAt] = useState<string | undefined>(() => project?.layoutFinalizedAt);

  // Draft drawing states
  const [draftBoundaryPoints, setDraftBoundaryPoints] = useState<LatLngPoint[]>([]);
  const [draftZonePoints, setDraftZonePoints] = useState<LatLngPoint[]>([]);
  const [selectedZoneCategory, setSelectedZoneCategory] =
    useState<RestrictedZoneCategory>("CHIMNEY_VENT");
  const [zoneNameInput, setZoneNameInput] = useState("");

  // Panel layout configuration
  const [layoutConfig, setLayoutConfig] = useState<PanelLayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState<string>("highEfficiency");

  // Panel selection for manual editing
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [panelNudgeStepM, setPanelNudgeStepM] = useState<number>(0.3);

  // Panel Model modal
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [panelModalSearch, setPanelModalSearch] = useState("");
  const [panelModalFilter, setPanelModalFilter] = useState<"all" | "400" | "540" | "650">("all");

  // Auto-regenerate debounce ref
  const autoRegenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI notifications and modal dialogs
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "warning" | "error";
  } | null>(null);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [wasFinalizedModifiedWarning, setWasFinalizedModifiedWarning] = useState(false);

  // Modular Workspace & PiP UI states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [isIsolatedBuildingMode, setIsIsolatedBuildingMode] = useState(false);

  // 3D Building & House Selection State (Requirement 1, 2, 3, 4)
  const [buildings, setBuildings] = useState<BuildingFeature[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingFeature | null>(null);
  const [is3DView, setIs3DView] = useState(false); // Default to clean 2D view so map fits perfectly into screen on start
  const [tiltAngle, setTiltAngle] = useState(45);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isBuildingConfirmed, setIsBuildingConfirmed] = useState(false);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [buildingDataNote, setBuildingDataNote] = useState<string | null>(null);

  // Spacing & Setback Visual Toggles (User Requirement)
  const [showSetbackZone, setShowSetbackZone] = useState(true);
  const [showRowSpacing, setShowRowSpacing] = useState(false);
  const [showModuleSpacing, setShowModuleSpacing] = useState(false);

  // Interactive Corner Adjustment / Editing Mode (User Requirement)
  const [isEditBoundaryMode, setIsEditBoundaryMode] = useState(false);
  const [activeEditZoneId, setActiveEditZoneId] = useState<string | null>(null);

  // History Stack for Step 11
  const history = useLayoutHistory({
    boundary: [],
    restrictedZones: [],
    panelLayout: null,
  });

  const lastLoadedProjectIdRef = useRef<string | null>(null);

  // 1. Initialize State from Project on mount & navigation (survives reload, hydration & routing)
  useEffect(() => {
    if (isContextLoading) return;
    if (!project) return;

    const isDifferentProject = lastLoadedProjectIdRef.current !== project.id;
    const isMissingLayout = Boolean(project.panelLayout && !panelLayout);

    if (isDifferentProject || isMissingLayout) {
      if (
        typeof project.latitude === "number" &&
        typeof project.longitude === "number" &&
        !isNaN(project.latitude) &&
        !isNaN(project.longitude)
      ) {
        setLocationCoords({ lat: project.latitude, lng: project.longitude });
      }

      const initialBoundary = project.boundary || [];
      const initialZones = project.restrictedZones || [];
      const initialLayout = project.panelLayout || null;

      setSiteBoundary(initialBoundary);
      setRestrictedZones(initialZones);
      setPanelLayout(initialLayout);

      setLayoutFinalized(Boolean(project.layoutFinalized));
      setLayoutFinalizedAt(project.layoutFinalizedAt);

      if (initialLayout?.config) {
        setLayoutConfig(initialLayout.config);
      }

      // Initialize history stack
      history.reset({
        boundary: initialBoundary,
        restrictedZones: initialZones,
        panelLayout: initialLayout,
      });

      lastLoadedProjectIdRef.current = project.id;
    }
  }, [project, isContextLoading, history, panelLayout]);

  // Fetch 3D Building Footprints around Project Coordinates (~50m-80m radius)
  useEffect(() => {
    if (!locationCoords) return;
    let isCancelled = false;
    setIsLoadingBuildings(true);

    fetchBuildingsAroundLocation(locationCoords, 80)
      .then((res) => {
        if (isCancelled) return;
        setBuildings(res.buildings);
        setBuildingDataNote(res.dataSourceNote || res.message || null);
        setIsLoadingBuildings(false);

        // Pre-select saved building or nearest property
        if (project?.selectedBuildingId) {
          const match = res.buildings.find((b) => b.id === project.selectedBuildingId);
          if (match) {
            setSelectedBuilding(match);
            setIsBuildingConfirmed(true);
            return;
          }
        }
        if (res.buildings.length > 0) {
          // Select closest building to coordinate pin
          const sorted = [...res.buildings].sort(
            (a, b) =>
              (a.distanceMeters ?? a.distanceToCenterMeters ?? 0) -
              (b.distanceMeters ?? b.distanceToCenterMeters ?? 0)
          );
          setSelectedBuilding(sorted[0]);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch building footprints:", err);
        if (!isCancelled) {
          setIsLoadingBuildings(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [locationCoords?.lat, locationCoords?.lng, project?.selectedBuildingId]);

  // Auto-regenerate layout whenever layoutConfig changes (debounced 400ms for sliders)
  useEffect(() => {
    if (siteBoundary.length < 3) return; // Need a boundary first

    if (autoRegenTimerRef.current) clearTimeout(autoRegenTimerRef.current);
    autoRegenTimerRef.current = setTimeout(() => {
      const generated = generatePanelLayout(siteBoundary, restrictedZones, layoutConfig);
      setPanelLayout(generated);
      handleModifyLayout();
    }, 400);

    return () => {
      if (autoRegenTimerRef.current) clearTimeout(autoRegenTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutConfig]);

  // Confirm House & Adopt Building Footprint as Roof Boundary
  const handleConfirmBuilding = (b: BuildingFeature) => {
    setSelectedBuilding(b);
    setIsBuildingConfirmed(true);
    setSiteBoundary(b.points);
    setDraftBoundaryPoints([]);
    handleModifyLayout();

    history.pushState({
      boundary: b.points,
      restrictedZones,
      panelLayout,
    });

    const calculatedArea = Math.round(calculatePolygonAreaM2(b.points) * 10) / 10;
    showToast(`Confirmed ${b.name || "House"}! Roof area (${calculatedArea} m²) adopted for solar design.`);
  };

  const handleDeselectBuilding = () => {
    setSelectedBuilding(null);
    setIsBuildingConfirmed(false);
  };

  // Show auto-dismissing toast notifications
  const showToast = (text: string, type: "success" | "warning" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Helper to trigger modification of finalized layout
  const handleModifyLayout = () => {
    if (layoutFinalized) {
      setLayoutFinalized(false);
      setLayoutFinalizedAt(undefined);
      setWasFinalizedModifiedWarning(true);
      showToast(
        "Layout modified: Finalization status has been reset. Please re-validate and finalize when complete.",
        "warning"
      );
    }
  };

  // Area & Geometry Calculations (Step 5)
  const areaSummary = useMemo(() => {
    return calculateUsableArea(siteBoundary, restrictedZones);
  }, [siteBoundary, restrictedZones]);

  // Panel Validation Suite (Step 10)
  const validationData = useMemo(() => {
    const currentPanels = panelLayout?.panels || [];
    return validatePanels(currentPanels, siteBoundary, restrictedZones);
  }, [panelLayout?.panels, siteBoundary, restrictedZones]);

  // Sync panels state if validation detected status changes
  const activePanels = validationData.validatedPanels;
  const layoutSummary = validationData.summary;
  const validationResult = validationData.validationResult;

  // Selected panel details for Step 9 (Manual Editing)
  const selectedPanel = useMemo(() => {
    if (!selectedPanelId) return null;
    return activePanels.find((p) => p.id === selectedPanelId) || null;
  }, [selectedPanelId, activePanels]);

  // Step 1: Location Pinning
  const handleMapPin = (point: LatLngPoint) => {
    setLocationCoords(point);
    showToast(`Site pin updated: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
  };

  // Step 3: Site Boundary Drawing
  const handleStartBoundaryDrawing = () => {
    setMapMode("DRAW_BOUNDARY");
    setDraftBoundaryPoints([]);
    showToast("Click polygon corners on the map to trace your roof boundary.", "warning");
  };

  const handleAddBoundaryPoint = (point: LatLngPoint) => {
    setDraftBoundaryPoints((prev) => [...prev, point]);
  };

  const handleUndoBoundaryPoint = () => {
    setDraftBoundaryPoints((prev) => prev.slice(0, prev.length - 1));
  };

  const handleCompleteBoundary = () => {
    if (draftBoundaryPoints.length < 3) {
      showToast("At least 3 corner points are required to close a boundary.", "error");
      return;
    }

    const calculatedArea = Math.round(calculatePolygonAreaM2(draftBoundaryPoints) * 10) / 10;
    setSiteBoundary(draftBoundaryPoints);
    setDraftBoundaryPoints([]);
    setMapMode("VIEW");
    handleModifyLayout();

    // Log to history
    history.pushState({
      boundary: draftBoundaryPoints,
      restrictedZones,
      panelLayout,
    });

    showToast(`Site boundary saved! Area: ${calculatedArea.toLocaleString()} m²`);
  };

  const handleCancelBoundary = () => {
    setDraftBoundaryPoints([]);
    setMapMode("VIEW");
  };

  const handleClearBoundary = () => {
    setSiteBoundary([]);
    setDraftBoundaryPoints([]);
    setMapMode("VIEW");
    handleModifyLayout();

    history.pushState({
      boundary: [],
      restrictedZones,
      panelLayout,
    });

    showToast("Site boundary cleared.", "warning");
  };

  // Interactive Boundary Corner Adjustment
  const handleUpdateBoundaryPoint = (index: number, newPoint: LatLngPoint) => {
    const updated = [...siteBoundary];
    updated[index] = newPoint;
    setSiteBoundary(updated);
    handleModifyLayout();

    if (activePanels.length > 0) {
      const revalidation = validatePanels(activePanels, updated, restrictedZones, layoutConfig.setbackM);
      if (panelLayout) {
        setPanelLayout({
          ...panelLayout,
          panels: revalidation.validatedPanels,
          summary: revalidation.summary,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    history.pushState({
      boundary: updated,
      restrictedZones,
      panelLayout,
    });
  };

  // Interactive Restricted Zone Corner Adjustment
  const handleUpdateZonePoint = (zoneId: string, pointIndex: number, newPoint: LatLngPoint) => {
    const nextZones = restrictedZones.map((z) => {
      if (z.id !== zoneId) return z;
      const nextPts = [...z.points];
      nextPts[pointIndex] = newPoint;
      const areaM2 = Math.round(calculatePolygonAreaM2(nextPts) * 10) / 10;
      return { ...z, points: nextPts, areaM2 };
    });

    setRestrictedZones(nextZones);
    handleModifyLayout();

    if (activePanels.length > 0) {
      const revalidation = validatePanels(activePanels, siteBoundary, nextZones, layoutConfig.setbackM);
      if (panelLayout) {
        setPanelLayout({
          ...panelLayout,
          panels: revalidation.validatedPanels,
          summary: revalidation.summary,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    history.pushState({
      boundary: siteBoundary,
      restrictedZones: nextZones,
      panelLayout,
    });
  };

  // Step 4: Usable Area & Restricted Zones
  const handleStartZoneDrawing = () => {
    if (siteBoundary.length < 3) {
      showToast("Please trace and finalize the site boundary first.", "error");
      return;
    }
    setMapMode("DRAW_ZONE");
    setDraftZonePoints([]);
    showToast(`Click corners to trace restricted zone (${RESTRICTED_ZONE_LABELS[selectedZoneCategory]}).`, "warning");
  };

  const handleAddZonePoint = (point: LatLngPoint) => {
    setDraftZonePoints((prev) => [...prev, point]);
  };

  const handleUndoZonePoint = () => {
    setDraftZonePoints((prev) => prev.slice(0, prev.length - 1));
  };

  const handleCompleteZone = () => {
    if (draftZonePoints.length < 3) {
      showToast("A restricted zone requires at least 3 corner points.", "error");
      return;
    }

    const areaM2 = Math.round(calculatePolygonAreaM2(draftZonePoints) * 10) / 10;
    const count = restrictedZones.filter((z) => z.category === selectedZoneCategory).length + 1;
    const name = zoneNameInput.trim() || `${RESTRICTED_ZONE_LABELS[selectedZoneCategory]} #${count}`;

    const newZone: RestrictedZone = {
      id: `zone-${Date.now()}`,
      name,
      category: selectedZoneCategory,
      points: draftZonePoints,
      areaM2,
      createdAt: new Date().toISOString(),
    };

    const nextZones = [...restrictedZones, newZone];
    setRestrictedZones(nextZones);
    setDraftZonePoints([]);
    setZoneNameInput("");
    setMapMode("VIEW");
    handleModifyLayout();

    history.pushState({
      boundary: siteBoundary,
      restrictedZones: nextZones,
      panelLayout,
    });

    showToast(`Restricted zone "${name}" added (${areaM2} m²).`);
  };

  const handleCancelZone = () => {
    setDraftZonePoints([]);
    setMapMode("VIEW");
  };

  const handleDeleteZone = (zoneId: string) => {
    const nextZones = restrictedZones.filter((z) => z.id !== zoneId);
    setRestrictedZones(nextZones);
    handleModifyLayout();

    history.pushState({
      boundary: siteBoundary,
      restrictedZones: nextZones,
      panelLayout,
    });

    showToast("Restricted zone removed.");
  };

  // Step 6: Solar Panel Layout Generation
  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const spec = PRESET_PANEL_SPECS[presetKey];
    if (spec) {
      const nextConfig = {
        ...layoutConfig,
        panelSpec: spec,
      };
      setLayoutConfig(nextConfig);

      if (siteBoundary.length >= 3) {
        const generated = generatePanelLayout(siteBoundary, restrictedZones, nextConfig);
        setPanelLayout(generated);
        handleModifyLayout();
        history.pushState({
          boundary: siteBoundary,
          restrictedZones,
          panelLayout: generated,
        });
        showToast(
          `Switched to ${spec.wattageW}W module (${generated.panels.length} panels placed, ${generated.summary.installedCapacityKw} kWp).`
        );
      }
    }
  };

  // Live auto-regeneration when layoutConfig changes (orientation, maxCapacityKw, rowSpacingM, colSpacingM, setbackM)
  useEffect(() => {
    if (!panelLayout || siteBoundary.length < 3) return;

    if (autoRegenTimerRef.current) {
      clearTimeout(autoRegenTimerRef.current);
    }

    autoRegenTimerRef.current = setTimeout(() => {
      const generated = generatePanelLayout(siteBoundary, restrictedZones, layoutConfig);
      setPanelLayout(generated);
      handleModifyLayout();
    }, 250);

    return () => {
      if (autoRegenTimerRef.current) {
        clearTimeout(autoRegenTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutConfig, siteBoundary, restrictedZones]);


  const handleGenerateLayout = () => {
    if (siteBoundary.length < 3) {
      showToast("A complete site boundary is required before generating panels.", "error");
      return;
    }

    const generated = generatePanelLayout(siteBoundary, restrictedZones, layoutConfig);
    setPanelLayout(generated);
    handleModifyLayout();

    history.pushState({
      boundary: siteBoundary,
      restrictedZones,
      panelLayout: generated,
    });

    showToast(
      `Array generated! Placed ${generated.panels.length} panels (${generated.summary.installedCapacityKw} kWp).`
    );
  };

  // Step 9: Manual Panel Placement & Rotation
  // Moves all currently selected panels (single selectedPanelId OR multi selectedPanelIds) by deltaX/deltaY meters
  const handleMovePanel = (deltaX: number, deltaY: number) => {
    if (!panelLayout) return;

    // Determine which panels to move
    const idsToMove = selectedPanelIds.length > 0
      ? selectedPanelIds
      : selectedPanelId
        ? [selectedPanelId]
        : [];

    if (idsToMove.length === 0) return;

    const updatedPanels = activePanels.map((p) => {
      if (!idsToMove.includes(p.id)) return p;
      const local = latLngToLocalMeters(p.center, p.center);
      const newLocal = { x: local.x + deltaX, y: local.y + deltaY };
      const newGeo = localMetersToLatLng(newLocal, p.center);
      return { ...p, center: newGeo };
    });

    const updatedValidation = validatePanels(updatedPanels, siteBoundary, restrictedZones);
    const updatedLayout: SolarPanelLayout = {
      ...panelLayout,
      panels: updatedValidation.validatedPanels,
      summary: updatedValidation.summary,
      updatedAt: new Date().toISOString(),
    };

    setPanelLayout(updatedLayout);
    handleModifyLayout();

    history.pushState({
      boundary: siteBoundary,
      restrictedZones,
      panelLayout: updatedLayout,
    });
  };

  // Keyboard arrow keys: move selected panel(s); Space/Enter = deselect
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      // Don't intercept if focus is on input/textarea/select
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;

      const hasSelection = selectedPanelId || selectedPanelIds.length > 0;
      if (!hasSelection) return;

      const step = panelNudgeStepM;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleMovePanel(-step, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          handleMovePanel(step, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleMovePanel(0, step);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleMovePanel(0, -step);
          break;
        case "Escape":
          e.preventDefault();
          setSelectedPanelId(null);
          setSelectedPanelIds([]);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPanelId, selectedPanelIds, panelNudgeStepM, activePanels, panelLayout, siteBoundary, restrictedZones]);

  const handleRotatePanel = (deltaDeg: number) => {
    if (!selectedPanel || !panelLayout) return;

    const newAngle = (selectedPanel.rotationDeg + deltaDeg + 360) % 360;

    const updatedPanels = activePanels.map((p) => {
      if (p.id !== selectedPanel.id) return p;
      return {
        ...p,
        rotationDeg: newAngle,
      };
    });

    const updatedValidation = validatePanels(updatedPanels, siteBoundary, restrictedZones);
    const updatedLayout: SolarPanelLayout = {
      ...panelLayout,
      panels: updatedValidation.validatedPanels,
      summary: updatedValidation.summary,
      updatedAt: new Date().toISOString(),
    };

    setPanelLayout(updatedLayout);
    handleModifyLayout();

    history.pushState({
      boundary: siteBoundary,
      restrictedZones,
      panelLayout: updatedLayout,
    });
  };

  const handleDeleteSelectedPanel = () => {
    if (!panelLayout) return;

    // Delete all selected panels (single or multi)
    const idsToRemove = selectedPanelIds.length > 0
      ? selectedPanelIds
      : selectedPanelId
        ? [selectedPanelId]
        : [];

    if (idsToRemove.length === 0) return;

    const updatedPanels = activePanels.filter((p) => !idsToRemove.includes(p.id));
    const updatedValidation = validatePanels(updatedPanels, siteBoundary, restrictedZones);
    const updatedLayout: SolarPanelLayout = {
      ...panelLayout,
      panels: updatedValidation.validatedPanels,
      summary: updatedValidation.summary,
      updatedAt: new Date().toISOString(),
    };

    setPanelLayout(updatedLayout);
    setSelectedPanelId(null);
    setSelectedPanelIds([]);
    handleModifyLayout();

    history.pushState({
      boundary: siteBoundary,
      restrictedZones,
      panelLayout: updatedLayout,
    });

    showToast(`${idsToRemove.length} panel${idsToRemove.length > 1 ? "s" : ""} removed.`);
  };

  // Step 11: Layout Undo, Redo, and Reset
  const handleUndo = () => {
    const restored = history.undo();
    if (restored) {
      setSiteBoundary(restored.boundary);
      setRestrictedZones(restored.restrictedZones);
      setPanelLayout(restored.panelLayout);
      handleModifyLayout();
      showToast("Undone last change.");
    }
  };

  const handleRedo = () => {
    const restored = history.redo();
    if (restored) {
      setSiteBoundary(restored.boundary);
      setRestrictedZones(restored.restrictedZones);
      setPanelLayout(restored.panelLayout);
      handleModifyLayout();
      showToast("Redone last change.");
    }
  };

  const handleResetLayout = () => {
    if (!project) return;
    const initialBoundary = project.boundary || [];
    const initialZones = project.restrictedZones || [];
    const initialLayout = project.panelLayout || null;

    setSiteBoundary(initialBoundary);
    setRestrictedZones(initialZones);
    setPanelLayout(initialLayout);
    setDraftBoundaryPoints([]);
    setDraftZonePoints([]);
    setSelectedPanelId(null);
    setSelectedPanelIds([]);
    setMapMode("VIEW");

    history.reset({
      boundary: initialBoundary,
      restrictedZones: initialZones,
      panelLayout: initialLayout,
    });

    setIsClearDialogOpen(false);
    showToast("Layout reset to last saved state.", "warning");
  };

  // Step 8: Save & Restore Layout
  const handleSaveLayout = () => {
    if (!project) return;

    const calculatedSiteArea = Math.round(calculatePolygonAreaM2(siteBoundary) * 10) / 10;
    const systemCapacity = layoutSummary.installedCapacityKw;

    const savedLayout: SolarPanelLayout | undefined = activePanels.length > 0
      ? {
        config: layoutConfig,
        panels: activePanels,
        summary: layoutSummary,
        generatedAt: panelLayout?.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      : panelLayout || undefined;

    // When user simulates and saves changes, automatically advance status to IN_PROGRESS
    const nextStatus = project.status === "ARCHIVED" ? "ARCHIVED" : "IN_PROGRESS";

    updateProject(project.id, {
      status: nextStatus,
      latitude: locationCoords ? locationCoords.lat : project.latitude,
      longitude: locationCoords ? locationCoords.lng : project.longitude,
      boundary: siteBoundary,
      boundaryAreaM2: calculatedSiteArea,
      restrictedZones,
      usableAreaM2: areaSummary.usableAreaM2,
      roofArea: calculatedSiteArea > 0 ? calculatedSiteArea : project.roofArea,
      systemCapacityKw: systemCapacity > 0 ? systemCapacity : project.systemCapacityKw,
      selectedBuildingId: selectedBuilding?.id,
      selectedBuildingFootprint: selectedBuilding?.points,
      panelLayout: savedLayout,
      batteryIncluded,
      batteryCapacityKwh,
      batteryModel,
      layoutFinalized,
      layoutFinalizedAt,
    });

    if (savedLayout) {
      setPanelLayout(savedLayout);
    }

    setWasFinalizedModifiedWarning(false);
    showToast("Layout and spatial engineering parameters saved successfully!");
  };

  // Step 12: Validation Summary & Finalization
  const canFinalize =
    siteBoundary.length >= 3 &&
    activePanels.length > 0 &&
    !validationResult.hasBlockingErrors &&
    areaSummary.warnings.length === 0;

  const handleFinalizeConfirm = () => {
    if (!canFinalize || !project) return;

    const now = new Date().toISOString();
    setLayoutFinalized(true);
    setLayoutFinalizedAt(now);
    setIsFinalizeDialogOpen(false);
    setWasFinalizedModifiedWarning(false);

    const calculatedSiteArea = Math.round(calculatePolygonAreaM2(siteBoundary) * 10) / 10;

    // Finalization marks project as COMPLETED (unless archived)
    const nextStatus = project.status === "ARCHIVED" ? "ARCHIVED" : "COMPLETED";

    updateProject(project.id, {
      status: nextStatus,
      latitude: locationCoords ? locationCoords.lat : project.latitude,
      longitude: locationCoords ? locationCoords.lng : project.longitude,
      boundary: siteBoundary,
      boundaryAreaM2: calculatedSiteArea,
      restrictedZones,
      usableAreaM2: areaSummary.usableAreaM2,
      roofArea: calculatedSiteArea > 0 ? calculatedSiteArea : project.roofArea,
      systemCapacityKw: layoutSummary.installedCapacityKw,
      selectedBuildingId: selectedBuilding?.id,
      selectedBuildingFootprint: selectedBuilding?.points,
      panelLayout: panelLayout
        ? {
          ...panelLayout,
          panels: activePanels,
          summary: layoutSummary,
          updatedAt: now,
        }
        : undefined,
      batteryIncluded,
      batteryCapacityKwh,
      batteryModel,
      layoutFinalized: true,
      layoutFinalizedAt: now,
    });

    showToast("🎉 Layout finalized! Project marked as Completed. You can now generate a report from the project overview.");
  };

  // 4-Step Customer Wizard Navigation Handlers
  const handlePrevStep = () => {
    if (wizardStep > 1) {
      const prev = (wizardStep - 1) as 1 | 2 | 3 | 4;
      setWizardStep(prev);
      setMapMode("VIEW");
    }
  };

  const handleNextStep = () => {
    if (wizardStep < 4) {
      const next = (wizardStep + 1) as 1 | 2 | 3 | 4;
      setWizardStep(next);
      setMapMode("VIEW");
    } else {
      router.push(`/projects/${project?.id}/report`);
    }
  };

  // Loading state
  if (isContextLoading) {
    return (
      <div className="site-layout-page">
        <div className="site-layout-loading-state" role="status">
          <Loader2 size={32} className="solarscope-spin" />
          <p>Loading project workspace...</p>
        </div>
      </div>
    );
  }

  // Not Found state
  if (!project) {
    return (
      <div className="site-layout-page">
        <nav className="site-layout-nav">
          <Link href="/projects" className="site-layout-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Projects</span>
          </Link>
        </nav>

        <div className="project-not-found-card" role="alert">
          <div className="project-not-found-icon">
            <AlertTriangle size={32} aria-hidden="true" />
          </div>
          <h1 className="project-not-found-title">Project Not Found</h1>
          <p className="project-not-found-desc">
            We couldn&apos;t find any project matching ID &ldquo;
            <strong>{projectId || "unknown"}</strong>&rdquo;.
          </p>
          <Link href="/projects">
            <Button variant="primary">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Standalone Isolated 3D Building Model Workspace (Separated from map)
  if (isIsolatedBuildingMode && project) {
    return (
      <IsolatedBuildingWorkspace
        projectId={project.id}
        projectName={project.name}
        locationCoords={locationCoords}
        buildingPoints={siteBoundary.length >= 3 ? siteBoundary : (selectedBuilding?.points || [])}
        buildingName={selectedBuilding?.name || `${project.name} Structure`}
        heightMeters={selectedBuilding?.heightMeters || (selectedBuilding?.levels ? selectedBuilding.levels * 3.2 : 6.5)}
        levels={selectedBuilding?.levels || 2}
        panels={activePanels}
        panelSpec={layoutConfig.panelSpec}
        setbackM={layoutConfig.setbackM}
        onBackToMap={() => setIsIsolatedBuildingMode(false)}
        onProceedToSolar={() => {
          setIsIsolatedBuildingMode(false);
          setWizardStep(2);
          setMapMode("VIEW");
        }}
      />
    );
  }

  return (
    <div className="site-layout-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`site-layout-toast site-layout-toast--${toastMessage.type}`} role="status">
          {toastMessage.type === "success" && <CheckCircle2 size={16} />}
          {toastMessage.type === "warning" && <AlertTriangle size={16} />}
          {toastMessage.type === "error" && <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className="site-layout-toast-close"
            onClick={() => setToastMessage(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Header Bar with Breadcrumb and Global Actions */}
      <header className="site-layout-header">
        <div className="site-layout-header-left">
          <Link
            href={`/projects/${project.id}`}
            className="site-layout-back-btn"
            aria-label="Back to project overview"
            title="Exit workspace and return to project overview"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Overview</span>
          </Link>

          <div className="site-layout-title-group">
            <div className="site-layout-breadcrumbs">
              <Link href="/projects">Projects</Link>
              <ChevronRight size={12} />
              <Link href={`/projects/${project.id}`}>{project.name}</Link>
              <ChevronRight size={12} />
              <span className="current">Module 4: Site Layout</span>
            </div>
            <h1 className="site-layout-title">Rooftop Engineering & Panel Layout</h1>
          </div>
        </div>

        <div className="site-layout-header-actions">
          {layoutFinalized ? (
            <div className="site-layout-finalized-badge" title={`Finalized on ${new Date(layoutFinalizedAt || "").toLocaleDateString()}`}>
              <FileCheck2 size={15} />
              <span>Layout Finalized</span>
            </div>
          ) : wasFinalizedModifiedWarning ? (
            <div className="site-layout-modified-badge">
              <AlertTriangle size={13} />
              <span>Needs Re-Finalization</span>
            </div>
          ) : null}

          {/* Undo / Redo controls */}
          <div className="site-layout-history-buttons">
            <button
              type="button"
              className="site-layout-tool-btn"
              onClick={handleUndo}
              disabled={!history.canUndo}
              title="Undo last change (Ctrl+Z)"
              aria-label="Undo last change"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="site-layout-tool-btn"
              onClick={handleRedo}
              disabled={!history.canRedo}
              title="Redo change"
              aria-label="Redo change"
            >
              <Redo2 size={15} />
            </button>
          </div>

          {/* Generate Standalone Building Model */}
          <button
            type="button"
            className="site-layout-btn site-layout-btn--model"
            onClick={() => setIsIsolatedBuildingMode(true)}
            title="Generate standalone 3D building model isolated from the surrounding map"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid #38BDF8",
              borderRadius: "var(--radius-md)",
              color: "#38BDF8",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Box size={13} />
            <span>3D Model</span>
          </button>

          <button
            type="button"
            className="site-layout-reset-btn"
            onClick={() => setIsClearDialogOpen(true)}
            title="Reset layout"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>

          <Button variant="primary" onClick={handleSaveLayout}>
            <Save size={15} style={{ marginRight: "6px" }} />
            <span>Save Layout</span>
          </Button>

          <Button
            variant={canFinalize ? "primary" : "outline"}
            onClick={() => setIsFinalizeDialogOpen(true)}
            disabled={!canFinalize || layoutFinalized}
            style={canFinalize ? { backgroundColor: "var(--color-success)", borderColor: "var(--color-success)" } : undefined}
          >
            <FileCheck2 size={15} style={{ marginRight: "6px", fill: "white" }} />
            <span style={{ color: "white" }}>Finalize Layout</span>
          </Button>
        </div>
      </header>

      {/* 2. Main Workspace Split View: Controls Left, Interactive Map Canvas Right */}
      <div className="site-layout-workspace-grid">
        {/* Left Workflow Controls Panel (Collapsible) */}
        <aside className={`site-layout-sidebar ${isSidebarCollapsed ? "is-collapsed" : ""}`}>
          <div className="sidebar-header-bar">
            {!isSidebarCollapsed && (
              <div className="sidebar-header-info">
                <span className="sidebar-header-tag">Step {wizardStep} of 4</span>
                <span className="sidebar-active-tab-title">
                  {wizardStep === 1 && "Roof Boundary"}
                  {wizardStep === 2 && `Solar Panels (${layoutSummary.validPanels})`}
                  {wizardStep === 3 && "Battery Storage"}
                  {wizardStep === 4 && "Finalize & Report"}
                </span>
              </div>
            )}
            <button
              type="button"
              className="sidebar-collapse-toggle-btn"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? "Expand Tool Panel" : "Collapse Tool Panel"}
              aria-label={isSidebarCollapsed ? "Expand Tool Panel" : "Collapse Tool Panel"}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* When Collapsed: Vertical Tool Rail */}
          {isSidebarCollapsed && (
            <div className="sidebar-collapsed-rail">
              <button
                type="button"
                className={`sidebar-rail-btn ${wizardStep === 1 ? "is-active" : ""}`}
                onClick={() => {
                  setWizardStep(1);
                  setMapMode("VIEW");
                  setIsSidebarCollapsed(false);
                }}
                title="1. Roof Boundary"
              >
                <Compass size={18} />
              </button>
              <button
                type="button"
                className={`sidebar-rail-btn ${wizardStep === 2 ? "is-active" : ""}`}
                onClick={() => {
                  setWizardStep(2);
                  setMapMode("VIEW");
                  setIsSidebarCollapsed(false);
                }}
                title="2. Solar Panels"
              >
                <Grid size={18} />
              </button>
              <button
                type="button"
                className={`sidebar-rail-btn ${wizardStep === 3 ? "is-active" : ""}`}
                onClick={() => {
                  setWizardStep(3);
                  setMapMode("VIEW");
                  setIsSidebarCollapsed(false);
                }}
                title="3. Battery Storage"
              >
                <Zap size={18} />
              </button>
              <button
                type="button"
                className={`sidebar-rail-btn ${wizardStep === 4 ? "is-active" : ""}`}
                onClick={() => {
                  setWizardStep(4);
                  setMapMode("VIEW");
                  setIsSidebarCollapsed(false);
                }}
                title="4. Finalize & Report"
              >
                <FileCheck2 size={18} />
              </button>
            </div>
          )}

          {!isSidebarCollapsed && (
            <div className="wizard-sidebar-container">
              <div className="wizard-sidebar-body">
                {/* ====================================================
                    MODULE 1: ROOF BOUNDARY
                    ==================================================== */}
                {wizardStep === 1 && (
                  <>
                    <div className="wizard-module-header">
                      <div className="wizard-module-step-tag">Step 1 of 4</div>
                      <h2 className="wizard-module-title">Roof Boundary</h2>
                      <p className="wizard-module-desc">
                        Trace your roof perimeter on the map to define the installation surface.
                      </p>
                    </div>

                    {/* Roof Installation Area Card */}
                    <div className="wizard-card">
                      <div className="wizard-card-title">
                        <span>Roof Installation Area</span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: siteBoundary.length >= 3 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: siteBoundary.length >= 3 ? "#34D399" : "#FBBF24",
                            border: siteBoundary.length >= 3 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          {siteBoundary.length >= 3 ? "Boundary Defined" : "Pending Boundary"}
                        </span>
                      </div>

                      <div className="wizard-stat-row">
                        <div className="wizard-stat-tile">
                          <span className="stat-val">
                            {siteBoundary.length >= 3 ? `${areaSummary.siteAreaM2.toLocaleString()} m²` : "0 m²"}
                          </span>
                          <span className="stat-lbl">Usable Roof Area</span>
                        </div>
                        <div className="wizard-stat-tile">
                          <span className="stat-val">{siteBoundary.length}</span>
                          <span className="stat-lbl">Boundary Corners</span>
                        </div>
                      </div>

                      {mapMode === "DRAW_BOUNDARY" ? (
                        <div className="boundary-drawing-in-progress" style={{ marginTop: "14px" }}>
                          <div className="drawing-status-badge">
                            <span className="pulse-indicator" />
                            <span>Tracing Corners ({draftBoundaryPoints.length} points)</span>
                          </div>
                          <div className="drawing-actions-row" style={{ marginTop: "10px" }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleUndoBoundaryPoint}
                              disabled={draftBoundaryPoints.length === 0}
                            >
                              <Undo2 size={13} style={{ fill: "white" }} />
                              <span style={{ color: "white" }} >Undo</span>
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleCompleteBoundary}
                              disabled={draftBoundaryPoints.length < 3}
                            >
                              <CheckCircle2 size={13} />
                              <span>Complete ({draftBoundaryPoints.length})</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCancelBoundary}>
                              <X size={13} style={{ fill: "white" }} />
                              <span style={{ color: "white" }}>Cancel</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="drawing-actions-row" style={{ marginTop: "14px" }}>
                          <Button variant="primary" size="sm" onClick={handleStartBoundaryDrawing}>
                            <Plus size={14} />
                            <span>{siteBoundary.length > 0 ? "Redraw Roof" : "Draw Roof Boundary"}</span>
                          </Button>

                          {siteBoundary.length > 0 && (
                            <Button
                              variant={isEditBoundaryMode ? "primary" : "outline"}
                              size="sm"
                              onClick={() => setIsEditBoundaryMode((prev) => !prev)}
                              style={
                                isEditBoundaryMode
                                  ? { backgroundColor: "#2563EB", borderColor: "#1D4ED8", color: "#fff" }
                                  : { borderColor: "rgba(59, 130, 246, 0.5)", color: "#60A5FA" }
                              }
                              title="Drag corners directly on the map to adjust boundary"
                            >
                              <Sliders size={14} />
                              <span>{isEditBoundaryMode ? "Finish Editing" : "Edit Corners"}</span>
                            </Button>
                          )}

                          {siteBoundary.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearBoundary}
                              style={{
                                backgroundColor: "rgba(239, 68, 68, 0.12)",
                                borderColor: "#EF4444",
                                color: "#FFFFFF",
                                fontWeight: 600,
                              }}
                              title="Clear current roof boundary"
                            >
                              <Trash2 size={14} style={{ color: "#EF4444" }} />
                              <span>Clear</span>
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Standalone 3D Building Studio Button */}
                      <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #334155" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsIsolatedBuildingMode(true)}
                          style={{
                            width: "100%",
                            borderColor: "#38BDF8",
                            color: "#38BDF8",
                            backgroundColor: "rgba(56, 189, 248, 0.06)",
                            fontWeight: 700,
                          }}
                          title="Isolate selected house into a 3D model studio separated from the surrounding map"
                        >
                          <Box size={14} style={{ marginRight: "6px" }} />
                          <span>Generate 3D Building Model</span>
                        </Button>
                      </div>
                    </div>

                    {/* Friendly Helpful Tip */}
                    <div
                      style={{
                        padding: "12px 14px",
                        background: "rgba(56, 189, 248, 0.08)",
                        border: "1px solid rgba(56, 189, 248, 0.25)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#BAE6FD",
                        lineHeight: 1.5,
                      }}
                    >
                      💡 <strong>Quick Tip:</strong> Click <strong>&ldquo;Draw Roof Boundary&rdquo;</strong>, then click corners on the satellite map to outline your roof. Place 3 or more points and click <strong>&ldquo;Complete&rdquo;</strong> to calculate your installation area.
                    </div>
                  </>
                )}

                {/* ====================================================
                    MODULE 2: SOLAR PANELS
                    ==================================================== */}
                {wizardStep === 2 && (
                  <>
                    <div className="wizard-module-header">
                      <div className="wizard-module-step-tag">Step 2 of 4</div>
                      <h2 className="wizard-module-title">Solar Panels</h2>
                      <p className="wizard-module-desc">
                        Select solar panel specifications and automatically place the layout on your roof.
                      </p>
                    </div>

                    {/* Panel Specification Preset & Orientation */}
                    <div className="wizard-card">
                      <div className="wizard-card-title">1. Panel Model Specification</div>

                      {/* Visual Panel Cards (3 top models) */}
                      <div className="panel-model-cards">
                        {["standard", "highEfficiency", "commercial"].map((key) => {
                          const spec = PRESET_PANEL_SPECS[key];
                          if (!spec) return null;
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`panel-model-card ${selectedPreset === key ? "is-selected" : ""}`}
                              onClick={() => handlePresetSelect(key)}
                            >
                              <div className="panel-model-img-wrap">
                                <img src="/images/product-panel.jpg" alt={spec.modelName} className="panel-model-img" />
                                {selectedPreset === key && (
                                  <div className="panel-model-selected-badge">
                                    <Check size={12} />
                                  </div>
                                )}
                              </div>
                              <div className="panel-model-info">
                                <span className="panel-model-watt">{spec.wattageW}W</span>
                                <span className="panel-model-dim">{spec.widthM}m × {spec.heightM}m</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* If a custom catalogue model is selected that isn't in top 3 */}
                      {!["standard", "highEfficiency", "commercial"].includes(selectedPreset) && PRESET_PANEL_SPECS[selectedPreset] && (
                        <div style={{
                          marginTop: "8px",
                          padding: "6px 10px",
                          background: "rgba(255, 184, 0, 0.12)",
                          border: "1px solid #FFB800",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#FFB800"
                        }}>
                          <span>Selected: <strong>{PRESET_PANEL_SPECS[selectedPreset].modelName}</strong> ({PRESET_PANEL_SPECS[selectedPreset].wattageW}W)</span>
                          <Check size={12} />
                        </div>
                      )}

                      {/* View All button */}
                      <button
                        type="button"
                        className="panel-view-all-btn"
                        onClick={() => setIsPanelModalOpen(true)}
                      >
                        View All Panel Models
                      </button>

                      {/* Orientation toggle */}
                      <div style={{ marginTop: "12px" }}>
                        <label className="sidebar-field-label">Orientation</label>
                        <div className="orientation-toggle-row">
                          <button
                            type="button"
                            className={`toggle-option ${layoutConfig.orientation === "PORTRAIT" ? "is-selected" : ""}`}
                            onClick={() => setLayoutConfig((prev) => ({ ...prev, orientation: "PORTRAIT" }))}
                          >
                            Portrait (Vertical)
                          </button>
                          <button
                            type="button"
                            className={`toggle-option ${layoutConfig.orientation === "LANDSCAPE" ? "is-selected" : ""}`}
                            onClick={() => setLayoutConfig((prev) => ({ ...prev, orientation: "LANDSCAPE" }))}
                          >
                            Landscape (Horizontal)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Target System Capacity Cap (Max kWp) */}
                    <div className="wizard-card">
                      <div className="wizard-card-title">2. Target System Size (Max kWp)</div>
                      <p style={{ fontSize: "11px", color: "#94A3B8", margin: "2px 0 6px 0" }}>
                        Define maximum desired capacity. If your roof has room for 25 panels but you only want 5 kWp or 10 kWp, set your target here:
                      </p>
                      <div className="kw-cap-input-row">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="e.g. 5 or 10 (Leave blank for max available)"
                          className="kw-cap-input"
                          value={layoutConfig.maxCapacityKw ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            setLayoutConfig((prev) => ({ ...prev, maxCapacityKw: val }));
                          }}
                        />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFB800" }}>kWp</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                        {[
                          { label: "Max (All Roof)", val: undefined },
                          { label: "3 kWp", val: 3 },
                          { label: "5 kWp", val: 5 },
                          { label: "7 kWp", val: 7 },
                          { label: "10 kWp", val: 10 },
                          { label: "15 kWp", val: 15 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            className={`kw-pill ${layoutConfig.maxCapacityKw === chip.val ? "is-active" : ""}`}
                            onClick={() => setLayoutConfig((prev) => ({ ...prev, maxCapacityKw: chip.val }))}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row Spacing, Module Spacing & Setbacks */}
                    <div className="wizard-card">
                      <div className="wizard-card-title">3. Array Spacing & Roof Setback</div>
                      
                      <div className="spacing-slider-group">
                        {/* Row Spacing */}
                        <div className="spacing-slider-item">
                          <div className="spacing-slider-header">
                            <span className="label">Row Spacing (Pitch / Tilt Clearance)</span>
                            <span className="value-badge">{layoutConfig.rowSpacingM.toFixed(2)} m</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="3.0"
                            step="0.05"
                            className="sidebar-range"
                            value={layoutConfig.rowSpacingM}
                            onChange={(e) =>
                              setLayoutConfig((prev) => ({ ...prev, rowSpacingM: parseFloat(e.target.value) }))
                            }
                          />
                        </div>

                        {/* Module Spacing */}
                        <div className="spacing-slider-item">
                          <div className="spacing-slider-header">
                            <span className="label">Module Gap (Column Spacing)</span>
                            <span className="value-badge">{layoutConfig.colSpacingM.toFixed(2)} m</span>
                          </div>
                          <input
                            type="range"
                            min="0.02"
                            max="1.5"
                            step="0.02"
                            className="sidebar-range"
                            value={layoutConfig.colSpacingM}
                            onChange={(e) =>
                              setLayoutConfig((prev) => ({ ...prev, colSpacingM: parseFloat(e.target.value) }))
                            }
                          />
                        </div>

                        {/* Perimeter Setback */}
                        <div className="spacing-slider-item">
                          <div className="spacing-slider-header">
                            <span className="label">Perimeter Roof Setback (Walkway Buffer)</span>
                            <span className="value-badge">{layoutConfig.setbackM.toFixed(2)} m</span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="2.5"
                            step="0.05"
                            className="sidebar-range"
                            value={layoutConfig.setbackM}
                            onChange={(e) =>
                              setLayoutConfig((prev) => ({ ...prev, setbackM: parseFloat(e.target.value) }))
                            }
                          />
                        </div>

                        {/* Array Azimuth Angle */}
                        <div className="spacing-slider-item">
                          <div className="spacing-slider-header">
                            <span className="label">Panel Azimuth Facing Angle</span>
                            <span className="value-badge">
                              {layoutConfig.azimuthDeg}° {layoutConfig.azimuthDeg === 180 ? "(True South)" : ""}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            className="sidebar-range"
                            value={layoutConfig.azimuthDeg}
                            onChange={(e) =>
                              setLayoutConfig((prev) => ({ ...prev, azimuthDeg: parseInt(e.target.value, 10) }))
                            }
                          />
                        </div>

                        {/* Setback Buffer Visual Toggle */}
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#94A3B8", cursor: "pointer", marginTop: "4px" }}>
                          <input
                            type="checkbox"
                            checked={showSetbackZone}
                            onChange={(e) => setShowSetbackZone(e.target.checked)}
                            style={{ accentColor: "#38BDF8", cursor: "pointer" }}
                          />
                          <span>Show Walkway Setback Buffer on Map</span>
                        </label>
                      </div>

                      {/* Auto-regen status pill */}
                      {siteBoundary.length >= 3 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", padding: "7px 10px", background: "rgba(16,185,129,0.1)", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.3)" }}>
                          <Zap size={12} style={{ color: "#34D399", flexShrink: 0 }} />
                          <span style={{ fontSize: "11px", color: "#34D399", fontWeight: 600 }}>Live — layout updates automatically as you adjust settings</span>
                        </div>
                      )}
                    </div>

                    {/* Live Generated Array Statistics */}
                    <div className="wizard-card">
                      <div className="wizard-card-title">Generated Array Statistics</div>
                      <div className="wizard-stat-row">
                        <div className="wizard-stat-tile">
                          <span className="stat-val" style={{ color: "#FFB800" }}>
                            {layoutSummary.installedCapacityKw} kWp
                          </span>
                          <span className="stat-lbl">System Size</span>
                        </div>
                        <div className="wizard-stat-tile">
                          <span className="stat-val" style={{ color: "#38BDF8" }}>
                            {layoutSummary.validPanels}
                          </span>
                          <span className="stat-lbl">Active Panels</span>
                        </div>
                        <div className="wizard-stat-tile">
                          <span className="stat-val">
                            {Math.round(layoutSummary.installedCapacityKw * 1450).toLocaleString()}
                          </span>
                          <span className="stat-lbl">Est. kWh / Year</span>
                        </div>
                        <div className="wizard-stat-tile">
                          <span className="stat-val">
                            {areaSummary.usableAreaM2 > 0 && layoutSummary.panelCoverageM2
                              ? ((layoutSummary.panelCoverageM2 / areaSummary.usableAreaM2) * 100).toFixed(1)
                              : "0.0"}%
                          </span>
                          <span className="stat-lbl">Roof Coverage</span>
                        </div>
                      </div>
                    </div>

                    {/* Individual Panel Fine-Tuning & Movement (Left/Right/Up/Down) */}
                    {activePanels.length > 0 && (
                      <div className="wizard-card" style={{ border: (selectedPanel || selectedPanelIds.length > 0) ? "1px solid #FFB800" : "1px solid #334155" }}>
                        <div className="wizard-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>
                            {selectedPanelIds.length > 1
                              ? `Multi-Select: ${selectedPanelIds.length} Panels`
                              : "Panel Adjustment"}
                          </span>
                          {(selectedPanel || selectedPanelIds.length > 0) && (
                            <button
                              type="button"
                              onClick={() => { setSelectedPanelId(null); setSelectedPanelIds([]); }}
                              style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "11px" }}
                            >
                              Deselect All
                            </button>
                          )}
                        </div>
                        {/* Multi-selection badge strip */}
                        {selectedPanelIds.length > 1 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                            {selectedPanelIds.map((pid) => (
                              <span
                                key={pid}
                                style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "rgba(255,184,0,0.2)", color: "#FFB800", border: "1px solid rgba(255,184,0,0.4)", cursor: "pointer" }}
                                onClick={() => setSelectedPanelIds((prev) => prev.filter((x) => x !== pid))}
                                title={`Click to deselect ${pid.toUpperCase()}`}
                              >
                                {pid.toUpperCase()} ×
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Panel Dropdown Selector */}
                        <div style={{ marginTop: "4px" }}>
                          <label className="sidebar-field-label" style={{ marginBottom: "4px" }}>Select Panel to Adjust</label>
                          <select
                            className="panel-select-dropdown"
                            value={selectedPanelId || ""}
                            onChange={(e) => setSelectedPanelId(e.target.value || null)}
                          >
                            <option value="">-- Click panel on map or pick here --</option>
                            {activePanels.map((p, idx) => (
                              <option key={p.id} value={p.id}>
                                Panel {idx + 1} ({p.id.toUpperCase()}) - {p.wattageW}W [{p.status}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedPanel ? (
                          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {/* Panel Info Banner */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 184, 0, 0.1)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255, 184, 0, 0.3)" }}>
                              <div>
                                <span style={{ fontWeight: 700, color: "#FFB800", fontSize: "12px" }}>
                                  {selectedPanel.id.toUpperCase()}
                                </span>
                                <span style={{ marginLeft: "8px", fontSize: "11px", color: "#E2E8F0" }}>
                                  {selectedPanel.wattageW}W | {selectedPanel.rotationDeg}°
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: selectedPanel.status === "VALID" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                  color: selectedPanel.status === "VALID" ? "#34D399" : "#F87171",
                                }}
                              >
                                {selectedPanel.status}
                              </span>
                            </div>

                            {/* Move Distance Step Selector */}
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ fontSize: "11px", color: "#94A3B8" }}>Nudge Step Distance:</span>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#38BDF8" }}>{panelNudgeStepM} meters</span>
                              </div>
                              <div className="step-size-selector">
                                {[0.1, 0.3, 0.5, 1.0].map((step) => (
                                  <button
                                    key={step}
                                    type="button"
                                    className={`step-size-btn ${panelNudgeStepM === step ? "is-active" : ""}`}
                                    onClick={() => setPanelNudgeStepM(step)}
                                  >
                                    {step}m
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Directional Nudge Pad (Up, Down, Left, Right) */}
                            <div>
                              <span style={{ fontSize: "11px", color: "#CBD5E1", fontWeight: 600, display: "block", textAlign: "center", marginBottom: "4px" }}>
                                Move Panel Position (Left / Right / Up / Down)
                              </span>
                              <div className="nudge-dpad">
                                {/* UP */}
                                <button
                                  type="button"
                                  className="nudge-dpad-btn"
                                  onClick={() => handleMovePanel(0, panelNudgeStepM)}
                                  title={`Move Up ${panelNudgeStepM}m`}
                                >
                                  <ArrowUp size={14} />
                                  <span>Up (+{panelNudgeStepM}m)</span>
                                </button>

                                {/* LEFT, CENTER, RIGHT */}
                                <div className="nudge-dpad-row">
                                  <button
                                    type="button"
                                    className="nudge-dpad-btn"
                                    onClick={() => handleMovePanel(-panelNudgeStepM, 0)}
                                    title={`Move Left ${panelNudgeStepM}m`}
                                  >
                                    <ArrowLeft size={14} />
                                    <span>Left (-{panelNudgeStepM}m)</span>
                                  </button>

                                  <div className="nudge-center-indicator" title="Panel Center">
                                    <Move size={16} />
                                  </div>

                                  <button
                                    type="button"
                                    className="nudge-dpad-btn"
                                    onClick={() => handleMovePanel(panelNudgeStepM, 0)}
                                    title={`Move Right ${panelNudgeStepM}m`}
                                  >
                                    <span>Right (+{panelNudgeStepM}m)</span>
                                    <ArrowRight size={14} />
                                  </button>
                                </div>

                                {/* DOWN */}
                                <button
                                  type="button"
                                  className="nudge-dpad-btn"
                                  onClick={() => handleMovePanel(0, -panelNudgeStepM)}
                                  title={`Move Down ${panelNudgeStepM}m`}
                                >
                                  <ArrowDown size={14} />
                                  <span>Down (-{panelNudgeStepM}m)</span>
                                </button>
                              </div>
                            </div>

                            {/* Rotation & Deletion Actions */}
                            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRotatePanel(15)}
                                style={{ flex: 1, color: "white", "--solarscope-btn-hover-bg": "#000" } as React.CSSProperties}
                              >
                                <RotateCw size={13} style={{ marginRight: "4px" }} /> Rotate +15°
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRotatePanel(90)}
                                style={{ flex: 1, color: "white", "--solarscope-btn-hover-bg": "#000" } as React.CSSProperties}
                              >
                                Flip 90°
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDeleteSelectedPanel}
                                style={{ color: "#EF4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
                                title="Remove this panel"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", color: "#94A3B8", fontSize: "12px", marginTop: "8px", lineHeight: 1.5 }}>
                            💡 <strong>Tip:</strong> Click a panel on the map to select it. Use <strong>Shift+Click</strong> to add more panels to selection (they all turn yellow). Then use:<br />
                            • The <strong>D-pad buttons</strong> below to nudge them<br />
                            • <strong>Arrow Keys ← → ↑ ↓</strong> on keyboard to move them<br />
                            • <strong>Esc</strong> to deselect all
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ====================================================
                    MODULE 3: BATTERY STORAGE
                    ==================================================== */}
                {wizardStep === 3 && (
                  <>
                    <div className="wizard-module-header">
                      <div className="wizard-module-step-tag">Step 3 of 4</div>
                      <h2 className="wizard-module-title">Battery Storage</h2>
                      <p className="wizard-module-desc">
                        Select energy storage capacity for night self-consumption and uninterrupted load-shedding backup.
                      </p>
                    </div>

                    {/* Master Battery Toggle Card */}
                    <div className={`wizard-battery-toggle-card ${batteryIncluded ? "is-active" : ""}`}>
                      <div className="battery-toggle-left">
                        <div className={`battery-toggle-icon-wrap ${batteryIncluded ? "is-active" : ""}`}>
                          <BatteryCharging size={24} />
                        </div>
                        <div>
                          <div className="battery-toggle-title">Include Battery Storage System?</div>
                          <p className="battery-toggle-desc">
                            {batteryIncluded
                              ? "Battery backup is enabled. Choose your storage capacity below."
                              : "Default is OFF (Grid-Tied only). Switch ON if you want battery backup during outages."}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Switch */}
                      <label className="battery-toggle-switch" aria-label="Toggle Battery Storage">
                        <input
                          type="checkbox"
                          checked={batteryIncluded}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setBatteryIncluded(next);
                            if (next && !batteryCapacityKwh) {
                              setBatteryCapacityKwh(5.12);
                              setBatteryModel("LiFePO4 Home Storage 5.12 kWh");
                            }
                            handleModifyLayout();
                          }}
                        />
                        <span className="battery-toggle-slider" />
                      </label>
                    </div>

                    {/* Notice when battery is OFF */}
                    {!batteryIncluded && (
                      <div className="battery-disabled-banner">
                        <Info size={16} style={{ flexShrink: 0, color: "#94A3B8" }} />
                        <span>
                          Battery storage is currently <strong>disabled</strong>. The system will operate as a standard Grid-Tied solar installation without backup. Turn the toggle above <strong>ON</strong> to enable battery sizing.
                        </span>
                      </div>
                    )}

                    {/* Battery Selection Options (Disabled when toggle is OFF) */}
                    <div className={`wizard-battery-section ${!batteryIncluded ? "is-disabled" : ""}`}>
                      <div className="wizard-battery-grid">
                        {[
                          {
                            kwh: 3.5,
                            title: "3.5 kWh Compact Backup",
                            badge: "~4–6 Hrs Backup",
                            model: "LiFePO4 Compact 3.5 kWh",
                            desc: "Powers essential daytime and evening loads: LED lights, ceiling fans, Wi-Fi router, and laptop.",
                            specs: ["LiFePO4 Chemistry", "95% DoD", "6,000+ Cycles"],
                          },
                          {
                            kwh: 5.12,
                            title: "5.12 kWh Standard Home (Recommended)",
                            badge: "~8–10 Hrs Backup",
                            model: "LiFePO4 Home Storage 5.12 kWh",
                            desc: "Standard residential backup: Full household lights, fans, refrigerator, LED TV, and home office.",
                            specs: ["LiFePO4 Chemistry", "95% DoD", "6,000+ Cycles"],
                          },
                          {
                            kwh: 10.24,
                            title: "10.24 kWh Extended PowerWall",
                            badge: "~14–18 Hrs Backup",
                            model: "LiFePO4 PowerWall 10.24 kWh",
                            desc: "Heavy residential freedom: Full home backup plus 1× Inverter AC or water pump during grid outage.",
                            specs: ["LiFePO4 Chemistry", "95% DoD", "6,000+ Cycles"],
                          },
                          {
                            kwh: 15.36,
                            title: "15.36 kWh Commercial / Heavy Duty",
                            badge: "~24+ Hrs Backup",
                            model: "LiFePO4 Heavy Duty 15.36 kWh",
                            desc: "Maximum energy independence: Multiple high-draw appliances and full commercial outage immunity.",
                            specs: ["LiFePO4 Chemistry", "95% DoD", "6,000+ Cycles"],
                          },
                        ].map((b) => (
                          <div
                            key={b.kwh}
                            className={`wizard-battery-card ${batteryIncluded && batteryCapacityKwh === b.kwh ? "is-selected" : ""}`}
                            onClick={() => {
                              if (!batteryIncluded) return;
                              setBatteryCapacityKwh(b.kwh);
                              setBatteryModel(b.model);
                              handleModifyLayout();
                            }}
                          >
                            <div className="wizard-battery-card-main">
                              <div className="wizard-battery-thumb-wrap">
                                <img
                                  src="/images/product-battery.jpg"
                                  alt={b.title}
                                  className="wizard-battery-thumb"
                                />
                                {batteryIncluded && batteryCapacityKwh === b.kwh && (
                                  <div className="wizard-battery-check-badge">
                                    <Check size={12} />
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="wizard-battery-card-top">
                                  <span className="wizard-battery-title">{b.title}</span>
                                  <span className="wizard-battery-badge">{b.badge}</span>
                                </div>
                                <p className="wizard-battery-desc">{b.desc}</p>
                                <div className="wizard-battery-specs">
                                  {b.specs.map((sp, idx) => (
                                    <span key={idx}>
                                      {idx > 0 && <span style={{ marginRight: "6px" }}>•</span>}
                                      {sp}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ====================================================
                    MODULE 4: FINALIZE & REPORTS
                    ==================================================== */}
                {wizardStep === 4 && (
                  <>
                    <div className="wizard-module-header">
                      <div className="wizard-module-step-tag">Step 4 of 4</div>
                      <h2 className="wizard-module-title">Finalize & Reports</h2>
                      <p className="wizard-module-desc">
                        Review your complete solar + battery engineering design, finalize layout, and download official report.
                      </p>
                    </div>

                    {/* Proposal Summary Card */}
                    <div className="wizard-proposal-card">
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Project</span>
                        <span className="prop-val">{project.name}</span>
                      </div>
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Roof Surface</span>
                        <span className="prop-val">{areaSummary.usableAreaM2 || areaSummary.siteAreaM2 || project.roofArea} m²</span>
                      </div>
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Solar PV Array</span>
                        <span className="prop-val is-gold">
                          {layoutSummary.installedCapacityKw} kWp ({activePanels.length} Panels)
                        </span>
                      </div>
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Battery Storage Bank</span>
                        <span className="prop-val">
                          {batteryIncluded ? `${batteryCapacityKwh} kWh (${batteryModel})` : "Grid-Tied (No Battery)"}
                        </span>
                      </div>
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Est. Annual Generation</span>
                        <span className="prop-val is-green">
                          {Math.round((layoutSummary.installedCapacityKw || project.systemCapacityKw || 0) * 1450).toLocaleString()} kWh / yr
                        </span>
                      </div>
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Est. Annual Savings</span>
                        <span className="prop-val is-green">
                          PKR {Math.round((layoutSummary.installedCapacityKw || project.systemCapacityKw || 0) * 1450 * 50).toLocaleString()} / yr
                        </span>
                      </div>
                      <div className="wizard-proposal-row">
                        <span className="prop-label">Engineering Status</span>
                        <span className="prop-val">
                          {layoutFinalized ? (
                            <span style={{ color: "#10B981", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle2 size={14} /> Finalized
                            </span>
                          ) : (
                            <span style={{ color: "#F59E0B" }}>Draft Design</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Finalize Button */}
                    <Button
                      variant="primary"
                      disabled={!canFinalize || layoutFinalized}
                      onClick={() => setIsFinalizeDialogOpen(true)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: canFinalize ? "var(--color-success)" : undefined,
                        borderColor: canFinalize ? "var(--color-success)" : undefined,
                      }}
                    >
                      <FileCheck2 size={16} style={{ marginRight: "6px" }} />
                      <span>{layoutFinalized ? "Layout Already Finalized" : "Finalize & Lock Design"}</span>
                    </Button>

                    {/* Direct Link to Report */}
                    <Link href={`/projects/${project.id}/report`} style={{ width: "100%", textDecoration: "none" }}>
                      <Button
                        variant="outline"
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderColor: "#FFB800",
                          color: "#FFB800",
                          backgroundColor: "rgba(255, 184, 0, 0.08)",
                          fontWeight: 700,
                        }}
                      >
                        <FileCheck2 size={16} style={{ marginRight: "6px" }} />
                        <span>View & Download Engineering Report ➔</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Persistent Wizard Bottom Navigation Bar */}
              <div className="wizard-footer-nav">
                <button
                  type="button"
                  className="wizard-footer-prev-btn"
                  disabled={wizardStep === 1}
                  onClick={handlePrevStep}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <span className="wizard-footer-step-counter">
                  Step {wizardStep} of 4
                </span>

                <button
                  type="button"
                  className="wizard-footer-next-btn"
                  onClick={handleNextStep}
                >
                  <span>{wizardStep === 4 ? "View Report" : "Next Step"}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Right Interactive Map Canvas */}
        <main className="site-layout-map-canvas" aria-label="Interactive layout map canvas">
          {/* PiP Floating In-Canvas Drawing Action Banner */}
          {mapMode === "DRAW_BOUNDARY" && (
            <div className="canvas-floating-action-banner" role="status">
              <div className="canvas-banner-pulse" />
              <div className="canvas-banner-text">
                <strong>Tracing Roof Perimeter</strong>
                <span>{draftBoundaryPoints.length} points placed</span>
              </div>
              <div className="canvas-banner-actions">
                <button
                  type="button"
                  onClick={handleUndoBoundaryPoint}
                  disabled={draftBoundaryPoints.length === 0}
                  className="canvas-banner-btn"
                  title="Undo last point"
                >
                  <Undo2 size={13} />
                  <span>Undo Point</span>
                </button>
                <button
                  type="button"
                  onClick={handleCompleteBoundary}
                  disabled={draftBoundaryPoints.length < 3}
                  className="canvas-banner-btn is-primary"
                  title="Finish closing boundary polygon"
                >
                  <CheckCircle2 size={13} />
                  <span>Complete ({draftBoundaryPoints.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelBoundary}
                  className="canvas-banner-btn is-cancel"
                  title="Discard current drawing"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {mapMode === "DRAW_ZONE" && (
            <div className="canvas-floating-action-banner" role="status">
              <div className="canvas-banner-pulse is-warning" />
              <div className="canvas-banner-text">
                <strong>Tracing {RESTRICTED_ZONE_LABELS[selectedZoneCategory]}</strong>
                <span>{draftZonePoints.length} points placed</span>
              </div>
              <div className="canvas-banner-actions">
                <button
                  type="button"
                  onClick={handleUndoZonePoint}
                  disabled={draftZonePoints.length === 0}
                  className="canvas-banner-btn"
                >
                  <Undo2 size={13} />
                  <span>Undo Point</span>
                </button>
                <button
                  type="button"
                  onClick={handleCompleteZone}
                  disabled={draftZonePoints.length < 3}
                  className="canvas-banner-btn is-primary"
                >
                  <CheckCircle2 size={13} />
                  <span>Save Zone</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelZone}
                  className="canvas-banner-btn is-cancel"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}


          {/* PiP Floating Metrics HUD (Picture-in-Picture) */}
          <div className={`pip-metrics-hud ${isHudMinimized ? "is-minimized" : ""}`} aria-label="System Metrics Telemetry">
            {isHudMinimized ? (
              <button
                type="button"
                className="pip-hud-minimized-chip"
                onClick={() => setIsHudMinimized(false)}
                title="Expand solar metrics HUD"
              >
                <Zap size={15} className="pip-hud-zap-icon" />
                <span className="pip-hud-summary">
                  {layoutSummary.installedCapacityKw} kWp • {layoutSummary.validPanels} Modules • {areaSummary.usableAreaM2} m²
                </span>
                <Maximize2 size={13} className="pip-hud-toggle-icon" />
              </button>
            ) : (
              <div className="pip-hud-expanded-card">
                <div className="pip-hud-header">
                  <div className="pip-hud-title-wrap">
                    <Zap size={14} className="pip-hud-zap-icon" />
                    <span className="pip-hud-title">Solar Telemetry HUD</span>
                  </div>
                  <button
                    type="button"
                    className="pip-hud-minimize-btn"
                    onClick={() => setIsHudMinimized(true)}
                    title="Minimize metrics HUD"
                    aria-label="Minimize metrics HUD"
                  >
                    <Minimize2 size={13} />
                  </button>
                </div>

                <section className="site-layout-metrics-bar" aria-label="Layout summary metrics">
                  <div className="metric-tile">
                    <span className="metric-label">Site Perimeter</span>
                    <span className="metric-value">
                      <Maximize2 size={14} style={{ color: "var(--color-primary, #38BDF8)" }} />
                      {areaSummary.siteAreaM2 > 0 ? `${areaSummary.siteAreaM2.toLocaleString()} m²` : "Not defined"}
                    </span>
                    <span className="metric-sub">{siteBoundary.length} boundary points</span>
                  </div>

                  <div className="metric-tile">
                    <span className="metric-label">Restricted Space</span>
                    <span className="metric-value">
                      <ShieldAlert size={14} style={{ color: "var(--color-warning, #FBBF24)" }} />
                      {areaSummary.restrictedAreaM2 > 0 ? `${areaSummary.restrictedAreaM2.toLocaleString()} m²` : "0 m²"}
                    </span>
                    <span className="metric-sub">{restrictedZones.length} restricted zones</span>
                  </div>

                  <div className="metric-tile">
                    <span className="metric-label">Usable Roof Area</span>
                    <span className="metric-value">
                      <Layers size={14} style={{ color: "var(--color-success, #34D399)" }} />
                      {areaSummary.usableAreaM2 > 0 ? `${areaSummary.usableAreaM2.toLocaleString()} m²` : "0 m²"}
                    </span>
                    <span className="metric-sub">Permitted solar surface</span>
                  </div>

                  <div className="metric-tile">
                    <span className="metric-label">Active Modules</span>
                    <span className="metric-value">
                      <Grid size={14} style={{ color: "var(--color-info, #60A5FA)" }} />
                      {layoutSummary.validPanels} / {layoutSummary.totalPanels}
                    </span>
                    <span className="metric-sub">
                      {layoutSummary.invalidPanels > 0 ? `${layoutSummary.invalidPanels} invalid panels` : "100% compliant"}
                    </span>
                  </div>

                  <div className="metric-tile metric-tile--highlight">
                    <span className="metric-label">Estimated DC Capacity</span>
                    <span className="metric-value" style={{ color: "var(--color-accent, #F59E0B)" }}>
                      <Zap size={16} style={{ color: "var(--color-accent, #F59E0B)" }} />
                      {layoutSummary.installedCapacityKw} kWp
                    </span>
                    <span className="metric-sub">{layoutConfig.panelSpec.wattageW}W module rating</span>
                  </div>
                </section>
              </div>
            )}
          </div>

          <SiteLayoutMap
            locationCoords={locationCoords}
            siteBoundary={siteBoundary}
            restrictedZones={restrictedZones}
            panels={activePanels}
            selectedPanelId={selectedPanelId}
            selectedPanelIds={selectedPanelIds}
            mode={mapMode}
            activeZoneCategory={selectedZoneCategory}
            onMapClick={handleMapPin}
            onBoundaryPointAdd={handleAddBoundaryPoint}
            onZonePointAdd={handleAddZonePoint}
            onPanelSelect={(id, isShift) => {
              if (!id) {
                // Clicked map empty area
                setSelectedPanelId(null);
                setSelectedPanelIds([]);
                return;
              }
              if (isShift) {
                // Shift+Click: toggle this panel in/out of multi-selection
                setSelectedPanelIds((prev) => {
                  const exists = prev.includes(id);
                  const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
                  // Primary selectedPanelId always = last added
                  if (!exists) setSelectedPanelId(id);
                  return next;
                });
              } else {
                // Normal click: single select, clear multi
                setSelectedPanelId(id);
                setSelectedPanelIds([]);
                setWizardStep(2);
                setIsSidebarCollapsed(false);
              }
            }}
            draftBoundaryPoints={draftBoundaryPoints}
            draftZonePoints={draftZonePoints}
            height="100%"
            buildings={buildings}
            selectedBuildingId={selectedBuilding?.id}
            onBuildingSelect={(b) => {
              setSelectedBuilding(b);
              setIsBuildingConfirmed(false);
            }}
            is3DView={is3DView}
            tiltAngle={tiltAngle}
            rotationAngle={rotationAngle}
            onToggle3D={() => setIs3DView((prev) => !prev)}
            onTiltChange={(t) => setTiltAngle(t)}
            onRotationChange={(r) => setRotationAngle(r)}
            onOpenBuildingStudio={() => setIsIsolatedBuildingMode(true)}
            setbackM={layoutConfig.setbackM}
            showSetbackZone={showSetbackZone}
            showRowSpacing={showRowSpacing}
            showModuleSpacing={showModuleSpacing}
            rowSpacingM={layoutConfig.rowSpacingM}
            colSpacingM={layoutConfig.colSpacingM}
            isEditBoundaryMode={isEditBoundaryMode}
            activeEditZoneId={activeEditZoneId}
            onUpdateBoundaryPoint={handleUpdateBoundaryPoint}
            onUpdateZonePoint={handleUpdateZonePoint}
          />
        </main>
      </div>

      {/* Engineering Disclaimer */}
      <footer className="site-layout-disclaimer-bar">
        <Info size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
        <span>
          <strong>Engineering Disclaimer:</strong>
          Rooftop calculations and panel layouts are estimates based on satellite imagery and user inputs. Final installation requires structural, electrical, and local regulatory verification.
        </span>
      </footer>

      {/* Finalize Confirmation Dialog */}
      <Dialog
        isOpen={isFinalizeDialogOpen}
        onClose={() => setIsFinalizeDialogOpen(false)}
        role="dialog"
        title="Finalize Rooftop Solar Layout"
        description={`Confirm layout finalization for "${project.name}".`}
        footer={
          <div className="dialog-footer-actions">
            <Button variant="outline" onClick={() => setIsFinalizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleFinalizeConfirm} style={{ backgroundColor: "var(--color-success)" }}>
              <FileCheck2 size={15} style={{ marginRight: "6px" }} />
              Confirm & Finalize
            </Button>
          </div>
        }
      >
        <div className="dialog-body-details">
          <p>
            Finalizing locks the current configuration as the approved preliminary engineering design:
          </p>
          <ul className="dialog-summary-list">
            <li><strong>Site Area:</strong> {areaSummary.siteAreaM2.toLocaleString()} m²</li>
            <li><strong>Usable Area:</strong> {areaSummary.usableAreaM2.toLocaleString()} m²</li>
            <li><strong>Solar Modules:</strong> {layoutSummary.validPanels} panels ({layoutConfig.panelSpec.wattageW}W)</li>
            <li><strong>System Peak Capacity:</strong> {layoutSummary.installedCapacityKw} kWp</li>
          </ul>
          <p className="dialog-note">
            Note: If you make further adjustments to the roof boundary or panels in the future, the layout finalization status will automatically be reset to maintain data integrity.
          </p>
        </div>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        role="alertdialog"
        title="Reset Solar Layout"
        description="Are you sure you want to reset your layout modifications?"
        footer={
          <div className="dialog-footer-actions">
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleResetLayout}>
              Reset Layout
            </Button>
          </div>
        }
      >
        <p>
          This will restore the boundary, restricted zones, and panel array back to the last saved project state. Unsaved changes will be discarded.
        </p>
      </Dialog>

      {/* ============================================================
          PANEL MODEL SELECTION MODAL
          ============================================================ */}
      {isPanelModalOpen && (
        <div
          className="panel-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setIsPanelModalOpen(false); }}
        >
          <div className="panel-modal-sheet">
            {/* Modal Header */}
            <div className="panel-modal-header">
              <div>
                <h3 className="panel-modal-title">Solar Panel Catalogue</h3>
                <p className="panel-modal-subtitle">Select a panel model for your rooftop installation</p>
              </div>
              <button
                type="button"
                className="panel-modal-close"
                onClick={() => setIsPanelModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search + Filter Bar */}
            <div className="panel-modal-toolbar">
              <div className="panel-modal-search-wrap">
                <input
                  type="text"
                  placeholder="Search by model name or wattage..."
                  className="panel-modal-search"
                  value={panelModalSearch}
                  onChange={(e) => setPanelModalSearch(e.target.value)}
                />
              </div>
              <div className="panel-modal-filters">
                {(["all", "400", "540", "650"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`panel-modal-filter-btn ${panelModalFilter === f ? "is-active" : ""}`}
                    onClick={() => setPanelModalFilter(f)}
                  >
                    {f === "all" ? "All Models" : `${f}W`}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Grid */}
            <div className="panel-modal-grid">
              {Object.entries(PRESET_PANEL_SPECS)
                .filter(([, spec]) => {
                  const matchSearch = panelModalSearch
                    ? (spec.modelName ?? "").toLowerCase().includes(panelModalSearch.toLowerCase()) ||
                      String(spec.wattageW).includes(panelModalSearch)
                    : true;
                  const matchFilter =
                    panelModalFilter === "all" ? true : String(spec.wattageW) === panelModalFilter;
                  return matchSearch && matchFilter;
                })
                .map(([key, spec]) => (
                  <button
                    key={key}
                    type="button"
                    className={`panel-modal-card ${selectedPreset === key ? "is-selected" : ""}`}
                    onClick={() => {
                      handlePresetSelect(key);
                      setIsPanelModalOpen(false);
                    }}
                  >
                    <div className="panel-modal-card-img-wrap">
                      <img
                        src="/images/product-panel.jpg"
                        alt={spec.modelName || "Solar PV Module"}
                        className="panel-modal-card-img"
                        loading="eager"
                      />
                      <div className="panel-modal-img-gradient" />
                      <span className="panel-modal-watt-chip">{spec.wattageW}W</span>
                      {selectedPreset === key && (
                        <div className="panel-modal-selected-badge">
                          <Check size={12} /> Selected
                        </div>
                      )}
                    </div>
                    <div className="panel-modal-card-body">
                      <div className="panel-modal-card-name">{spec.modelName}</div>
                      <div className="panel-modal-card-specs">
                        <span>{spec.widthM}m × {spec.heightM}m</span>
                        <span className="panel-modal-card-eff">
                          ~{((spec.wattageW / (spec.widthM * spec.heightM * 1000)) * 100).toFixed(1)}% efficiency
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>

            {/* Footer */}
            <div className="panel-modal-footer">
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                All panels are Tier-1 certified. Prices may vary based on supplier and quantity.
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsPanelModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
