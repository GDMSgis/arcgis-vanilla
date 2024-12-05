export function getBearing(startLat, startLng, destLat, destLng) {
  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    const bearing = Math.atan2(y, x);
    return ((bearing * 180 / Math.PI + 360) % 360).toFixed(2);
}

export function calculateEndPoint(origin, bearing, distance) {
    const R = 6371e3;
    const angular = distance / R;
    const radians = bearing * Math.PI / 180;

    const lat1 = origin.lat * Math.PI / 180;
    const lon1 = origin.lng * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(radians));
    const lon2 = lon1 + Math.atan2(Math.sin(radians) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));

    return { lat: lat2 * 180 / Math.PI, lng: (lon2 * 180 / Math.PI + 540) % 360 - 180 };
}
