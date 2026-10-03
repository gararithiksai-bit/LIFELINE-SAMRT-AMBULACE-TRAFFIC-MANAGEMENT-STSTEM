/**
 * LIFELINE — API & Map Service Configuration
 * Manages CARTO Basemap API credentials and raster tile endpoints.
 */

export const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || 'cb1_48ib_1_cc2d373d7d44a052037685a6';

export const BASEMAP_STYLES = {
  dark_all: {
    name: 'CARTO Dark Matter (Night Vision)',
    url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  rastertiles_voyager: {
    name: 'CARTO Voyager (Tactical Navigation)',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  light_all: {
    name: 'CARTO Positron (High Contrast)',
    url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};
