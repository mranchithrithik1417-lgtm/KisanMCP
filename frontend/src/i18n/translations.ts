export type Language = 'en' | 'kn';

export interface Translations {
  appName: string;
  appSubtitle: string;
  langEn: string;
  langKn: string;
  insurerConsole: string;
  farmerApp: string;
  demoModeBadge: string;
  liveBadge: string;
  sampleBadge: string;

  // Nav
  navHome: string;
  navChat: string;
  navClaims: string;
  navPlot: string;
  navHelp: string;

  // Login
  loginTitle: string;
  loginSubtitle: string;
  phoneLabel: string;
  phonePlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  loginBtn: string;
  demoFarmerBtn: string;
  loginNote: string;

  // Home
  greeting: string;
  tagline: string;
  fileClaimBtn: string;
  fileClaimDesc: string;
  myClaimsBtn: string;
  myClaimsDesc: string;
  assistantBtn: string;
  assistantDesc: string;
  markPlotBtn: string;
  markPlotDesc: string;
  registeredPlotTitle: string;
  areaLabel: string;
  digipinLabel: string;
  surveyLabel: string;

  // Plot Marking
  plotTitle: string;
  plotInstructions: string;
  tapToPlacePoints: string;
  dragToAdjust: string;
  acres: string;
  perimeter: string;
  surveyPlaceholder: string;
  ulpinPlaceholder: string;
  savePlotBtn: string;
  resetPointsBtn: string;
  plotSavedSuccess: string;

  // Evidence
  evidenceTitle: string;
  satelliteSection: string;
  ndviBaseline: string;
  ndviAfter: string;
  ndviDrop: string;
  weatherSection: string;
  totalRainfall: string;
  peakRainfall: string;
  rainfallAnomaly: string;
  normalRainfall: string;

  // Camera
  cameraTitle: string;
  cameraSubtitle: string;
  takePhotoBtn: string;
  switchCameraBtn: string;
  uploadFallbackBtn: string;
  watermarkNote: string;
  photoInsideField: string;
  photoNearField: string;
  photoFarField: string;
  retakeBtn: string;
  confirmPhotoBtn: string;

  // Claim Draft & Confirm
  draftTitle: string;
  draftSummary: string;
  cropLabel: string;
  disasterLabel: string;
  dateLabel: string;
  lossPercentLabel: string;
  indicativePayoutLabel: string;
  payoutDisclaimer: string;
  oneTimeTokenLabel: string;
  confirmBtn: string;
  cancelBtn: string;

  // Success Done
  successTitle: string;
  claimIdLabel: string;
  scoreLabel: string;
  scoreReasonsTitle: string;
  downloadPdfBtn: string;
  returnHomeBtn: string;

  // Claims List
  claimsListTitle: string;
  noClaimsYet: string;
  statusDraft: string;
  statusSubmitted: string;
  statusUnderReview: string;
  statusApproved: string;
  statusRejected: string;

  // Chat
  chatTitle: string;
  chatPlaceholder: string;
  sendBtn: string;
  listening: string;
  micUnsupported: string;
  talkToAssistant: string;

  // Voice Speaker
  listenScreen: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: "KisanClaim MCP",
    appSubtitle: "AI-Powered Crop Damage Insurance Claims",
    langEn: "English",
    langKn: "ಕನ್ನಡ",
    insurerConsole: "Insurer Console",
    farmerApp: "Farmer App",
    demoModeBadge: "Demo Mode Active",
    liveBadge: "Live Satellite Data",
    sampleBadge: "Sample Data (Demo)",

    // Nav
    navHome: "Home",
    navChat: "AI Assistant",
    navClaims: "My Claims",
    navPlot: "Field Map",
    navHelp: "Helpline",

    // Login
    loginTitle: "Farmer Sign In",
    loginSubtitle: "Fast & simple access with your mobile number",
    phoneLabel: "Mobile Number",
    phonePlaceholder: "e.g. 9876543210",
    nameLabel: "Farmer Full Name",
    namePlaceholder: "e.g. Ravi Kumar",
    loginBtn: "Enter App",
    demoFarmerBtn: "Instant Login as Demo Farmer (Ravi Kumar)",
    loginNote: "No OTP required. Simple hackathon prototype login.",

