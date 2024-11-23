import BroadcastTower from './broadcast-tower.svg';
import Placemark from './placemark.svg';

// Utility function to create a custom Leaflet icon
function createCustomIcon(url: string, size: number) {
  return {
    type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
    url: url,
    width: `${size}px`,
    height: `${size}px`,
  };
};

export const rffIcon = createCustomIcon(BroadcastTower, 25);
export const signalIcon = createCustomIcon("", 25);
export const boatIcon = createCustomIcon("", 25);
export const placemarkIcon = createCustomIcon(Placemark, 25);
