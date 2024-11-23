import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Bookmarks from '@arcgis/core/widgets/Bookmarks';
import Expand from '@arcgis/core/widgets/Expand';
import { placemarkIcon, rffIcon } from "./icons";

interface Point {
  lat: number,
  lng: number,
  icon: {
    type: string,
    url: string,
    width: string,
    height: string,
  },
};

interface Marker {
  id: string,
  name: string,
  lat: number,
  lng: number,
};

let view: null | MapView = null;
let addMarkerMode = false;
let cursorCoordinates: null | HTMLSpanElement = null;
let addMarkerButton: null | HTMLButtonElement = null;
let viewCaliforniaButton: null | HTMLButtonElement = null;
let markers: Marker[] = [];

const graphicsLayer = new GraphicsLayer();

// Adding points, lines, polygons, popups, etc...
// https://developers.arcgis.com/javascript/latest/tutorials/add-a-point-line-and-polygon/
function addPoint(point: Point) {
  const pointGraphic = new Graphic({
    geometry: {
      type: "point",
      latitude: point.lat,
      longitude: point.lng,
    },
    symbol: point.icon,
  });

  graphicsLayer.add(pointGraphic);
}

function onMapClick(e) {
  if (addMarkerMode) {
    addPoint({
      lat: e.mapPoint.latitude,
      lng: e.mapPoint.longitude,
      icon: placemarkIcon,
    });
    addMarkerMode = false;
  }
}

function onPointerMove(e) {
  const point = view?.toMap({x: e.x, y: e.y})
  if (cursorCoordinates)
    cursorCoordinates.innerHTML = `${point?.longitude}, ${point?.latitude}`;
}

async function displayRffs() {
  const res = await fetch('http://localhost:8000/caller/RFFs');
  res.json().then(x => {
    markers = x.data[0];
    markers.forEach(mark => {
      addPoint({
        lat: mark.lat,
        lng: mark.lng,
        icon: rffIcon,
      });
    });
  });
}

export function setupCursorCoordinates(element: HTMLSpanElement) {
  cursorCoordinates = element;
}

export function setupAddMarkerButton(element: HTMLButtonElement) {
  addMarkerButton = element;
  addMarkerButton.addEventListener('click', () => {
    addMarkerMode = true;
  });
}

export function setupViewCaliforniaButton(element: HTMLButtonElement) {
  viewCaliforniaButton = element;
  viewCaliforniaButton.addEventListener('click', () => {
    view?.goTo({
      center: [-120, 36],
      zoom: 7,
    });
  });
}

export function setupMap(element: HTMLDivElement) {
  const webmap = new Map({
    basemap: "topo-vector"
  });

  view = new MapView({
    container: element,
    map: webmap,
    center: [-120, 36], //Longitude, latitude
    zoom: 7,
  });

  webmap.add(graphicsLayer);

  view.on('click', onMapClick);
  view.on('pointer-move', onPointerMove);

  const bookmarks = new Bookmarks({view});

  const bkExpand = new Expand({
    view,
    content: bookmarks,
    // expanded: true
    expanded: false,
  });

  // Add the widget to the top-right corner of the view
  view.ui.add(bkExpand, "top-right");

  // Initiate map from backend
  displayRffs();
}