    // Home
    greeting: "Namaste",
    tagline: "File verified crop insurance claims in minutes with real satellite and weather evidence.",
    fileClaimBtn: "File a New Claim",
    fileClaimDesc: "Start claim workflow with automated MCP satellite & weather checks",
    myClaimsBtn: "My Insurance Claims",
    myClaimsDesc: "Track submitted claims, view scores, and download PDF dossiers",
    assistantBtn: "Talk to AI Assistant",
    assistantDesc: "File claims by speaking or typing naturally in Kannada or English",
    markPlotBtn: "Mark / Update Field Plot",
    markPlotDesc: "Set 4 corner boundary points and compute DIGIPIN & acreage",
    registeredPlotTitle: "Your Registered Plot",
    areaLabel: "Area",
    digipinLabel: "DIGIPIN",
    surveyLabel: "Survey No",

    // Plot Marking
    plotTitle: "Mark Crop Plot",
    plotInstructions: "Tap 4 corners of your field on the satellite map. Drag pins to adjust.",
    tapToPlacePoints: "Tap on map to add 4 corners",
    dragToAdjust: "Drag markers to fine-tune field boundary",
    acres: "Acres",
    perimeter: "Perimeter",
    surveyPlaceholder: "Survey / Khata Number (e.g. Sy 84/3)",
    ulpinPlaceholder: "ULPIN (Optional 14-digit land ID)",
    savePlotBtn: "Save Plot & Compute DIGIPIN",
    resetPointsBtn: "Reset Points",
    plotSavedSuccess: "Plot coordinates and DIGIPIN saved successfully!",

    // Evidence
    evidenceTitle: "Scientific Evidence Analysis",
    satelliteSection: "Satellite Crop Health (Sentinel-2 NDVI)",
    ndviBaseline: "Pre-Disaster Baseline",
    ndviAfter: "Post-Disaster State",
    ndviDrop: "Vegetation Loss",
    weatherSection: "Precipitation Records (Open-Meteo)",
    totalRainfall: "Total Window Rainfall",
    peakRainfall: "Peak 24h Rainfall",
    rainfallAnomaly: "Extreme Weather Anomaly Detected",
    normalRainfall: "Normal Weather Range",

    // Camera
    cameraTitle: "Geotagged Field Photo",
    cameraSubtitle: "Take a real photo of crop damage with automatic GPS & DIGIPIN timestamp",
    takePhotoBtn: "Capture Photo",
    switchCameraBtn: "Flip Camera",
    uploadFallbackBtn: "Upload from Gallery",
    watermarkNote: "Photos are digitally stamped with GPS, DIGIPIN, and date-time.",
    photoInsideField: "Photo is inside your field",
    photoNearField: "Photo is near your field (within 400 m buffer)",
    photoFarField: "Photo is far from your field (exceeds 400 m buffer)",
    retakeBtn: "Retake Photo",
    confirmPhotoBtn: "Attach Photo to Claim",

    // Claim Draft & Confirm
    draftTitle: "Review Claim Summary",
    draftSummary: "Please verify all details before official submission. Once confirmed with your one-time token, your claim will be recorded in the insurer queue.",
    cropLabel: "Crop Damaged",
    disasterLabel: "Disaster Type",
    dateLabel: "Disaster Date",
    lossPercentLabel: "Declared Crop Loss",
    indicativePayoutLabel: "Indicative Payout Estimate",
    payoutDisclaimer: "* Indicative algorithmic estimate, not an official PMFBY disbursement amount.",
    oneTimeTokenLabel: "One-Time Confirmation Token",
    confirmBtn: "Yes, File My Claim",
    cancelBtn: "Discard Draft",

    // Success Done
    successTitle: "Claim Filed Successfully!",
    claimIdLabel: "Claim Reference ID",
    scoreLabel: "Algorithmic Verification Score",
    scoreReasonsTitle: "Rule Verification Reasons",
    downloadPdfBtn: "Download Official PDF Dossier",
    returnHomeBtn: "Return to Home",

    // Claims List
    claimsListTitle: "Your Crop Claims",
    noClaimsYet: "No insurance claims filed yet. Tap 'File a New Claim' to start.",
    statusDraft: "Draft",
    statusSubmitted: "Submitted",
    statusUnderReview: "Under Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",

    // Chat
    chatTitle: "KisanClaim Assistant",
    chatPlaceholder: "Type or speak (e.g. 'My field is flooded, file a claim')...",
    sendBtn: "Send",
    listening: "Listening... speak now",
    micUnsupported: "Voice recognition not supported in this browser",
    talkToAssistant: "Assistant is ready to guide you step by step",

