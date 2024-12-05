import './style.css'
import {
  setupAddMarkerButton,
  setupContextMenuDiv,
  setupCursorCoordinates,
  setupDecayButton5Min,
  setupDecayButton10Min,
  setupDecayButton15Min,
  setupMap,
  setupViewCaliforniaButton,
} from './map.ts'

setupCursorCoordinates(document.querySelector<HTMLSpanElement>('#cursor-coordinates')!);
setupAddMarkerButton(document.querySelector<HTMLButtonElement>('#add-marker-button')!)
setupViewCaliforniaButton(document.querySelector<HTMLButtonElement>('#view-california-button')!)

setupDecayButton5Min(document.querySelector<HTMLButtonElement>('#decay-button-5min')!)
setupDecayButton10Min(document.querySelector<HTMLButtonElement>('#decay-button-10min')!)
setupDecayButton15Min(document.querySelector<HTMLButtonElement>('#decay-button-15min')!)

setupContextMenuDiv(document.querySelector<HTMLDivElement>('#context-menu-div')!)

setupMap(document.querySelector<HTMLDivElement>('#arcgis-map')!);
