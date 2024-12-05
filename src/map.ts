import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import GraphicCircle from "@arcgis/core/geometry/Circle";
import GraphicPoint from "@arcgis/core/geometry/Point";
import Bookmarks from '@arcgis/core/widgets/Bookmarks';
import Expand from '@arcgis/core/widgets/Expand';
import { calculateEndPoint, getBearing } from './utils/mapCalculations';
import { debounce } from 'lodash';
import { placemarkIcon, rffIcon } from "./icons";

interface LatLng {
  lat: number,
  lng: number,
};

interface Point {
  latlng: LatLng,
  icon: {
    type: string,
    url: string,
    width: string,
    height: string,
  },
};

interface Line {
  start: LatLng,
  end: LatLng,
  id: string,
  timestamp: number,
  callerData: any, //FIXME
};

interface Circle {
  center: LatLng,
  radius: number,
  callerData: any, //FIXME
  id: string,
  timestamp: number,
}

interface Marker {
  id: string,
  name: string,
  latlng: LatLng,
};

interface MenuItem {
  name: string,
  action: () => void,
}

let view: null | MapView = null;
let addMarkerMode = false;
let cursorCoordinates: null | HTMLSpanElement = null;
let addMarkerButton: null | HTMLButtonElement = null;
let viewCaliforniaButton: null | HTMLButtonElement = null;
let decayButton5Min: null | HTMLButtonElement = null;
let decayButton10Min: null | HTMLButtonElement = null;
let decayButton15Min: null | HTMLButtonElement = null;
let contextMenuDiv: null | HTMLDivElement = null;

let rffMarkers: Marker[] = [];

let lines: Line[] = [];
let circles: Circle[] = [];
let permanentLines = new Set<string>();
let permanentCircles = new Set<string>();
let lineGraphics: Graphic[] = [];
let circleGraphics: Graphic[] = [];

let processedCallerIds = new Set<string>();

let decayRateGlobal: number = 5 * 60 * 1000; // 5 minutes default

const graphicsLayer = new GraphicsLayer();

// Adding points, lines, polygons, popups, etc...
// https://developers.arcgis.com/javascript/latest/tutorials/add-a-point-line-and-polygon/
function addPoint(point: Point) {
  const pointGraphic = new Graphic({
    geometry: {
      type: "point",
      latitude: point.latlng.lat,
      longitude: point.latlng.lng,
    },
    symbol: point.icon,
  });

  graphicsLayer.add(pointGraphic);
}

function setLines(val: Line[]) {
  lineGraphics.forEach(lg => graphicsLayer.remove(lg));
  lineGraphics = [];

  lines = val;

  // TODO need to clear previous lines
  lines.forEach(line => {
    const polylineGraphic = new Graphic({
      geometry: {
        type: "polyline",
        paths: [
          [line.start.lng, line.start.lat], // Longitude, latitude
          [line.end.lng, line.end.lat] // Longitude, latitude
        ]
      },
      symbol: {
        type: "simple-line",
        color: "red",
        width: 2,
      },
    });
    graphicsLayer.add(polylineGraphic);
    lineGraphics.push(polylineGraphic);
  });
}

function setCircles(val: Circle[]) {
  circleGraphics.forEach(cg => graphicsLayer.remove(cg));
  circleGraphics = [];

  circles = val;

  // TODO need to clear previous circles
  circles.forEach(circle => {
    const circleGraphic = new Graphic({
      geometry: new GraphicCircle({
        center: new GraphicPoint({
          latitude: circle.center.lat,
          longitude: circle.center.lng,
        }),
        radius: circle.radius,
        radiusUnit: 'miles',
        geodesic: true,
        numberOfPoints: 100,
      }),
      symbol: {
        type: "simple-fill",
        style: "none",
        outline: {
          width: 3,
          color: "blue"
        }
      },
    });
    graphicsLayer.add(circleGraphic);
    circleGraphics.push(circleGraphic);
  });
}

function addCircle(center: LatLng, radius: number, callerData = null) {
  setCircles([
    ...circles,
    { center,
      radius,
      id: `circle-${callerData?.id || Date.now()}`,
      timestamp: Date.now(),
      callerData }
  ]);
}

const addLines = debounce((newLines, callerData = null) => {
  setLines([
    ...lines,
    ...newLines.filter((line: Line) => !lines.some(prevLine => prevLine.id === line.id))
      .map((line: Line) => ({ ...line, callerData })) // Include `callerData` in each line
  ]);
}, 300);