    // Voice Speaker
    listenScreen: "Listen"
  },
  kn: {
    appName: "ಕಿಸಾನ್‌ಕ್ಲೈಮ್ MCP",
    appSubtitle: "ರೈತ ಸ್ನೇಹಿ ಬೆಳೆ ಹಾನಿ ವಿಮಾ ಪರಿಹಾರ",
    langEn: "English",
    langKn: "ಕನ್ನಡ",
    insurerConsole: "ವಿಮಾ ಅಧಿಕಾರಿ ಕನ್ಸೋಲ್",
    farmerApp: "ರೈತ ಅಪ್ಲಿಕೇಶನ್",
    demoModeBadge: "ಡೆಮೊ ಮೋಡ್ ಸಕ್ರಿಯ",
    liveBadge: "ಲೈವ್ ಉಪಗ್ರಹ ಮಾಹಿತಿ",
    sampleBadge: "ಮಾದರಿ ಮಾಹಿತಿ (ಡೆಮೊ)",

    // Nav
    navHome: "ಮುಖಪುಟ",
    navChat: "ಸಹಾಯಕ",
    navClaims: "ನನ್ನ ಕ್ಲೈಮ್‌ಗಳು",
    navPlot: "ನನ್ನ ಹೊಲ",
    navHelp: "ಸಹಾಯವಾಣಿ",

    // Login
    loginTitle: "ರೈತರ ಲಾಗಿನ್",
    loginSubtitle: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಸುಲಭವಾಗಿ ಪ್ರವೇಶಿಸಿ",
    phoneLabel: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    phonePlaceholder: "ಉದಾ: 9876543210",
    nameLabel: "ರೈತರ ಹೆಸರು",
    namePlaceholder: "ಉದಾ: ರವಿ ಕುಮಾರ್",
    loginBtn: "ಪ್ರವೇಶಿಸಿ",
    demoFarmerBtn: "ಡೆಮೊ ರೈತ (ರವಿ ಕುಮಾರ್) ಆಗಿ ನೇರ ಲಾಗಿನ್",
    loginNote: "ಯಾವುದೇ ಒಟಿಪಿ ಅಗತ್ಯವಿಲ್ಲ. ತ್ವರಿತ ಡೆಮೊ ಲಾಗಿನ್.",

    // Home
    greeting: "ನಮಸ್ಕಾರ",
    tagline: "ಉಪಗ್ರಹ ಮತ್ತು ಮಳೆಯ ಸಾಕ್ಷ್ಯಗಳೊಂದಿಗೆ ಬೆಳೆ ಹಾನಿ ವಿಮೆಯನ್ನು ನಿಮಿಷಗಳಲ್ಲಿ ಸಲ್ಲಿಸಿ.",
    fileClaimBtn: "ಹೊಸ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ",
    fileClaimDesc: "ಎಂಸಿಪಿ ಉಪಗ್ರಹ ಮತ್ತು ಹವಾಮಾನ ಪರಿಶೀಲನೆಯೊಂದಿಗೆ ಕ್ಲೈಮ್ ಆರಂಭಿಸಿ",
    myClaimsBtn: "ನನ್ನ ವಿಮಾ ಕ್ಲೈಮ್‌ಗಳು",
    myClaimsDesc: "ಸಲ್ಲಿಸಿದ ಕ್ಲೈಮ್‌ಗಳ ಸ್ಥಿತಿ ಮತ್ತು ಪಿಡಿಎಫ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    assistantBtn: "ಎಐ ಸಹಾಯಕನೊಂದಿಗೆ ಮಾತನಾಡಿ",
    assistantDesc: "ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ ಸುಲಭವಾಗಿ ಕ್ಲೈಮ್ ಮಾಡಿ",
    markPlotBtn: "ಹೊಲದ ಗಡಿ ಗುರುತಿಸಿ",
    markPlotDesc: "4 ಮೂಲೆಗಳ ಬಿಂದುಗಳನ್ನು ಗುರುತಿಸಿ ಡಿಜಿಪಿನ್ ಮತ್ತು ವಿಸ್ತೀರ್ಣ ಪಡೆಯಿರಿ",
    registeredPlotTitle: "ನಿಮ್ಮ ನೋಂದಾಯಿತ ಜಮೀನು",
    areaLabel: "ವಿಸ್ತೀರ್ಣ",
    digipinLabel: "ಡಿಜಿಪಿನ್ (DIGIPIN)",
    surveyLabel: "ಸರ್ವೆ ನಂ",

    // Plot Marking
    plotTitle: "ಹೊಲದ ಗಡಿ ಗುರುತಿಸಿ",
    plotInstructions: "ಉಪಗ್ರಹ ನಕ್ಷೆಯಲ್ಲಿ ನಿಮ್ಮ ಹೊಲದ 4 ಮೂಲೆಗಳನ್ನು ಸ್ಪರ್ಶಿಸಿ. ಸರಿಹೊಂದಿಸಲು ಎಳೆಯಿರಿ.",
    tapToPlacePoints: "4 ಮೂಲೆಗಳನ್ನು ಸೇರಿಸಲು ನಕ್ಷೆಯನ್ನು ಸ್ಪರ್ಶಿಸಿ",
    dragToAdjust: "ಗಡಿ ಸರಿಹೊಂದಿಸಲು ಮಾರ್ಕರ್‌ಗಳನ್ನು ಎಳೆಯಿರಿ",
    acres: "ಎಕರೆ",
    perimeter: "ಸುತ್ತಳತೆ",
    surveyPlaceholder: "ಸರ್ವೆ / ಖಾತಾ ಸಂಖ್ಯೆ (ಉದಾ: Sy 84/3)",
    ulpinPlaceholder: "ಯುಎಲ್‌ಪಿನ್ (ಐಚ್ಛಿಕ 14 ಅಂಕಿಗಳ ಭೂಮಿ ಐಡಿ)",
    savePlotBtn: "ಜಮೀನು ಉಳಿಸಿ ಮತ್ತು ಡಿಜಿಪಿನ್ ಪಡೆಯಿರಿ",
    resetPointsBtn: "ಮರುಹೊಂದಿಸಿ",
    plotSavedSuccess: "ಜಮೀನಿನ ವಿವರ ಮತ್ತು ಡಿಜಿಪಿನ್ ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!",

    // Evidence
    evidenceTitle: "ವೈಜ್ಞಾನಿಕ ಸಾಕ್ಷ್ಯಗಳ ಪರಿಶೀಲನೆ",
    satelliteSection: "ಉಪಗ್ರಹ ಬೆಳೆ ಹಸಿರು ಸೂಚ್ಯಂಕ (Sentinel-2 NDVI)",
    ndviBaseline: "ಹಾನಿಗೆ ಮುಂಚಿನ ಸ್ಥಿತಿ",
    ndviAfter: "ಹಾನಿಯ ನಂತರದ ಸ್ಥಿತಿ",
    ndviDrop: "ಬೆಳೆ ನಷ್ಟ ಪ್ರಮಾಣ",
    weatherSection: "ಮಳೆಯ ದಾಖಲೆಗಳು (Open-Meteo)",
    totalRainfall: "ಒಟ್ಟು ಬಿದ್ದ ಮಳೆ",
    peakRainfall: "ಗರಿಷ್ಠ 24 ಗಂಟೆಗಳ ಮಳೆ",
    rainfallAnomaly: "ತೀವ್ರ ಹವಾಮಾನ ವೈಪರೀತ್ಯ ಪತ್ತೆಯಾಗಿದೆ",
    normalRainfall: "ಸಾಮಾನ್ಯ ಮಳೆ ಪ್ರಮಾಣ",

    // Camera
    cameraTitle: "ಸ್ಥಳ-ಮುದ್ರಿತ ಬೆಳೆ ಫೋಟೋ",
    cameraSubtitle: "ಜಿಪಿಎಸ್ ಮತ್ತು ಡಿಜಿಪಿನ್ ಮುದ್ರೆಯೊಂದಿಗೆ ಬೆಳೆ ಹಾನಿಯ ನೈಜ ಫೋಟೋ ತೆಗೆಯಿರಿ",
    takePhotoBtn: "ಫೋಟೋ ತೆಗೆಯಿರಿ",
    switchCameraBtn: "ಕ್ಯಾಮೆರಾ ಬದಲಿಸಿ",
    uploadFallbackBtn: "ಗ್ಯಾಲರಿಯಿಂದ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    watermarkNote: "ಫೋಟೋಗಳಲ್ಲಿ ಜಿಪಿಎಸ್, ಡಿಜಿಪಿನ್ ಮತ್ತು ಸಮಯ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮುದ್ರಿತವಾಗುತ್ತದೆ.",
    photoInsideField: "ಭಾವಚಿತ್ರವು ನಿಮ್ಮ ಜಮೀನಿನ ಒಳಗಿದೆ",
    photoNearField: "ಭಾವಚಿತ್ರವು ಜಮೀನಿನ ಸಮೀಪದಲ್ಲಿದೆ (400 ಮೀಟರ್ ಪರಿಧಿಯಲ್ಲಿ)",
    photoFarField: "ಭಾವಚಿತ್ರವು ಜಮೀನಿನಿಂದ ಬಹಳ ದೂರದಲ್ಲಿದೆ (400 ಮೀ ಮೀರಿದೆ)",
    retakeBtn: "ಮತ್ತೆ ಫೋಟೋ ತೆಗೆಯಿರಿ",
    confirmPhotoBtn: "ಕ್ಲೈಮ್‌ಗೆ ಫೋಟೋ ಲಗತ್ತಿಸಿ",

    // Claim Draft & Confirm
    draftTitle: "ಕರಡು ಕ್ಲೈಮ್ ಪರಿಶೀಲನೆ",
    draftSummary: "ಅಧಿಕೃತ ಸಲ್ಲಿಕೆಗೆ ಮುನ್ನ ದಯವಿಟ್ಟು ಎಲ್ಲ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ನಿಮ್ಮ ಒಂದು ಬಾರಿಯ ಟೋಕನ್ ಮೂಲಕ ದೃಢೀಕರಿಸಿದ ನಂತರವೇ ಕ್ಲೈಮ್ ಸಲ್ಲಿಕೆಯಾಗುತ್ತದೆ.",
    cropLabel: "ಹಾನಿಯಾದ ಬೆಳೆ",
    disasterLabel: "ವಿಕೋಪದ ಪ್ರಕಾರ",
    dateLabel: "ಘಟನೆಯ ದಿನಾಂಕ",
    lossPercentLabel: "ಘೋಷಿತ ಬೆಳೆ ನಷ್ಟ",
    indicativePayoutLabel: "ಅಂದಾಜು ಪರಿಹಾರ ಮೊತ್ತ",
    payoutDisclaimer: "* ಇದು ಅಲ್ಗಾರಿದಮಿಕ್ ಅಂದಾಜು ಮೊತ್ತ ಮಾತ್ರ, ಅಧಿಕೃತ ಪಿಎಂಎಫ್‌ಬಿವೈ ಮಂಜೂರಾತಿ ಮೊತ್ತವಲ್ಲ.",
    oneTimeTokenLabel: "ಒಂದು ಬಾರಿಯ ದೃಢೀಕರಣ ಟೋಕನ್",
    confirmBtn: "ಹೌದು, ನನ್ನ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ",
    cancelBtn: "ಕರಡು ರದ್ದುಮಾಡಿ",

    // Success Done
    successTitle: "ಕ್ಲೈಮ್ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಕೆಯಾಗಿದೆ!",
    claimIdLabel: "ಕ್ಲೈಮ್ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ",
    scoreLabel: "ಸ್ವಯಂಚಾಲಿತ ಪರಿಶೀಲನಾ ಅಂಕ",
    scoreReasonsTitle: "ಪರಿಶೀಲನಾ ನಿಯಮಗಳ ವಿವರಣೆ",
    downloadPdfBtn: "ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    returnHomeBtn: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",

    // Claims List
    claimsListTitle: "ನಿಮ್ಮ ವಿಮಾ ಕ್ಲೈಮ್‌ಗಳು",
    noClaimsYet: "ಇನ್ನೂ ಯಾವುದೇ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿಲ್ಲ. ಆರಂಭಿಸಲು 'ಹೊಸ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ' ಒತ್ತಿರಿ.",
    statusDraft: "ಕರಡು",
    statusSubmitted: "ಸಲ್ಲಿಸಲಾಗಿದೆ",
    statusUnderReview: "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ",
    statusApproved: "ಮಂಜೂರಾಗಿದೆ",
    statusRejected: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",

    // Chat
    chatTitle: "ಕಿಸಾನ್‌ಕ್ಲೈಮ್ ಸಹಾಯಕ",
    chatPlaceholder: "ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ (ಉದಾ: 'ನನ್ನ ಜಮೀನಿಗೆ ನೀರು ನುಗ್ಗಿದೆ, ಕ್ಲೈಮ್ ಮಾಡಿ')...",
    sendBtn: "ಕಳುಹಿಸಿ",
    listening: "ಆಲಿಸುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ",
    micUnsupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ",
    talkToAssistant: "ಸಹಾಯಕನು ನಿಮಗೆ ಹಂತ-ಹಂತವಾಗಿ ಮಾರ್ಗದರ್ಶನ ನೀಡಲು ಸಿದ್ಧನಾಗಿದ್ದಾನೆ",

    // Voice Speaker
    listenScreen: "ಕೇಳಿ"
  }
};
