import React, { useState, useEffect } from "react";
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDocFromServer 
} from "firebase/firestore";
import { 
  db, 
  handleFirestoreError, 
  OperationType 
} from "./lib/firebase";
import { 
  Coffee, 
  MapPin, 
  Calendar, 
  Clock, 
  Truck, 
  Sparkles, 
  Phone, 
  ShieldCheck, 
  Check, 
  Plus, 
  Minus, 
  ChevronDown, 
  ShoppingBag, 
  HelpCircle,
  TrendingUp,
  User,
  MessageSquare,
  UtensilsCrossed,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types for Preset Locations
interface PresetLocation {
  name: string;
  distance: number;
}

// Preset locations centered around Sg Penchala
const locationsPreset: PresetLocation[] = [
  { name: "Sg Penchala", distance: 0 },
  { name: "Mutiara Damansara / IKEA", distance: 3 },
  { name: "Bandar Utama / 1 Utama", distance: 5 },
  { name: "TTDI (Taman Tun Dr Ismail)", distance: 6 },
  { name: "Kota Damansara", distance: 8 },
  { name: "Kepong", distance: 10 },
  { name: "Mont Kiara / Sri Hartamas", distance: 11 },
  { name: "Petaling Jaya (SS2)", distance: 12 },
  { name: "Bangsar", distance: 15 },
  { name: "Kuala Lumpur City Centre (KLCC)", distance: 18 },
  { name: "Subang Jaya / Sunway", distance: 20 },
  { name: "Cheras", distance: 24 },
  { name: "Shah Alam", distance: 26 },
  { name: "Klang", distance: 35 }
];

// Fun Local Malaysia compliments
const POURING_COMPLIMENTS = [
  "Perghh! Macam tarik kat kedai mamak ori! ☕️✨",
  "Pekat melikat, manis-manis manja! 🍯🥛",
  "Padu bossku! Cukup buih, cukup manis! 🔥",
  "Aroma teh wangi semerbak satu majlis! 🍃",
  "Kekal panas berasap! Memang terangkat! ♨️",
  "Buih melimpah ruah, kegemaran tetamu! 🎉",
  "Teh Tarik premium kualiti kayangan! 👑"
];

export default function App() {
  // Quantities
  const [qty12L, setQty12L] = useState<number>(1);
  const [qty8L, setQty8L] = useState<number>(0);
  
  // Delivery State
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [selectedDistance, setSelectedDistance] = useState<number>(12); // Default to PJ/SS2 (12km)
  const [activePreset, setActivePreset] = useState<string>("Petaling Jaya (SS2)");
  
  // Custom Distance toggle input form
  const [isCustomDistance, setIsCustomDistance] = useState<boolean>(false);
  const [customDistanceInput, setCustomDistanceInput] = useState<string>("12");

  // User details
  const [userName, setUserName] = useState<string>("");
  const [userDate, setUserDate] = useState<string>("");
  const [userTime, setUserTime] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string>("");

  // Firebase integration states
  const [firebaseStatus, setFirebaseStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [firebaseErrorMsg, setFirebaseErrorMsg] = useState<string>("");
  const [savedOrderId, setSavedOrderId] = useState<string>("");

  // Target calendar date checking and warning states
  const [isCheckingDate, setIsCheckingDate] = useState<boolean>(false);
  const [dateAlertMsg, setDateAlertMsg] = useState<string>("");

  // Check date slot availability in real-time
  useEffect(() => {
    if (!userDate) {
      setDateAlertMsg("");
      return;
    }

    async function checkDateAvailability() {
      setIsCheckingDate(true);
      setDateAlertMsg("");

      // Hide previous block alert when user explicitly selects a new date
      const alertBox = document.getElementById("crimson-rose-alert");
      if (alertBox) {
        alertBox.style.display = "none";
      }

      try {
        const parts = userDate.split("-");
        if (parts.length !== 3) return;
        
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        if (!year || !month || !day) return;

        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const monthIdx = parseInt(month, 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) return;

        const monthName = months[monthIdx];
        const dayInt = parseInt(day, 10);
        const formattedDate = `${dayInt} ${monthName} ${year}`; // e.g. "10 JUN 2026"

        const bookingDocRef = doc(db, "bookings", formattedDate);
        const docSnap = await getDocFromServer(bookingDocRef);

        if (docSnap.exists()) {
          const bookingData = docSnap.data();
          const isBlocked = bookingData && bookingData.isFull === true;
          
          if (bookingData && (bookingData.isFull || isBlocked)) {
            // 1. Cari elemen Kotak Crimson Rose yang kita letak di HTML tadi
            const alertBox = document.getElementById("crimson-rose-alert");
            const alertText = document.getElementById("crimson-rose-text");
            
            if (alertBox && alertText) {
                // 2. Masukkan mesej amaran secara dinamik
                alertText.innerText = `⚠️ Maaf! Slot tempahan Teh Tarik Balang untuk tarikh ${formattedDate} sudah PENUH sepenuhnya. Sila pilih tarikh lain ya! 🙏✨`;
                
                // 3. Tukar status daripada tersembunyi (none) kepada papar (block)
                alertBox.style.display = "block";
                
                // 4. Skrol skrin ke arah kotak amaran secara automatik supaya user nampak
                alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            const warningText = `⚠️ Maaf! Slot tempahan Teh Tarik Balang untuk tarikh ${formattedDate} sudah PENUH sepenuhnya. Sila pilih tarikh lain ya! 🙏✨`;
            setDateAlertMsg(warningText);

            // Instantly reset the date input selection to blank so they cannot submit
            setUserDate("");
            return false; // Sekat proses tempahan seterusnya
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa status slot tempahan daripada Firestore:", err);
      } finally {
        setIsCheckingDate(false);
      }
    }

    checkDateAvailability();
  }, [userDate]);

  // Run initial SDK connection check based on "firebase-integration" skill
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        console.log("Firebase Connection Active!");
      } catch (error) {
        if (error instanceof Error && error.message.includes("offline")) {
          console.error("Please check your Firebase configuration or network status.");
        }
      }
    }
    testConnection();
  }, []);

  // OSM Route Calculation States
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calcError, setCalcError] = useState<string>("");
  const [calcSuccessMsg, setCalcSuccessMsg] = useState<string>("");
  const [lastCalculatedAddress, setLastCalculatedAddress] = useState<string>("");

  // Auto-calculate distance based on address with a debounce of 1500ms
  useEffect(() => {
    if (deliveryType !== "delivery") return;
    const trimmedAddress = userAddress.trim();
    if (!trimmedAddress || trimmedAddress.length < 5) {
      return;
    }
    // Avoid redundant calculation if address hasn't changed or is currently calculating
    if (trimmedAddress.toLowerCase() === lastCalculatedAddress.toLowerCase()) {
      return;
    }

    const timer = setTimeout(() => {
      handleCalculateOSM(trimmedAddress);
    }, 1500);

    return () => clearTimeout(timer);
  }, [userAddress, deliveryType, lastCalculatedAddress]);

  const fallbackGeocodeAndRoute = async (searchAddress: string) => {
    const START_LAT = 3.1610;
    const START_LON = 101.6214;

    let query = searchAddress;
    if (!query.toLowerCase().includes("malaysia")) {
      query += ", Malaysia";
    }

    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const geoResponse = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "TheMostTea-Delivery-Calculator/1.0 (tuai.corp@gmail.com)"
      }
    });
    if (!geoResponse.ok) throw new Error("Gagal menyambung ke OSM Nominatim.");

    const geoData = await geoResponse.json();
    if (!geoData || geoData.length === 0) {
      throw new Error("Alamat tidak ditemui. Sila taip alamat yang lebih lengkap.");
    }

    const matched = geoData[0];
    const destLat = parseFloat(matched.lat);
    const destLon = parseFloat(matched.lon);
    
    const routingUrl = `https://router.project-osrm.org/route/v1/driving/${START_LON},${START_LAT};${destLon},${destLat}?overview=false`;
    const routeResponse = await fetch(routingUrl);
    if (!routeResponse.ok) throw new Error("Gagal menyambung ke OSRM Router.");

    const routeData = await routeResponse.json();
    if (routeData.code !== "Ok" || !routeData.routes || routeData.routes.length === 0) {
      throw new Error("Laluan pemanduan gagal dikesan dari Sg Penchala ke lokasi ini.");
    }

    const distMeter = routeData.routes[0].distance;
    return {
      distanceKm: Math.ceil(distMeter / 1000),
      rawDistanceMeter: distMeter,
      matchedAddress: matched.display_name
    };
  };

  const handleCalculateOSM = async (addressOverride?: string | unknown) => {
    const targetAddress = (addressOverride && typeof addressOverride === "string") ? addressOverride : userAddress;
    if (!targetAddress || targetAddress.trim() === "") {
      setCalcError("Sila masukkan alamat lengkap terlebih dahulu.");
      return;
    }
    
    setIsCalculating(true);
    setCalcError("");
    setCalcSuccessMsg("");
    setLastCalculatedAddress(targetAddress.trim());
    
    try {
      const response = await fetch("/api/calculate-distance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: targetAddress }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedDistance(data.distanceKm);
        setActivePreset("Custom (Dikirakan)");
        setIsCustomDistance(true);
        setCalcSuccessMsg(`Jarak pandu dikesan secara automatik: ${data.distanceKm} KM. Menerusi: ${data.matchedAddress}`);
      } else {
        // Fallback geocoding client-side if API route returned an error
        console.warn("Backend error, falling back to client-side geocoding...", data.error);
        const fb = await fallbackGeocodeAndRoute(targetAddress);
        setSelectedDistance(fb.distanceKm);
        setActivePreset("Custom (Dikirakan)");
        setIsCustomDistance(true);
        setCalcSuccessMsg(`Jarak pandu dikesan secara automatik (Mod Alt): ${fb.distanceKm} KM. Menerusi: ${fb.matchedAddress}`);
      }
    } catch (err: any) {
      console.warn("Network error, falling back to client-side geocoding...", err);
      try {
        const fb = await fallbackGeocodeAndRoute(targetAddress);
        setSelectedDistance(fb.distanceKm);
        setActivePreset("Custom (Dikirakan)");
        setIsCustomDistance(true);
        setCalcSuccessMsg(`Jarak pandu dikesan secara automatik (Mod Alt): ${fb.distanceKm} KM. Menerusi: ${fb.matchedAddress}`);
      } catch (fallbackErr: any) {
        setCalcError(fallbackErr.message || "Sistem gagal menyambung ke talian geolokasi. Sila masukkan nama jalan / kawasan dengan lebih spesifik.");
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Pouring Simulator States
  const [isPouring, setIsPouring] = useState<boolean>(false);
  const [pouredCount, setPouredCount] = useState<number>(0);
  const [activeCompliment, setActiveCompliment] = useState<string>("");
  const [selectedDispenserSize, setSelectedDispenserSize] = useState<"12L" | "8L">("12L");

  // FAQ Expanded index
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Status Alerts
  const [showOrderFeedback, setShowOrderFeedback] = useState<boolean>(false);

  // Reset preset selection if custom value matches none
  const handleDistanceSliderChange = (val: number) => {
    setSelectedDistance(val);
    setIsCustomDistance(true);
    setActivePreset("Custom");
  };

  const handlePresetSelect = (loc: PresetLocation) => {
    setSelectedDistance(loc.distance);
    setActivePreset(loc.name);
    setIsCustomDistance(false);
    setCustomDistanceInput(loc.distance.toString());
  };

  // Pricing constants (from flyer)
  const price12L = 85;
  const price8L = 65;
  const deliveryRatePerKm = 1; // RM1 per KM

  // Calculations
  const subtotalWater = (qty12L * price12L) + (qty8L * price8L);
  const deliveryCharge = deliveryType === "delivery" ? selectedDistance * deliveryRatePerKm : 0;
  const grandTotal = subtotalWater + deliveryCharge;
  const totalLitres = (qty12L * 12) + (qty8L * 8);
  
  // Approx cups served (Each Litre translates to 10 cups of 100ml)
  const approxCups = totalLitres * 10;
  
  // Free cups and pax suitability details based on user's new instructions (8L = 50 cups/40-50 pax, 12L = 100 cups/80-90 pax)
  const totalFreeCups = (qty12L * 100) + (qty8L * 50);
  const minPax = (qty12L * 80) + (qty8L * 40);
  const maxPax = (qty12L * 90) + (qty8L * 50);

  // Dispense cup animation trigger
  const handleDispense = () => {
    if (isPouring) return;
    setIsPouring(true);
    setPouredCount(prev => prev + 1);
    
    // Choose a random local compliment
    const randIdx = Math.floor(Math.random() * POURING_COMPLIMENTS.length);
    setActiveCompliment(POURING_COMPLIMENTS[randIdx]);

    setTimeout(() => {
      setIsPouring(false);
    }, 2800);
  };

  // Compile WhatsApp message
  const getWhatsAppLink = (orderId?: string) => {
    const formattedDate = userDate ? new Date(userDate).toLocaleDateString("ms-MY", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : "*(Belum diisi)*";
    
    const itemStrings: string[] = [];
    if (qty12L > 0) itemStrings.push(`🍯 ${qty12L} x Balang *Teh Tarik 12 Liter* (RM ${qty12L * price12L})`);
    if (qty8L > 0) itemStrings.push(`🍯 ${qty8L} x Balang *Teh Tarik 8 Liter* (RM ${qty8L * price8L})`);

    const formattedMessage = `Assalamualaikum / Salam Sejahtera *The Most Tea*! 🍵

${orderId ? `🆔 *No Rujukan Tempahan:* \`${orderId}\` (Direkod dalam Firebase)\n` : ""}Saya berminat untuk membuat tempahan *Teh Tarik Premium dalam Balang*. 

Berikut adalah butiran majlis dan tempahan saya:

📌 *Butiran Pelanggan:*
• *Nama:* ${userName || "*(Sila isi nama saya)*"}
• *Tarikh Majlis:* ${formattedDate}
• *Masa Majlis:* ${userTime || "*(Sila isi masa)*"}
• *Kaedah:* ${deliveryType === "delivery" ? "Penghantaran (Delivery)" : "Ambil Sendiri (Self-Pickup)"}
• *Alamat:* ${deliveryType === "delivery" ? (userAddress || "*(Sila isi alamat lengkap)*") : "Sg Penchala (Self-Pickup)"}

📦 *Pilihan Air & Balang:*
${itemStrings.join("\n") || "⚠️ *(Belum memilih saiz balang)*"}

📊 *Anggaran Sebut Harga:*
• *Harga Air:* RM ${subtotalWater.toFixed(2)}
• *Jarak:* ${deliveryType === "delivery" ? selectedDistance : 0} KM dari Sg Penchala
• *Kos Delivery:* RM ${deliveryCharge.toFixed(2)}
• 💰 *Jumlah Keseluruhan: RM ${grandTotal.toFixed(2)}*

📝 *Nota Tambahan/Permintaan khas:*
_" ${userNotes.trim() || "Tiada"} "_

Sila maklumkan sekiranya tarikh dan masa ini available untuk slot saya. Terima kasih banyak! 🙏✨`;

    const encodedText = encodeURIComponent(formattedMessage);
    return `https://wa.me/60182667703?text=${encodedText}`;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowOrderFeedback(true);
    setFirebaseStatus("saving");
    setFirebaseErrorMsg("");

    const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);
    setSavedOrderId(orderId);

    try {
      // 1. Create a document reference in the 'orders' collection
      const orderRef = doc(db, "orders", orderId);
      
      // 2. Build order payload compatible with firestore.rules
      const orderPayload = {
        userName: userName.trim() || "Pelanggan Tanpa Nama",
        userDate: userDate || new Date().toISOString().split("T")[0],
        userTime: userTime || "12:00",
        deliveryType: deliveryType,
        userAddress: deliveryType === "delivery" ? userAddress.trim() : "Sg Penchala (Self-Pickup)",
        selectedDistance: deliveryType === "delivery" ? selectedDistance : 0,
        deliveryCharge: deliveryCharge,
        qty12L: qty12L,
        qty8L: qty8L,
        subtotalWater: subtotalWater,
        grandTotal: grandTotal,
        userNotes: userNotes.trim() ? userNotes.trim() : "Tiada",
        status: "pending",
        createdAt: serverTimestamp()
      };

      // 3. Write data synchronously to Firestore
      await setDoc(orderRef, orderPayload);
      setFirebaseStatus("saved");

      // 4. Open WhatsApp draft on success
      setTimeout(() => {
        window.open(getWhatsAppLink(orderId), "_blank");
        setShowOrderFeedback(false);
      }, 900);

    } catch (error) {
      setFirebaseStatus("error");
      setFirebaseErrorMsg(error instanceof Error ? error.message : String(error));
      console.error("Gagal mendaftarkan tempahan ke Firebase Firestore:", error);
      
      // Open WhatsApp as a fallback even if Firestore write fails (resilient behavior)
      setTimeout(() => {
        window.open(getWhatsAppLink(orderId + "-FB-ERR"), "_blank");
        setShowOrderFeedback(false);
      }, 1500);

      // Report security/permission details back to console and throw formatted error for system analysis
      handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
    }
  };

  // FAQ Data list
  const faqs = [
    {
      q: "Adakah balang ini dipinjamkan sekali?",
      a: "Ya, betul! Kami meminjamkan Balang Air Teh Tarik Premium sepanjang majlis anda berlangsung. Oleh kerana balang kami dilengkapi pili paip premium (faucet tap) yang sangat praktikal di bahagian bawah, anda boleh menuang air secara langsung dengan bersih tanpa memerlukan sebarang alat pencedok manual. Balang perlulah dipulangkan kembali setelah majlis selesai."
    },
    {
      q: "Berapakah kapasiti cawan untuk balang 12L & 8L?",
      a: "Setiap tempahan didatangkan dengan cawan percuma bersaiz 100ml. Balang 12 Liter disertakan secara Percuma 100 pcs cawan (sesuai untuk majlis 80-90 orang). Manakala Balang 8 Liter disertakan secara Percuma 50 pcs cawan (sesuai untuk majlis 40-50 orang). Sangat menjimatkan dan mencukupi!"
    },
    {
      q: "Adakah air ini kekal panas sepanjang majlis?",
      a: "Betul! Balang berinsulasi premium kami didesain khas untuk mengekalkan kehangatan teh tarik sehingga 4 jam atau lebih tanpa menggunakan elektrik. Tetamu anda akan sentiasa dapat menikmati teh suam segar yang harmoni."
    },
    {
      q: "Berapa hari sebelum majlis saya perlu menempah?",
      a: "Kami amat menyarankan tempahan awal dibuat sekurang-kurangnya 2 hingga 3 hari sebelum tarikh majlis bagi mengelakkan slot penuh. Slot hujung minggu (Sabtu & Ahad) sangat cepat dbooked!"
    },
    {
      q: "Bagaimana proses pemulangan balang air?",
      a: "Bagi kawasan berdekatan, runner kami boleh membantu mengambil semula balang selepas majlis tamat (tertakluk kepada caj pengambilan minimum atau persetujuan bersama), atau anda boleh memulangkan sendiri ke Sg Penchala."
    }
  ];

  return (
    <div className="relative min-h-screen font-sans text-stone-100 bg-[#06120b] overflow-x-hidden selection:bg-gold-500 selection:text-[#06120b]">
      
      {/* Decorative Malay Islamic Geometric Gold Borders & Accents */}
      <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-gold-700 via-gold-300 to-gold-700 z-50"></div>
      
      {/* Background Ornate Grid Pattern */}
      <div className="absolute inset-0 malay-motif-bg pointer-events-none z-0"></div>

      {/* Hero Header with Corner Decorative Borders */}
      <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-8 z-10">
        
        {/* Decorative corner motifs mimicking the corners of the flyer */}
        <div className="hidden lg:block absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 border-gold-400/50 rounded-tl-sm pointer-events-none">
          <div className="absolute top-1.5 left-1.5 w-12 h-12 border-t border-l border-gold-500/20"></div>
        </div>
        <div className="hidden lg:block absolute top-6 right-6 w-16 h-16 border-t-2 border-r-2 border-gold-400/50 rounded-tr-sm pointer-events-none">
          <div className="absolute top-1.5 right-1.5 w-12 h-12 border-t border-r border-gold-500/20"></div>
        </div>

        {/* LOGO AREA */}
        <div className="text-center flex flex-col items-center justify-center">
          
          {/* Glowing Animated Steaming Tea cup & Brand badge */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative mb-4 flex items-center justify-center bg-forest-900 border-2 border-gold-400/60 p-4 rounded-full shadow-2xl shadow-gold-500/5 w-24 h-24"
          >
            {/* Liquid golden ring */}
            <div className="absolute inset-0 rounded-full border border-gold-200/20 animate-ping"></div>
            
            {/* Steaming Lines */}
            <div className="absolute -top-3 flex space-x-1.5 justify-center">
              <span className="w-1 h-5 bg-gradient-to-t from-gold-400 to-transparent rounded-full steam-line" style={{ animationDelay: "0.1s" }}></span>
              <span className="w-1 h-6 bg-gradient-to-t from-gold-300 to-transparent rounded-full steam-line" style={{ animationDelay: "0.5s" }}></span>
              <span className="w-1 h-4 bg-gradient-to-t from-gold-500 to-transparent rounded-full steam-line" style={{ animationDelay: "0.8s" }}></span>
            </div>

            {/* Premium Gold Cup Icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-gold-400" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 2v2M10 2v2M14 2v2" strokeLinecap="round"/>
            </svg>
          </motion.div>

          <p className="font-serif text-sm tracking-[0.25em] text-gold-400 font-bold uppercase mb-1">TEH TARIK PREMIUM DALAM BALANG</p>
          
          <h1 className="font-serif text-5xl md:text-6xl font-extrabold tracking-wide text-transparent bg-clip-text gold-text-shimmer mb-3 uppercase">
            THE MOST TEA
          </h1>

          <div className="flex items-center justify-center space-x-4 mb-4">
            <span className="h-[1px] w-12 md:w-20 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></span>
            <p className="font-sans text-xs md:text-sm font-semibold text-emerald-100 tracking-wider">
              Sedia Untuk Majlis &amp; Acara Anda!
            </p>
            <span className="h-[1px] w-12 md:w-20 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></span>
          </div>

          <div className="inline-flex items-center space-x-2 bg-gold-950/40 border border-gold-500/20 md:px-5 py-2 px-3 rounded-full shadow-inner">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
            </span>
            <span className="font-serif text-gold-200 text-xs md:text-sm tracking-wider font-bold">
              🔥 Kekal Panas Hingga 4 Jam Terjamin
            </span>
          </div>
        </div>
      </div>

      {/* Main App Grid Container */}
      <main className="relative max-w-7xl mx-auto px-4 pb-20 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN (COLSPAN-7): Interactive Liquid Dispenser Simulator & Price Card Display */}
        <div className="lg:col-span-7 flex flex-col space-y-8">
          
          {/* THE DIGITAL POUR-YOUR-OWN TEA SIMULATOR */}
          <div className="border border-gold-500/30 rounded-2xl bg-gradient-to-br from-forest-900/90 to-forest-950/90 p-5 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            
            {/* Top gold line flare */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>

            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-gold-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
                  Smart Balang Visualizer
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Pilih saiz balang untuk previu &amp; cuba simulasi penuangan teh suam premium!
                </p>
              </div>
              
              {/* Size Select Button Group */}
              <div className="inline-flex p-1 bg-[#06120b] border border-gold-800/40 rounded-xl space-x-1">
                <button
                  onClick={() => setSelectedDispenserSize("12L")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-serif tracking-wider transition-all duration-300 ${
                    selectedDispenserSize === "12L"
                      ? "bg-gradient-to-r from-gold-600 to-gold-400 text-[#06120b] shadow-md"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  BALANG 12L
                </button>
                <button
                  onClick={() => setSelectedDispenserSize("8L")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-serif tracking-wider transition-all duration-300 ${
                    selectedDispenserSize === "8L"
                      ? "bg-gradient-to-r from-gold-600 to-gold-400 text-[#06120b] shadow-md"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  BALANG 8L
                </button>
              </div>
            </div>

            {/* SIMULATOR LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 md:gap-8 items-center bg-[#07160d]/60 border border-gold-900/40 p-4 sm:p-5 md:p-6 rounded-xl">
              
              {/* VIRTUAL DISPENSER SVG INTERACTIVE COMPONENT (4 cols md) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[250px] md:min-h-[290px]">
                
                {/* Visual heat waves radiating behind the jar to show warmth */}
                <div className="absolute top-[10%] w-36 h-48 sm:w-44 sm:h-56 bg-gold-400/5 rounded-full filter blur-xl animate-pulse"></div>

                {/* THE INSULATED JAR */}
                <div className="w-36 h-56 relative flex flex-col items-center justify-end transform scale-[1.18] sm:scale-[1.3] md:scale-[1.15] lg:scale-[1.25] xl:scale-[1.38] origin-bottom transition-all duration-300 my-5 sm:my-8 md:my-5">
                  
                  {/* Handle top black bar */}
                  <div className="w-24 h-4 bg-stone-800 rounded-t-lg border-b border-stone-700 shadow-md"></div>
                  
                  {/* Steel top cover neck */}
                  <div className="w-28 h-5 bg-gradient-to-r from-stone-700 via-stone-500 to-stone-700 border-x border-stone-800 flex items-center justify-between px-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                    <span className="font-mono text-[7px] text-stone-300">INSULATED CONTAINER</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                  </div>

                  {/* Main Container Body */}
                  <div className="w-32 h-44 bg-[#143d26] border-2 border-gold-400/60 rounded-b-[2rem] rounded-t-md relative shadow-2xl overflow-hidden flex flex-col justify-between p-2">
                    
                    {/* Metal Sheen gradient shine overlays */}
                    <div className="absolute inset-y-0 left-2 w-3 bg-white/5 skew-x-12"></div>
                    <div className="absolute inset-y-0 right-2 w-1.5 bg-white/5 -skew-x-12"></div>
                    
                    {/* Dynamic Tea level inside container (semi-fluid translucent wave) */}
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gold-900 via-orange-800 to-gold-600/80 transition-all duration-1000 flex items-end justify-center overflow-hidden"
                      style={{ 
                        height: isPouring ? "30%" : selectedDispenserSize === "12L" ? (qty12L > 0 ? "70%" : "30%") : (qty8L > 0 ? "65%" : "30%"),
                        opacity: 0.85
                      }}
                    >
                      {/* Interactive tea foam line bubbles */}
                      <div className="w-full h-2 bg-yellow-100/30 filter blur-sm animate-pulse"></div>
                    </div>

                    {/* Branding label on container aligned with the real image logo design */}
                    <div className="z-10 bg-[#06120b]/80 border border-gold-500/20 py-1.5 px-1 rounded text-center w-full mt-3 self-center shadow-lg">
                      <p className="font-serif text-[7px] tracking-[0.2em] text-gold-400">THE MOST TEA</p>
                      <h4 className="font-serif text-xxs tracking-wider font-extrabold text-gold-100 uppercase">
                        Teh Tarik Premium
                      </h4>
                      <p className="font-mono text-[6px] text-emerald-400/80 font-bold mt-0.5">
                        {selectedDispenserSize === "12L" ? "★ CAPACITY 12L ★" : "★ CAPACITY 8L ★"}
                      </p>
                    </div>

                    {/* Serving indicators */}
                    <div className="z-10 flex items-center justify-center space-x-1 mb-2 bg-[#06120b]/60 py-1 px-2.5 rounded-full self-center border border-gold-950">
                      <Coffee className="w-2.5 h-2.5 text-gold-400" />
                      <span className="font-sans text-[8px] font-bold text-stone-200">
                        {selectedDispenserSize === "12L" ? "Free 100 Cawan (80-90 pax)" : "Free 50 Cawan (40-50 pax)"}
                      </span>
                    </div>

                    {/* Physical side metallic latch frames */}
                    <div className="absolute -left-1.5 top-1/4 w-1.5 h-10 bg-gradient-to-b from-stone-500 to-stone-700 rounded-l shadow-md"></div>
                    <div className="absolute -right-1.5 top-1/4 w-1.5 h-10 bg-gradient-to-b from-stone-500 to-stone-700 rounded-r shadow-md"></div>
                  </div>

                  {/* Dispenser tap faucet and spigot structure */}
                  <div className="absolute bottom-6 -right-5 flex flex-col items-start z-20">
                    {/* Horizontal connector pip */}
                    <div className="w-5 h-3.5 bg-gradient-to-r from-stone-800 to-stone-600 border border-stone-900 rounded-sm"></div>
                    
                    {/* Faucet head block with tiny lever switcher lock lever switch */}
                    <div className="w-4 h-6 bg-gradient-to-b from-stone-700 to-stone-900 border border-stone-950 rounded relative">
                      <div className={`w-3 h-1.5 bg-stone-950 rounded-sm absolute -top-1 left-0.5 origin-bottom transition-all duration-300 cursor-pointer ${isPouring ? "rotate-45" : ""}`}></div>
                    </div>
                  </div>

                  {/* LIQUID POURING STREAM ANIMATION */}
                  {isPouring && (
                    <div className="absolute bottom-0 -right-4.5 w-1.5 h-7 z-10 flex flex-col items-center">
                      <div className="w-1 h-32 bg-gradient-to-b from-gold-500 via-orange-700 to-amber-200 animate-pulse shadow-glow shadow-orange-500/50"></div>
                      {/* Splash bubble ring at the bottom cup alignment */}
                      <span className="absolute bottom-0 w-3 h-3 rounded-full bg-gold-400 animate-ping opacity-75"></span>
                    </div>
                  )}

                  {/* VIRTUAL CUP BEING FILLED */}
                  <div className="absolute bottom-0 -right-7.5 w-7 h-8 bg-white/20 border border-white/40 rounded-b-md rounded-t-sm z-20 overflow-hidden flex flex-col justify-end p-0.5 shadow-md">
                    {/* Card logo label inside cup */}
                    <div className="w-full text-center text-[4px] font-serif text-stone-100 scale-75 select-none leading-none mb-1 opacity-40">MOST TEA</div>
                    {/* Poured level */}
                    <div 
                      className="bg-gradient-to-t from-gold-900 to-gold-500 rounded-b-sm transition-all duration-300"
                      style={{ height: isPouring ? "85%" : pouredCount > 0 ? "55%" : "15%" }}
                    >
                      {/* Foam head */}
                      <div className="w-full h-1 bg-yellow-100 opacity-80 filter blur-[0.5px]"></div>
                    </div>
                  </div>

                  {/* Stand Sturdy tripod legs */}
                  <div className="w-full flex justify-between px-3 mt-1.5">
                    <div className="w-3 h-5 bg-gradient-to-b from-stone-800 to-stone-950 rounded-b-lg shadow-md"></div>
                    <div className="w-3 h-3 bg-gradient-to-b from-stone-800 to-stone-950 rounded-b-lg shadow-md"></div>
                    <div className="w-3 h-5 bg-gradient-to-b from-stone-800 to-stone-950 rounded-b-lg shadow-md"></div>
                  </div>
                </div>
              </div>

              {/* SIMULATOR CONTROLS (7 cols md) */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4 text-center md:text-left">
                <div>
                  <span className="text-xxs uppercase tracking-widest font-mono text-gold-400 font-bold bg-gold-950/80 px-2.5 py-1 rounded border border-gold-900">
                    Malaysia&apos;s Favourite Teh Tarik
                  </span>
                  
                  <h4 className="font-serif text-xl font-bold text-white mt-2.5">
                    Rasa Premium Hari-Hari Kenduri!
                  </h4>
                  
                  <p className="text-sm text-stone-300 mt-2 leading-relaxed">
                    Dibuat khas daripada serbuk teh gred terpilih premium dan adunan susu berkrim yang ditarik hingga berbuih padat. 
                    Setiap balang juga dipastikan kekal hangat menggunakan lapisan penebat haba premium, bebas kondensasi!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    onClick={handleDispense}
                    disabled={isPouring}
                    className={`w-full sm:w-auto px-6 py-3 font-serif rounded-xl text-xs font-extrabold tracking-wider transition-all duration-300 flex items-center justify-center gap-2 outline-none ${
                      isPouring
                        ? "bg-transparent border border-orange-500/40 text-orange-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 text-[#0c2317] hover:scale-[1.03] active:scale-95 shadow-lg shadow-gold-500/20 cursor-pointer"
                    }`}
                  >
                    <Coffee className={`w-4.5 h-4.5 ${isPouring ? "animate-spin" : ""}`} />
                    {isPouring ? "SEDANG MENUANG..." : "CUBA SECUNGKIL TEH!"}
                  </button>

                  <div className="text-stone-400 font-mono text-xxs flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-gold-400" />
                    <span>Sebanyak <strong className="text-gold-300 font-bold text-xs">{pouredCount}</strong> cawan dituang pengunjung!</span>
                  </div>
                </div>

                {/* Animated dynamic local praise box */}
                <AnimatePresence mode="wait">
                  {isPouring || activeCompliment ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg bg-[#0a2012]/80 border border-emerald-800/40 min-h-[48px]"
                    >
                      <p className="font-sans text-xs font-medium text-emerald-100 flex items-center gap-2">
                        <span className="text-[#0c2317] bg-gold-400 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-extrabold font-serif">!</span>
                        {isPouring ? "Menyaring aroma berkrim daun teh..." : activeCompliment}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                
              </div>
            </div>
          </div>

          {/* PRICING INFO CARDS (MATCHING THE 12L & 8L BOXES OF FLYER EXCELLENTLY) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 12L JAR CARD */}
            <div className="relative border-2 border-gold-400 rounded-2xl bg-[#091b10] hover:bg-[#0c2315] p-6 transition-all duration-300 shadow-xl group overflow-hidden">
              
              {/* Corner brackets simulating the vintage gold style of the flyer */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-gold-300/40"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-gold-300/40"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-gold-300/40"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-gold-300/40"></div>

              {/* Flyer gold fill effect */}
              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent pointer-events-none group-hover:bg-gold-500/15 duration-500"></div>

              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded bg-[#06120b] border border-gold-400 text-gold-300 text-xxs font-extrabold tracking-widest font-mono">
                  TERLARIS / ROYAL SIZE
                </span>
                <Coffee className="w-7 h-7 text-gold-400 group-hover:scale-110 transition-transform duration-300" />
              </div>

              <div className="mb-4">
                <p className="font-serif text-sm text-stone-400 tracking-wider">TEH TARIK PREMIUM</p>
                <h3 className="font-serif text-2xl font-extrabold text-gold-400 mt-1 uppercase">12 LITER</h3>
                <div className="font-mono text-xs text-stone-300 mt-1 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Free 100 pcs cawan 100ml</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-gold-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
                    <span>Sesuai untuk majlis 80-90 orang</span>
                  </p>
                </div>
              </div>

              <div className="h-[1px] bg-gradient-to-r from-gold-950 via-gold-500/30 to-gold-950 my-4"></div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block font-sans">HARGA SEBALANG</span>
                  <p className="font-serif text-2xl font-extrabold text-gold-200">
                    RM 85<span className="text-xs text-stone-400 font-normal"> / Balang</span>
                  </p>
                </div>

                {/* QUANTITY SETTER */}
                <div className="flex items-center space-x-1 bg-[#06120b] p-1.5 border border-gold-900/60 rounded-xl">
                  <button 
                    onClick={() => setQty12L(Math.max(0, qty12L - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-forest-900 active:scale-90 text-stone-300 hover:text-gold-400 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-gold-200 text-sm">{qty12L}</span>
                  <button 
                    onClick={() => setQty12L(qty12L + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-forest-900 active:scale-90 text-stone-300 hover:text-gold-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 8L JAR CARD */}
            <div className="relative border-2 border-gold-400/60 rounded-2xl bg-[#091b10] hover:bg-[#0c2315] p-6 transition-all duration-300 shadow-xl group overflow-hidden">
              
              {/* Corner brackets simulating the vintage gold style of the flyer */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-gold-300/40"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-gold-300/40"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-gold-300/40"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-gold-300/40"></div>

              {/* Flyer gold fill effect */}
              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent pointer-events-none group-hover:bg-gold-500/15 duration-500"></div>

              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded bg-[#06120b] border border-gold-400/40 text-[#dfb75c] text-xxs font-extrabold tracking-widest font-mono">
                  MEDIUM / PARTY SIZE
                </span>
                <Coffee className="w-7 h-7 text-gold-400 group-hover:scale-110 transition-transform duration-300" />
              </div>

              <div className="mb-4">
                <p className="font-serif text-sm text-stone-400 tracking-wider">TEH TARIK PREMIUM</p>
                <h3 className="font-serif text-2xl font-extrabold text-[#dfb75c] mt-1 uppercase">8 LITER</h3>
                <div className="font-mono text-xs text-stone-300 mt-1 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Free 50 pcs cawan 100ml</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-gold-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
                    <span>Sesuai untuk majlis 40-50 orang</span>
                  </p>
                </div>
              </div>

              <div className="h-[1px] bg-gradient-to-r from-gold-950 via-gold-500/30 to-gold-950 my-4"></div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block font-sans">HARGA SEBALANG</span>
                  <p className="font-serif text-2xl font-extrabold text-gold-200">
                    RM 65<span className="text-xs text-stone-400 font-normal"> / Balang</span>
                  </p>
                </div>

                {/* QUANTITY SETTER */}
                <div className="flex items-center space-x-1 bg-[#06120b] p-1.5 border border-gold-900/60 rounded-xl">
                  <button 
                    onClick={() => setQty8L(Math.max(0, qty8L - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-forest-900 active:scale-90 text-stone-300 hover:text-gold-400 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-gold-200 text-sm">{qty8L}</span>
                  <button 
                    onClick={() => setQty8L(qty8L + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-forest-900 active:scale-90 text-stone-300 hover:text-gold-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>



        </div>

        {/* RIGHT COLUMN (COLSPAN-5): Logistics, Proximity Calculator, Interactive Checkout Estimator & Reservation Form */}
        <div id="reservation-card" className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* ROYAL RESERVATION CARD / DYNAMIC CALCULATOR FRAME */}
          <div className="relative border-2 border-gold-400 rounded-2xl bg-[#0a1f13] shadow-2xl p-6 md:p-8 overflow-hidden z-10">
            
            {/* Top decorative badge */}
            <div className="absolute top-0 right-10 bg-gold-400 text-[#0c2317] uppercase tracking-widest text-[9px] font-extrabold px-3 py-1 rounded-b-md font-mono">
              FORMAL INVOICE
            </div>

            <h3 className="font-serif text-2xl font-bold text-gold-200 flex items-center gap-2 mb-1 uppercase">
              <ShoppingBag className="w-5 h-5 text-gold-400" />
              Sebut Harga &amp; Tempahan
            </h3>
            <p className="text-xs text-stone-400 mb-6">
              Kalkulator kos delivery RM1/KM bermula dari Sg Penchala.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* STEP 1: CHOOSE METHOD */}
              <div>
                <label className="text-xxs uppercase tracking-wider font-bold text-gold-300 block mb-2 font-mono">
                  1. Pilih Kaedah Pengambilan
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType("delivery");
                      // Re-trigger calculation if distance was set to 0 by pickup
                      if (selectedDistance === 0) setSelectedDistance(12);
                    }}
                    className={`p-3 rounded-xl border text-xs font-serif font-bold tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer ${
                      deliveryType === "delivery"
                        ? "border-gold-400 bg-gold-950/60 text-gold-200 shadow-md"
                        : "border-gold-950 bg-[#06120b]/60 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    PENGHANTARAN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType("pickup");
                    }}
                    className={`p-3 rounded-xl border text-xs font-serif font-bold tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer ${
                      deliveryType === "pickup"
                        ? "border-gold-400 bg-gold-950/60 text-gold-200 shadow-md"
                        : "border-gold-950 bg-[#06120b]/60 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    AMBIL SENDIRI
                  </button>
                </div>
              </div>

              {/* STEP 2: LOGISTICS CALCULATOR COVERS KL (Only if delivery selected) */}
              {deliveryType === "delivery" && (
                <div className="space-y-3.5 bg-[#06120b]/55 p-4 rounded-xl border border-gold-950">
                  <div className="flex justify-between items-center">
                    <label className="text-xxs uppercase tracking-wider font-bold text-gold-300 block font-mono">
                      2. Kos Penghantaran (1KM = RM1.00)
                    </label>
                    <span className="text-xxs text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/50">
                      Mula: Sg Penchala
                    </span>
                  </div>

                  {/* Real-time Address Master Controller Monitor */}
                  <div className="bg-[#051108]/90 border border-emerald-900/45 p-3 rounded-xl text-xs leading-relaxed font-sans space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <p className="font-bold text-[9px] uppercase tracking-wider text-gold-400 font-mono">
                        PENGIRA ALAMAT AUTOMATIK (MASTER CONTROLLER):
                      </p>
                    </div>
                    
                    <p className="text-[10px] text-stone-300">
                      Sila taip alamat lengkap anda di bawah. Sistem akan memproses dan melaraskan slider jarak serta harga pengantaran secara real-time!
                    </p>

                    {userAddress.trim().length === 0 ? (
                      <p className="text-[10px] text-stone-500 italic flex items-center gap-1">
                        <span>👉</span> <span>Sila nyatakan alamat di bawah untuk mengaktifkan pengesan jarak automatik.</span>
                      </p>
                    ) : userAddress.trim().length < 5 ? (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1 animate-pulse">
                        <span>✍️</span> <span>Teruskan menaip alamat lengkap...</span>
                      </p>
                    ) : isCalculating ? (
                      <p className="text-[10px] text-gold-300 font-semibold flex items-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5 text-gold-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Menghubungi OSM & SimpleRouting...</span>
                      </p>
                    ) : userAddress.trim().toLowerCase() !== lastCalculatedAddress.toLowerCase() ? (
                      <p className="text-[10px] text-amber-500/95 italic animate-pulse flex items-center gap-1">
                        <span>⏳</span> <span>Menanti anda berhenti menaip untuk mengemas kini jarak...</span>
                      </p>
                    ) : (
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
                        <span>✅ Jarak berjaya dikesan secara automatik:</span>
                        <span className="text-emerald-200 underline font-mono text-xs">{selectedDistance} KM</span>
                      </div>
                    )}
                  </div>

                  {/* Manual Slider adjustment as visual readout/override */}
                  <div className="pt-1.5 pb-1">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-stone-400">Jarak Paparan / Larasan:</span>
                      <span className="text-gold-200 font-extrabold text-sm">{selectedDistance} KM</span>
                    </div>

                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      value={selectedDistance}
                      onChange={(e) => handleDistanceSliderChange(parseInt(e.target.value))}
                      className="w-full accent-gold-400 cursor-pointer h-1.5 bg-stone-800 rounded-lg transition-all"
                    />
                    
                    <div className="flex justify-between text-[9px] text-stone-500 font-mono mt-1 font-bold">
                      <span>Kedai (0km)</span>
                      <span>25km</span>
                      <span>Kawasan Jauh (50km)</span>
                    </div>
                  </div>

                  {/* Distance Presets Grid scroll as fallback check */}
                  <div className="pt-1 border-t border-gold-950/40">
                    <label className="text-[9px] text-stone-500 block mb-1">Semak preset rujukan kawasan popular:</label>
                    <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto pr-1">
                      {locationsPreset.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handlePresetSelect(loc)}
                          className={`text-[9px] px-2 py-0.5 rounded border transition duration-150 cursor-pointer ${
                            activePreset === loc.name
                              ? "bg-gold-500 border-gold-500 text-forest-900 font-bold"
                              : "bg-[#07150e] border-stone-900 text-stone-400 hover:text-stone-200"
                          }`}
                        >
                          {loc.name} ({loc.distance}km)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: RESERVATION BOOKING FIELDS */}
              <div className="space-y-3 pt-2">
                <label className="text-xxs uppercase tracking-wider font-bold text-gold-300 block font-mono">
                  {deliveryType === "delivery" ? "3. Butiran Penerima & Tarikh Majlis" : "2. Butiran Pembeli & Tarikh Majlis"}
                </label>

                {/* Sender Name */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500/60">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Anda"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-[#06120b] border border-gold-900 rounded-xl text-xs placeholder-sans text-white focus:outline-none focus:border-gold-400 font-sans transition"
                  />
                </div>

                {/* Booking DateTime Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500/60">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      type="date"
                      required
                      value={userDate}
                      onChange={(e) => setUserDate(e.target.value)}
                      className={`block w-full pl-9 pr-2 py-2.5 bg-[#06120b] border ${
                        dateAlertMsg ? "border-rose-500" : "border-gold-900 focus:border-gold-400"
                      } rounded-xl text-xs text-white focus:outline-none uppercase font-sans transition`}
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500/60">
                      <Clock className="h-4 w-4" />
                    </div>
                    <input
                      type="time"
                      required
                      value={userTime}
                      onChange={(e) => setUserTime(e.target.value)}
                      className="block w-full pl-9 pr-2 py-2.5 bg-[#06120b] border border-gold-900 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400 font-sans transition"
                    />
                  </div>
                </div>

                {isCheckingDate && (
                  <div className="text-[10px] text-gold-400/90 font-mono flex items-center gap-1.5 animate-pulse pl-1">
                    <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-ping"></span>
                    <span>Menyemak ketersediaan slot tarikh...</span>
                  </div>
                )}

                {dateAlertMsg && (
                  <div className="text-[11px] text-rose-300 font-sans leading-relaxed p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl">
                    {dateAlertMsg}
                  </div>
                )}

                {/* Crimson Rose Blocker Alert Box */}
                <div
                  id="crimson-rose-alert"
                  style={{ display: "none" }}
                  className="p-3 bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs rounded-xl font-sans text-center mt-2"
                >
                  <p id="crimson-rose-text" className="font-semibold leading-relaxed"></p>
                </div>

                {/* Delivery Address (Shown conditionally for Delivery) */}
                {deliveryType === "delivery" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute top-3 left-0 pl-3 pointer-events-none text-gold-500/60">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <textarea
                        required
                        rows={2}
                        placeholder="Alamat Lengkap Penghantaran / Koordinat Waze"
                        value={userAddress}
                        onChange={(e) => {
                          setUserAddress(e.target.value);
                          if (calcSuccessMsg) setCalcSuccessMsg("");
                          if (calcError) setCalcError("");
                        }}
                        className="block w-full pl-9 pr-3 py-2 bg-[#06120b] border border-gold-900 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400 font-sans transition"
                      />
                    </div>

                    {/* OSM calculation button */}
                    <button
                      type="button"
                      onClick={() => handleCalculateOSM()}
                      disabled={isCalculating}
                      className="w-full py-2 px-3 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-500 text-forest-900 text-[10px] font-bold uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-gold-400"
                    >
                      {isCalculating ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-forest-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Sedang Mengira Jarak...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Kira Jarak & Kos Penghantaran Pantas</span>
                        </>
                      )}
                    </button>

                    {/* Feedback Messages */}
                    {calcSuccessMsg && (
                      <p className="text-[10px] text-emerald-400 leading-snug bg-emerald-950/40 p-2 rounded-lg border border-emerald-950/30">
                        {calcSuccessMsg}
                      </p>
                    )}
                    {calcError && (
                      <p className="text-[10px] text-rose-400 leading-snug bg-rose-950/40 p-2 rounded-lg border border-rose-950/30">
                        ⚠️ {calcError}
                      </p>
                    )}
                  </div>
                )}

                {/* Special Request Notes */}
                <div className="relative">
                  <div className="absolute top-3 left-0 pl-3 pointer-events-none text-gold-500/60">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nota Khas (e.g., Kurang manis / extra berkrim)"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-[#06120b] border border-gold-900 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400 font-sans transition"
                  />
                </div>
              </div>

              {/* INVOICE TICKET BREAKDOWN */}
              <div className="pt-4 mt-2 border-t border-dashed border-gold-900/60">
                <p className="text-xxs uppercase tracking-wider font-bold text-gold-300 block mb-2 font-mono">
                  Anggaran Invois Anda
                </p>

                <div className="bg-[#050f09] p-4 rounded-xl border border-gold-950 space-y-2.5 text-xs font-mono">
                  {/* Item 12L */}
                  <div className="flex justify-between text-stone-300">
                    <span>Balang Teh Tarik 12L ({qty12L} unit)</span>
                    <span className="font-bold">RM {(qty12L * price12L).toFixed(2)}</span>
                  </div>

                  {/* Item 8L */}
                  <div className="flex justify-between text-stone-300">
                    <span>Balang Teh Tarik 8L ({qty8L} unit)</span>
                    <span className="font-bold">RM {(qty8L * price8L).toFixed(2)}</span>
                  </div>

                  {/* Delivery Charges line */}
                  <div className="flex justify-between text-stone-300 border-b border-stone-900 pb-2">
                    <span className="flex items-center gap-1">
                      Delivery Charge {deliveryType === "delivery" && `(${selectedDistance}km)`}
                    </span>
                    <span className="font-bold">
                      {deliveryType === "delivery" ? `RM ${deliveryCharge.toFixed(2)}` : "FREE PERCUMA"}
                    </span>
                  </div>

                  {/* Total Servings metric readout */}
                  <div className="flex flex-col text-[10px] text-emerald-400 italic py-1 font-sans border-b border-stone-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Sedia Hidang Kapasiti Teh:</span>
                      <span>{totalLitres} Liter (~{approxCups} Cawan 100ml)</span>
                    </div>
                    {totalFreeCups > 0 && (
                      <div className="flex justify-between text-gold-300 font-semibold not-italic">
                        <span>Percuma Cawan & Rekomendasi:</span>
                        <span>{totalFreeCups} pcs Cawan (Sesuai untuk {minPax}-{maxPax} Pax)</span>
                      </div>
                    )}
                  </div>

                  {/* GRAND TOTAL */}
                  <div className="flex justify-between items-center text-gold-200 pt-2 border-t border-gold-950">
                    <span className="font-serif uppercase tracking-wider text-xs font-bold">Jumlah Pembayaran:</span>
                    <span className="font-serif text-xl font-black">RM {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* WARNING BOX IF NO ITEMS SELECTED */}
              {qty12L === 0 && qty8L === 0 ? (
                <div className="p-3 bg-red-950/30 border border-red-900/60 text-red-200 text-xxs rounded-xl font-medium text-center">
                  ⚠️ Amaran: Sila tambah sekurang-kurangnya 1 Balang (12L atau 8L) pada bahagian menu untuk menghantar tempahan.
                </div>
              ) : null}

              {/* Firebase sync status indicator */}
              {firebaseStatus === "saving" && (
                <div className="p-3 bg-gold-950/40 border border-gold-600/30 text-gold-300 text-xs rounded-xl font-mono text-center flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
                  </span>
                  <span>Menyimpan borang tempahan ke dalam Pangkalan Data Firebase...</span>
                </div>
              )}
              {firebaseStatus === "saved" && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl font-mono text-center space-y-1 animate-pulse">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>RUJUKAN FIRESTORE ({savedOrderId}) DIREKODKAN</span>
                  </div>
                  <p className="text-[11px] text-stone-300 font-sans">Borang tempahan telah selamat disandarkan ke pelayan awan kami.</p>
                </div>
              )}
              {firebaseStatus === "error" && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-mono text-center space-y-1">
                  <p className="font-bold text-rose-400">⚠️ Catatan: Disimpan Tempatan sahaja</p>
                  <p className="text-[11px] text-stone-300 font-sans">Sistem database offline. WhatsApp dibuka sebagai sandaran utama.</p>
                </div>
              )}

              {/* RESERVATION SUBMIT ACTION */}
              <button
                type="submit"
                disabled={qty12L === 0 && qty8L === 0}
                className={`w-full py-4 rounded-xl font-serif text-sm font-extrabold tracking-wider transition-all duration-300 shadow-xl flex items-center justify-center gap-2 outline-none ${
                  qty12L === 0 && qty8L === 0
                    ? "bg-stone-800 text-stone-500 border border-stone-900 cursor-not-allowed"
                    : "bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 text-forest-900 hover:scale-[1.02] shadow-gold-400/20 active:scale-95 cursor-pointer"
                }`}
              >
                {/* Visual feedback loader on submit */}
                {showOrderFeedback ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-forest-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    MENYEDIAKAN FORMAT WHATSAPP...
                  </>
                ) : (
                  <>
                    <Phone className="w-4.5 h-4.5" />
                    TEMPAH VIA WHATSAPP SEKARANG!
                  </>
                )}
              </button>

              {/* Secondary Safety text */}
              <p className="text-[10px] text-center text-stone-500 leading-normal">
                Selepas klik, format tempahan anda akan dijana secara automatik. Sila tunggu seketika semasa tetingkap WhatsApp dibuka semula. Terimah kasih!
              </p>

            </form>
          </div>

          {/* KEY VALUE PROPOSITIONS BENTO BANDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-forest-900/40 border border-gold-400/25 p-4 rounded-xl flex items-start gap-3 shadow-md">
              <div className="p-2 bg-gold-950/60 rounded-lg border border-gold-700/30">
                <ShieldCheck className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h5 className="font-serif text-sm font-bold text-stone-200 uppercase tracking-wide">Higienik &amp; Halal</h5>
                <p className="text-xs text-stone-400 mt-1 font-sans leading-relaxed">
                  Bahan suci premium, diproses rapi, menjamin kesegaran &amp; kesucian kualiti.
                </p>
              </div>
            </div>

            <div className="bg-forest-900/40 border border-gold-400/25 p-4 rounded-xl flex items-start gap-3 shadow-md">
              <div className="p-2 bg-gold-950/60 rounded-lg border border-gold-700/30">
                <Truck className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h5 className="font-serif text-sm font-bold text-stone-200 uppercase tracking-wide">Penghantaran Pantas</h5>
                <p className="text-xs text-stone-400 mt-1 font-sans leading-relaxed">
                  Runner bermula terus dari Sg Penchala, jaminan masa bertolak stabil.
                </p>
              </div>
            </div>

            <div className="bg-forest-900/40 border border-gold-400/25 p-4 rounded-xl flex items-start gap-3 shadow-md">
              <div className="p-2 bg-gold-950/60 rounded-lg border border-gold-700/30">
                <Clock className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h5 className="font-serif text-sm font-bold text-stone-200 uppercase tracking-wide font-medium">Panas Tanpa Letrik</h5>
                <p className="text-xs text-stone-400 mt-1 font-sans leading-relaxed">
                  Dinding penebat insulasi double-wall vakum, sedia hidang bebila masa bermula.
                </p>
              </div>
            </div>

          </div>

          {/* FAQS PANEL SECTIONS */}
          <div className="border border-gold-900/50 rounded-2xl bg-forest-900/30 p-5 md:p-6 shadow-inner relative">
            <h4 className="font-serif text-xl font-bold text-stone-200 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-gold-400" />
              Soalan Lazim (FAQ)
            </h4>
            
            <div className="space-y-3.5">
              {faqs.map((faq, idx) => {
                const isOpen = faqOpenIndex === idx;
                return (
                  <div 
                    key={idx}
                    className="border border-gold-900/30 rounded-xl bg-[#091b10]/40 overflow-hidden transition-all duration-300"
                  >
                    <button
                      onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                      className="w-full px-4 py-3.5 text-left flex justify-between items-center text-sm font-semibold text-stone-200 hover:text-gold-300 transition-colors cursor-pointer"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronDown className={`w-4.5 h-4.5 text-gold-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="px-4 pb-4 pt-1.5 text-xs text-stone-400 leading-relaxed border-t border-gold-950 bg-[#06120b]/30">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIDE INFORMATION FOR THE BRIDE / HOST */}
          <div className="bg-[#07160d]/60 border border-gold-900/30 rounded-2xl p-5 md:p-6 text-xs space-y-4">
            <h4 className="font-serif text-sm font-bold text-gold-300 uppercase tracking-widest flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Siri Perlengkapan Majlis
            </h4>

            <div className="space-y-3 font-sans">
              
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-gold-950 border border-gold-600 flex items-center justify-center text-[10px] font-serif font-black text-gold-300 shrink-0">1</span>
                <p className="text-stone-300 leading-relaxed">
                  <strong className="text-white">Air Panas Maksimum:</strong> Dididihkan menggunakan sukatan susu &amp; teh berkualiti tinggi sejam sebelum runner dihantar.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-gold-950 border border-gold-600 flex items-center justify-center text-[10px] font-serif font-black text-gold-300 shrink-0">2</span>
                <p className="text-stone-300 leading-relaxed">
                  <strong className="text-white">Caj Pengambilan:</strong> Balang harus dipulangkan kembali dalam tempoh 24 jam selepas majlis tamat, atau hubungi wakil dewan kami untuk urusan pickup.
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-gold-900/40 bg-[#040e08]/90 py-10 relative z-10 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <p className="font-serif text-gold-400 font-extrabold tracking-widest uppercase">THE MOST TEA</p>
          <p className="font-sans max-w-md mx-auto leading-relaxed">
            Teh Tarik Premium Berbalang untuk sebarang majlis kahwin, keramaian, jamuan pejabat, hari keluarga &amp; acara korporat seluruh Lembah Klang.
          </p>
          <div className="flex items-center justify-center space-x-4 text-stone-400 text-xs">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gold-500" />
              Sg Penchala, Kuala Lumpur
            </span>
            <span className="text-stone-800">|</span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gold-500" />
              +60 18-266 7703
            </span>
          </div>
          <p className="text-[10px] text-stone-600">
            &copy; {new Date().getFullYear()} The Most Tea. Hak Cipta Terpelihara. Crafted with Premium Hospitality.
          </p>
        </div>
      </footer>

      {/* FLOAT GLOWING WHATSAPP BUTTON (AS EXPLICITLY REQUESTED IN USER PROMPT) */}
      <a
        href="https://wa.me/+60182667703"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none flex items-center justify-center shadow-emerald-500/30"
        title="Hubungi Kami (WhatsApp)"
        id="floating-whatsapp-btn"
      >
        {/* Glowing pulse rings */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25"></span>
        
        {/* Steaming/floating indicator */}
        <span className="absolute -top-10 right-0 bg-[#06120b] border border-gold-400/80 text-gold-300 text-[10px] font-bold font-serif px-2.5 py-1 rounded-lg uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
          Hubungi Kami Sekarang!
        </span>

        {/* WhatsApp Vector/Lucide Phone representation representing premium brand action */}
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>

    </div>
  );
}
