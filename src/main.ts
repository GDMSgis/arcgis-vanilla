import './style.css'
import {
  setupAddMarkerButton,
  setupCursorCoordinates,
  setupMap,
  setupViewCaliforniaButton,
} from './map.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div style="display: flex; margin: 0px; padding: 0px;">
<div style="width: 15%; height: 100vh; text-align: center; display: flex; flex-direction: column; padding-top: 5rem;">
<button class="sidebar-button" id="view-california-button">View California</button>
<button class="sidebar-button" id="add-marker-button">Add Marker</button>
<button class="sidebar-button" id="aor-button">AOR</button>
<button class="sidebar-button" id="toggle-aor-button">AOR Visibility (On)</button>
</div>
<div style="width: 85%; height: 100vh;" id="arcgis-map"></div>
<div style="position: absolute; bottom: 0; right: 0; background-color: #dddddd; padding: 0.5rem; border-top-left-radius: 0.5rem; font-size: 1.2rem; font-weight: 700;">
<span>ArcGIS</span>
<span id="cursor-coordinates"></span>
</div>
</div>
`

setupCursorCoordinates(document.querySelector<HTMLSpanElement>('#cursor-coordinates')!);
setupAddMarkerButton(document.querySelector<HTMLButtonElement>('#add-marker-button')!)
setupViewCaliforniaButton(document.querySelector<HTMLButtonElement>('#view-california-button')!)
setupMap(document.querySelector<HTMLDivElement>('#arcgis-map')!);
