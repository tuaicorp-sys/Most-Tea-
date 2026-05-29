async function calculateDistance(address: string) {
  if (!address || typeof address !== "string" || address.trim() === "") {
    throw new Error("Alamat tidak sah atau kosong.");
  }

  const START_LAT = 3.1610;
  const START_LON = 101.6214;

  let searchQuery = address;
  if (!searchQuery.toLowerCase().includes("malaysia")) {
    searchQuery += ", Malaysia";
  }

  const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`;
  
  const geocodeResponse = await fetch(geocodeUrl, {
    headers: {
      "User-Agent": "TheMostTea-Delivery-Calculator/1.0 (tuai.corp@gmail.com)",
      "Accept-Language": "ms, en;q=0.9"
    }
  });

  if (!geocodeResponse.ok) {
    throw new Error(`Gagal menghubungi servis geolokasi (OSM Nominatim). Status: ${geocodeResponse.status}`);
  }

  const geocodeData = (await geocodeResponse.json()) as any[];
  if (!geocodeData || geocodeData.length === 0) {
    throw new Error("Alamat tidak dapat ditemui. Sila pastikan ejaan betul atau letakkan nama kawasan/jalan utama.");
  }

  const matched = geocodeData[0];
  const destLat = parseFloat(matched.lat);
  const destLon = parseFloat(matched.lon);
  const displayName = matched.display_name;

  const routingUrl = `https://router.project-osrm.org/route/v1/driving/${START_LON},${START_LAT};${destLon},${destLat}?overview=false`;

  const routingResponse = await fetch(routingUrl, {
    headers: {
      "User-Agent": "TheMostTea-Delivery-Calculator/1.0 (tuai.corp@gmail.com)"
    }
  });

  if (!routingResponse.ok) {
    throw new Error(`Gagal menghubungi servis navigasi (OSM OSRM). Status: ${routingResponse.status}`);
  }

  const routingData = (await routingResponse.json()) as any;
  if (routingData.code !== "Ok" || !routingData.routes || routingData.routes.length === 0) {
    throw new Error("Gagal mengira laluan dari Sg Penchala ke lokasi anda (tiada laluan jalan raya ditemui).");
  }

  const distanceInMeters = routingData.routes[0].distance;
  const distanceInKm = distanceInMeters / 1000;
  const roundedKm = Math.ceil(distanceInKm);

  return {
    success: true,
    address: address,
    matchedAddress: displayName,
    coordinates: {
      from: { lat: START_LAT, lon: START_LON },
      to: { lat: destLat, lon: destLon }
    },
    distanceKm: roundedKm,
    rawDistanceMeter: distanceInMeters,
    source: "OpenStreetMap (Nominatim & OSRM)"
  };
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const address = req.query.address || (req.body && req.body.address);
  
  if (!address) {
    return res.status(400).json({ success: false, error: "Sila masukkan parameter alamat." });
  }

  try {
    const result = await calculateDistance(address);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Ralat tidak dijangka." });
  }
}