function parseBearing(bearingString: string) {
  // Convert "163° 40' 08" to a numeric bearing
  const parts = bearingString.split(/[°' ]+/).filter(Boolean).map(Number);
  return parts[0] + (parts[1] / 60) + (parts[2] / 3600);
};

function createLinesFromCaller(caller) {
  console.log('Processing caller:', caller); // Debug log
  return caller.receivers.map(receiver => {
    const rff = rffMarkers.find(marker => marker.name === receiver.RFF);
    if (rff) {
      const start = {lat: rff.latlng.lat, lng: rff.latlng.lng};
      const numericBearing = parseBearing(receiver.bearing);
      const line = {
        start,
        end: calculateEndPoint(start, numericBearing, 160934.4), // 100 miles in meters
        id: `${caller.id}-${receiver.RFF}`, // Unique ID for each line
        timestamp: Date.now(),
        callerData: caller // Embed `callerData` for association
      };
      console.log('Created line:', line); // Debug log
      return line;
    }
    return null;
  }).filter((line: Line | null) => line !== null); // Remove nulls
};

function setRffMarkers(val: Marker[]) {
  rffMarkers = val;
  // TODO need to clear previous points
  rffMarkers.forEach(mark => {
    addPoint({
      latlng: {
        lat: mark.latlng.lat,
        lng: mark.latlng.lng,
      },
      icon: rffIcon,
    });
  });
}

function setProcessedCallerIds(val = new Set<string>()) {
  processedCallerIds = val;
}

function showContextMenu(x: number = 0, y: number = 0, menu: MenuItem[]) {
  if (contextMenuDiv) {
    contextMenuDiv.style.display = "flex";
    contextMenuDiv.style.left = `${x}px`;
    contextMenuDiv.style.top = `${y}px`;

    contextMenuDiv.innerHTML = menu
      .map((item,i) => `
      <button class="context-menu-button" id="context-menu-button-${i}">
      ${item.name}
      </button>
      `)
      .reduce((x,y) => x + y, "");

    menu.forEach((item,i) => {
      const button = document.getElementById(`context-menu-button-${i}`);
      if (button)
        button.onclick = item.action;
    });
  }
}

function closeContextMenu() {
  if (contextMenuDiv) {
    contextMenuDiv.style.display = "none";
    contextMenuDiv.style.left = "0";
    contextMenuDiv.style.top = "0";
  }
}

function onMapClick(e) {
  closeContextMenu();
  if (addMarkerMode) {
    addPoint({
      latlng: {
        lat: e.mapPoint.latitude,
        lng: e.mapPoint.longitude,
      },
      icon: placemarkIcon,
    });
    addMarkerMode = false;
  }
}

// Modified version of code from
// https://www.geodatasource.com/developers/javascript
function distance(latlng1: LatLng, latlng2: LatLng, unit: "miles" | "nautical-miles" | "kilometers") {
  if ((latlng1.lat === latlng2.lat) && (latlng1.lng === latlng2.lng)) {
    return 0;
  }
  else {
    var radlat1 = Math.PI * latlng1.lat/180;
    var radlat2 = Math.PI * latlng2.lat/180;
    var theta = latlng1.lng-latlng2.lng;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit === "kilometers") { dist = dist * 1.609344 }
    if (unit === "nautical-miles") { dist = dist * 0.8684 }
    return dist;
  }
}

function onMapRightClick(e) {
  view?.hitTest(e).then((res) => {
    const graphicHits = res.results?.filter(
      (hitResult) => hitResult.type === "graphic" && hitResult.graphic.layer === graphicsLayer
    );

    if (graphicHits?.length > 0 && rffMarkers.length > 0) {
      // I cannot figure out how to get the exact graphic which was hit
      // This method is scuffed, but "works"
      // We look for the nearest point to the graphic which was cilcked on
      // This can go wrong in many ways

      const graphicHit = graphicHits[0];

      const rff = rffMarkers.sort((m1,m2) => {
        const dist1 = distance(
          { lat: graphicHit.mapPoint.latitude,
            lng: graphicHit.mapPoint.longitude },
          m1.latlng, "miles");
        const dist2 = distance(
          { lat: graphicHit.mapPoint.latitude,
            lng: graphicHit.mapPoint.longitude },
          m2.latlng, "miles");
        return dist1 < dist2 ? -1 : 1;
      })[0];

      showContextMenu(
        e.native.x,
        e.native.y,
        [
          {
            name: "Inspect",
            action: () => {
              let message = `Name: ${rff.name}\n`
                + `ID: ${rff.id}\n`
                + `Latitude: ${rff.latlng.lat}\n`
                + `Longitude: ${rff.latlng.lng}\n`;
              alert(message);
              closeContextMenu();
            },
          },
          {
            name: "Delete",
            action: () => {
              closeContextMenu();
            },
          },
        ],
      );
      console.log(rff)

      return;
    }
    else {
      showContextMenu(
        e.native.x,
        e.native.y,
        [
          {
            name: "Add marker",
            action: () => {
              addPoint({
                latlng: {
                  lat: e.mapPoint.latitude,
                  lng: e.mapPoint.longitude,
                },
                icon: placemarkIcon,
              });
              closeContextMenu();
            },
          },
        ],
      );
    }
  });
}

function onPointerMove(e) {
  const point = view?.toMap({x: e.x, y: e.y})
  if (cursorCoordinates)
    cursorCoordinates.innerHTML = `${point?.longitude}, ${point?.latitude}`;
}

async function displayRffs() {
  const res = await fetch('http://localhost:8000/caller/RFFs');
  res.json().then(x => {
    setRffMarkers(x.data[0].map(mark => ({
      id: mark.id,
      name: mark.name,
      latlng: {
        lat: mark.lat,
        lng: mark.lng,
      },
    })));
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
      center: [-122, 36],
      zoom: 7,
    });
  });
}

// TODO refactor
export function setupDecayButton5Min(element: HTMLButtonElement) {
  decayButton5Min = element;
  decayButton5Min.addEventListener('click', () => {
    decayRateGlobal = 5 * 60 * 1000;
    if (decayButton5Min)
      decayButton5Min.disabled = true;
    if (decayButton10Min)
      decayButton10Min.disabled = false;
    if (decayButton15Min)
      decayButton15Min.disabled = false;
  })
}

// TODO refactor
export function setupDecayButton10Min(element: HTMLButtonElement) {
  decayButton10Min = element;
  decayButton10Min.addEventListener('click', () => {
    decayRateGlobal = 10 * 60 * 1000;
    if (decayButton5Min)
      decayButton5Min.disabled = false;
    if (decayButton10Min)
      decayButton10Min.disabled = true;
    if (decayButton15Min)
      decayButton15Min.disabled = false;
  })
}

// TODO refactor
export function setupDecayButton15Min(element: HTMLButtonElement) {
  decayButton15Min = element;
  decayButton15Min.addEventListener('click', () => {
    decayRateGlobal = 15 * 60 * 1000;
    if (decayButton5Min)
      decayButton5Min.disabled = false;
    if (decayButton10Min)
      decayButton10Min.disabled = false;
    if (decayButton15Min)
      decayButton15Min.disabled = true;
  })
}

export function setupContextMenuDiv(element: HTMLDivElement) {
  contextMenuDiv = element;
}

export function setupMap(element: HTMLDivElement) {
  const webmap = new Map({
    basemap: "topo-vector"
  });

  view = new MapView({
    container: element,
    map: webmap,
    center: [-122, 36], //Longitude, latitude
    zoom: 7,
  });

  webmap.add(graphicsLayer);

  view.on('pointer-move', onPointerMove);
  view.on('immediate-click', (e) => {
    if (e.button === 0)
      onMapClick(e);
    else if (e.button === 2)
      onMapRightClick(e);
  });

  const bookmarks = new Bookmarks({view});

  const bkExpand = new Expand({
    view,
    content: bookmarks,
    // expanded: true
    expanded: false,
  });

  // Add the widget to the top-right corner of the view
  view.ui.add(bkExpand, "top-right");

  // Initiate rff's from backend
  displayRffs();

  // Show callers
  setInterval(async () => {
    try {
      const response = await fetch('http://localhost:8000/caller/');
      const result = await response.json();

      if (result.data?.length && Array.isArray(result.data[0])) {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // Time 5 minutes ago

        const recentData = result.data[0].filter(caller => {
          const startTime = new Date(caller['start-time']).getTime();
          return startTime >= fiveMinutesAgo && !processedCallerIds.has(caller.id);
        });

        if (recentData.length > 0) {
          setProcessedCallerIds(new Set([...processedCallerIds, ...recentData.map(caller => caller.id)]));

          recentData.forEach(caller => {
            // Attach `callerData` when creating lines
            const linesFromCaller = createLinesFromCaller(caller);
            addLines(linesFromCaller, caller); // Pass `callerData` to lines

            // Attach `callerData` when creating circles
            if (caller.fix) {
              const fixCoords: LatLng = {lat: caller.fix.lat, lng: caller.fix.long};
              // const exists = circles.some(circle =>
              //   circle.center[0] === fixCoords[0] && circle.center[1] === fixCoords[1]
              // );

              // if (!exists) {
              //   addCircle(fixCoords, 200, caller); // Pass `callerData` to circles
              // }
              addCircle(fixCoords, 2, caller); // Pass `callerData` to circles
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  }, 3000);

  // Decay
  setInterval(() => {
    const currentTime = Date.now();

    setLines(
      lines.filter(line =>
        permanentLines.has(line.id) || (currentTime - line.timestamp <= decayRateGlobal)
      )
    );

    setCircles(
      circles.filter(circle =>
        permanentCircles.has(circle.id) || (currentTime - circle.timestamp <= decayRateGlobal)
      )
    );
  }, 3000);
}
